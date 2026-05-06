"""
QuestionEngine — generates clarifying questions targeting identified gaps.

Uses GPT-4o-mini to produce targeted questions from a GapReport and a brief
resume context summary. Falls back to template-based questions when the LLM
is unavailable or times out.

Design reference: Requirements 8.1–8.6, Property 14.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass

from app.models import GapItem, GapReport, GapType, Question, Severity

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants (per design doc)
# ---------------------------------------------------------------------------

MAX_QUESTIONS: int = 10
MIN_QUESTIONS: int = 3
LLM_TIMEOUT_SECONDS: int = 30

# Maximum characters of resume context sent to the LLM
_MAX_CONTEXT_CHARS: int = 2_000


# ---------------------------------------------------------------------------
# Resume context summary (lightweight — not the full resume text)
# ---------------------------------------------------------------------------

@dataclass
class ResumeContext:
    """Minimal resume context passed to the LLM prompt.

    Intentionally excludes the full resume text to minimise token usage
    (Requirement 8.3).
    """
    candidate_name: str = ""
    total_experience_years: float = 0.0
    top_skills: list[str] | None = None
    detected_sections: list[str] | None = None
    summary_snippet: str = ""  # first 300 chars of summary, if present


# ---------------------------------------------------------------------------
# Fallback question templates
# ---------------------------------------------------------------------------

_FALLBACK_TEMPLATES: dict[GapType, dict[Severity, str]] = {
    GapType.MISSING_SKILL: {
        Severity.HIGH: "Can you describe any experience you have with {item}? Even brief exposure counts.",
        Severity.MEDIUM: "Have you worked with {item} in any capacity — personal projects, coursework, or on the job?",
        Severity.LOW: "Are you familiar with {item}? If so, how have you used it?",
    },
    GapType.WEAK_SECTION: {
        Severity.HIGH: "Your {item} section appears thin. Can you share more details about your {item}?",
        Severity.MEDIUM: "Could you elaborate on your {item}? Adding more detail here would strengthen your resume.",
        Severity.LOW: "Is there anything you'd like to add to your {item} section?",
    },
    GapType.EXPERIENCE_GAP: {
        Severity.HIGH: (
            "The role requires more experience than your resume currently shows. "
            "Can you describe any additional relevant experience, freelance work, or projects "
            "that might not be listed?"
        ),
        Severity.MEDIUM: (
            "There appears to be an experience gap. Do you have any contract, part-time, "
            "or project-based work that could help bridge this?"
        ),
        Severity.LOW: (
            "The job description mentions a specific experience range. "
            "Can you clarify your total relevant experience?"
        ),
    },
}

# Generic fallback questions used when the gap list is empty or very small
_GENERIC_FALLBACKS: list[str] = [
    "What are the most significant technical achievements in your career so far?",
    "Are there any skills or tools you use regularly that aren't listed on your resume?",
    "Can you describe a challenging project and the technologies you used to complete it?",
]


# ---------------------------------------------------------------------------
# LLM system / user prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a professional resume coach generating targeted interview-prep questions.
Your task is to produce clarifying questions that help a candidate strengthen their resume.

STRICT RULES:
- Generate between {min_q} and {max_q} questions
- Prioritise high-severity gaps
- Each question must be specific, actionable, and directly tied to a gap
- Do NOT ask generic questions unrelated to the gaps
- Do NOT hallucinate skills or experience not mentioned in the context
- Return ONLY valid JSON — no markdown, no explanation
"""

_USER_PROMPT_TEMPLATE = """Generate targeted resume clarification questions based on the following information.

CANDIDATE CONTEXT:
- Name: {candidate_name}
- Total experience: {experience_years} years
- Top skills: {top_skills}
- Detected resume sections: {detected_sections}
- Summary snippet: {summary_snippet}

IDENTIFIED GAPS (ordered by severity):
{gap_list}

Return this EXACT JSON structure:
{{
  "questions": [
    {{
      "text": "Question text here",
      "target_gap": "The specific gap item this question addresses (or null)"
    }}
  ]
}}

REQUIREMENTS:
- Generate between {min_q} and {max_q} questions
- Prioritise HIGH severity gaps first
- Each question must reference a specific gap where possible
- Questions should be open-ended and encourage detailed answers
- Output ONLY JSON"""


# ---------------------------------------------------------------------------
# QuestionEngine
# ---------------------------------------------------------------------------

class QuestionEngine:
    """Generate clarifying questions from a GapReport using LLM with fallback."""

    MAX_QUESTIONS: int = MAX_QUESTIONS
    MIN_QUESTIONS: int = MIN_QUESTIONS
    LLM_TIMEOUT_SECONDS: int = LLM_TIMEOUT_SECONDS

    def __init__(
        self,
        api_key: str = "",
        model: str = "gpt-4o-mini",
        timeout_seconds: int = LLM_TIMEOUT_SECONDS,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_questions(
        self,
        gap_report: GapReport,
        resume_context: ResumeContext,
    ) -> list[Question]:
        """Generate 3–10 questions targeting the identified gaps.

        Attempts LLM generation first; falls back to template-based questions
        on timeout, API error, or missing API key (Requirement 8.6).
        """
        if not self.api_key or not self.api_key.strip():
            logger.debug("QuestionEngine: no API key — using fallback questions")
            return self._ensure_count(self._fallback_questions(gap_report), gap_report)

        try:
            questions = self._generate_with_llm(gap_report, resume_context)
            questions = self._enforce_count(questions, gap_report)
            logger.info("QuestionEngine: generated %d questions via LLM", len(questions))
            return questions
        except Exception as exc:
            logger.warning(
                "QuestionEngine: LLM failed (%s: %s) — using fallback",
                type(exc).__name__,
                exc,
            )
            return self._ensure_count(self._fallback_questions(gap_report), gap_report)

    # ------------------------------------------------------------------
    # LLM generation
    # ------------------------------------------------------------------

    def _generate_with_llm(
        self,
        gap_report: GapReport,
        resume_context: ResumeContext,
    ) -> list[Question]:
        """Call the LLM and parse the response into Question objects."""
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
        prompt = self._build_prompt(gap_report, resume_context)

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": _SYSTEM_PROMPT.format(
                        min_q=self.MIN_QUESTIONS,
                        max_q=self.MAX_QUESTIONS,
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or ""
        return self._parse_llm_response(content)

    def _parse_llm_response(self, content: str) -> list[Question]:
        """Parse the LLM JSON response into a list of Question objects."""
        content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content.strip()).strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                logger.warning("QuestionEngine: could not parse LLM JSON")
                return []
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return []

        raw_questions = data.get("questions", [])
        if not isinstance(raw_questions, list):
            return []

        questions: list[Question] = []
        for item in raw_questions:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            target_gap = item.get("target_gap")
            if target_gap:
                target_gap = str(target_gap).strip() or None
            questions.append(
                Question(
                    id=f"q_{uuid.uuid4().hex[:8]}",
                    text=text,
                    target_gap=target_gap,
                    is_fallback=False,
                )
            )

        return questions

    # ------------------------------------------------------------------
    # Prompt builder
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        gap_report: GapReport,
        resume_context: ResumeContext,
    ) -> str:
        """Build the LLM user prompt.

        Includes only the gap list and a brief resume context summary —
        NOT the full resume text (Requirement 8.3).
        """
        # Sort gaps: HIGH first, then MEDIUM, then LOW
        severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
        sorted_gaps = sorted(
            gap_report.gaps,
            key=lambda g: severity_order.get(g.severity, 3),
        )

        gap_lines: list[str] = []
        for i, gap in enumerate(sorted_gaps, 1):
            gap_lines.append(
                f"  {i}. [{gap.severity.upper()}] {gap.gap_type.value}: {gap.item}"
            )
        gap_list_str = "\n".join(gap_lines) if gap_lines else "  (no gaps detected)"

        # Truncate summary snippet to keep prompt small
        summary_snippet = (resume_context.summary_snippet or "")[:_MAX_CONTEXT_CHARS]

        return _USER_PROMPT_TEMPLATE.format(
            candidate_name=resume_context.candidate_name or "Candidate",
            experience_years=resume_context.total_experience_years,
            top_skills=", ".join(resume_context.top_skills or []) or "not specified",
            detected_sections=", ".join(resume_context.detected_sections or []) or "not specified",
            summary_snippet=summary_snippet or "not provided",
            gap_list=gap_list_str,
            min_q=self.MIN_QUESTIONS,
            max_q=self.MAX_QUESTIONS,
        )

    # ------------------------------------------------------------------
    # Fallback question generation (no LLM)
    # ------------------------------------------------------------------

    def _fallback_questions(self, gap_report: GapReport) -> list[Question]:
        """Generate template-based questions from gap items without LLM.

        Prioritises HIGH severity gaps, then MEDIUM, then LOW.
        Pads with generic questions if needed to reach MIN_QUESTIONS.
        """
        severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
        sorted_gaps = sorted(
            gap_report.gaps,
            key=lambda g: severity_order.get(g.severity, 3),
        )

        questions: list[Question] = []

        for gap in sorted_gaps:
            if len(questions) >= self.MAX_QUESTIONS:
                break
            text = self._gap_to_question_text(gap)
            if text:
                questions.append(
                    Question(
                        id=f"q_{uuid.uuid4().hex[:8]}",
                        text=text,
                        target_gap=gap.item,
                        is_fallback=True,
                    )
                )

        # Pad with generic questions if below minimum
        for generic_text in _GENERIC_FALLBACKS:
            if len(questions) >= self.MIN_QUESTIONS:
                break
            questions.append(
                Question(
                    id=f"q_{uuid.uuid4().hex[:8]}",
                    text=generic_text,
                    target_gap=None,
                    is_fallback=True,
                )
            )

        return questions

    def _gap_to_question_text(self, gap: GapItem) -> str:
        """Convert a GapItem to a fallback question string using templates."""
        templates = _FALLBACK_TEMPLATES.get(gap.gap_type, {})
        template = templates.get(gap.severity, "")
        if not template:
            # Use the first available template for this gap type
            if templates:
                template = next(iter(templates.values()))
        if not template:
            return ""
        return template.format(item=gap.item)

    # ------------------------------------------------------------------
    # Count enforcement helpers
    # ------------------------------------------------------------------

    def _enforce_count(
        self,
        questions: list[Question],
        gap_report: GapReport,
    ) -> list[Question]:
        """Trim to MAX or pad to MIN using fallback questions."""
        # Trim excess
        questions = questions[: self.MAX_QUESTIONS]
        # Pad if below minimum
        if len(questions) < self.MIN_QUESTIONS:
            fallbacks = self._fallback_questions(gap_report)
            existing_texts = {q.text for q in questions}
            for fb in fallbacks:
                if len(questions) >= self.MIN_QUESTIONS:
                    break
                if fb.text not in existing_texts:
                    questions.append(fb)
                    existing_texts.add(fb.text)
        return questions

    def _ensure_count(
        self,
        questions: list[Question],
        gap_report: GapReport,
    ) -> list[Question]:
        """Ensure the question list is within [MIN_QUESTIONS, MAX_QUESTIONS]."""
        return self._enforce_count(questions, gap_report)
