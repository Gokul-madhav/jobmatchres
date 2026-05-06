"""
SuggestionEngine — generates actionable resume improvement suggestions.

Uses GPT-4o-mini to produce discrete, approvable suggestions for each
identified gap. Falls back gracefully when the LLM is unavailable, returning
a partial result with an llm_error flag (HTTP 206 behaviour).

Design reference: Requirements 9.1–9.6, Properties 16–17.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass

from app.models import GapItem, GapReport, QuestionAnswer, Severity, Suggestion

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants (per design doc)
# ---------------------------------------------------------------------------

LLM_TIMEOUT_SECONDS: int = 60

# Maximum characters of section content sent to the LLM
_MAX_SECTION_CHARS: int = 800  # per section
_MAX_TOTAL_SECTION_CHARS: int = 4_000  # total across all sections


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

@dataclass
class SuggestionResult:
    """Wraps the suggestion list with an optional LLM error indicator.

    When ``llm_error`` is non-empty the caller should return HTTP 206
    (Partial Content) with the suggestions and the error description.
    """
    suggestions: list[Suggestion]
    llm_error: str = ""  # non-empty → LLM failed; partial result returned

    @property
    def is_partial(self) -> bool:
        return bool(self.llm_error)


# ---------------------------------------------------------------------------
# Fallback suggestion templates
# ---------------------------------------------------------------------------

_FALLBACK_TEMPLATES: dict[str, str] = {
    "missing_skill": (
        "Add '{item}' to your Skills section. "
        "If you have any exposure to this technology, include a brief context "
        "(e.g., personal project, coursework, or on-the-job usage)."
    ),
    "weak_section": (
        "Strengthen your {item} section by adding more detail. "
        "Aim for at least 2–3 concrete examples with measurable outcomes."
    ),
    "experience_gap": (
        "Address the experience gap by highlighting any freelance, contract, "
        "or project-based work in your Experience section that demonstrates "
        "relevant skills, even if it was part-time or short-term."
    ),
}


# ---------------------------------------------------------------------------
# LLM prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a professional resume coach generating specific, actionable resume improvement suggestions.

STRICT RULES:
- Each suggestion must be a discrete, approvable change to a specific resume section
- Suggestions must be grounded in the candidate's answers and identified gaps
- Do NOT hallucinate skills or experience not mentioned in the context
- Do NOT generate vague suggestions like "improve your resume"
- Ensure at least one suggestion per HIGH-severity gap
- Return ONLY valid JSON — no markdown, no explanation
"""

_USER_PROMPT_TEMPLATE = """Generate specific resume improvement suggestions based on the following.

IDENTIFIED GAPS (ordered by severity):
{gap_list}

CANDIDATE ANSWERS TO CLARIFYING QUESTIONS:
{answers_section}

CURRENT RESUME SECTIONS (excerpt):
{sections_content}

Return this EXACT JSON structure:
{{
  "suggestions": [
    {{
      "target_section": "Section name (e.g. Skills, Experience, Summary)",
      "suggested_change": "Specific text change or addition to make",
      "rationale": "Why this change improves ATS alignment or addresses the gap",
      "gap_reference": "The gap item this suggestion addresses (or null)"
    }}
  ]
}}

REQUIREMENTS:
- Generate at least one suggestion per HIGH-severity gap
- Each suggestion must have a non-empty target_section, suggested_change, and rationale
- suggested_change should be concrete and actionable (e.g., exact text to add)
- target_section must be one of: Summary, Skills, Experience, Education, Projects
- Output ONLY JSON"""


# ---------------------------------------------------------------------------
# SuggestionEngine
# ---------------------------------------------------------------------------

class SuggestionEngine:
    """Generate resume improvement suggestions using LLM with graceful fallback."""

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

    def generate_suggestions(
        self,
        gap_report: GapReport,
        answers: list[QuestionAnswer],
        resume_sections: dict[str, str],
    ) -> SuggestionResult:
        """Generate improvement suggestions for each identified gap.

        Returns a SuggestionResult. When the LLM is unavailable, returns
        fallback suggestions with ``llm_error`` set (caller should respond
        with HTTP 206 — Requirement 9.4).

        Guarantees at least one suggestion per HIGH-severity gap (Req 9.6).
        """
        if not self.api_key or not self.api_key.strip():
            logger.debug("SuggestionEngine: no API key — using fallback suggestions")
            suggestions = self._fallback_suggestions(gap_report)
            return SuggestionResult(
                suggestions=suggestions,
                llm_error="LLM API key not configured — fallback suggestions returned",
            )

        try:
            suggestions = self._generate_with_llm(gap_report, answers, resume_sections)
            suggestions = self._ensure_high_severity_coverage(suggestions, gap_report)
            logger.info(
                "SuggestionEngine: generated %d suggestions via LLM", len(suggestions)
            )
            return SuggestionResult(suggestions=suggestions)

        except Exception as exc:
            logger.warning(
                "SuggestionEngine: LLM failed (%s: %s) — using fallback",
                type(exc).__name__,
                exc,
            )
            suggestions = self._fallback_suggestions(gap_report)
            return SuggestionResult(
                suggestions=suggestions,
                llm_error=f"{type(exc).__name__}: {exc}",
            )

    # ------------------------------------------------------------------
    # LLM generation
    # ------------------------------------------------------------------

    def _generate_with_llm(
        self,
        gap_report: GapReport,
        answers: list[QuestionAnswer],
        resume_sections: dict[str, str],
    ) -> list[Suggestion]:
        """Call the LLM and parse the response into Suggestion objects."""
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
        prompt = self._build_prompt(gap_report, answers, resume_sections)

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or ""
        return self._parse_llm_response(content)

    def _parse_llm_response(self, content: str) -> list[Suggestion]:
        """Parse the LLM JSON response into a list of Suggestion objects."""
        content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content.strip()).strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                logger.warning("SuggestionEngine: could not parse LLM JSON")
                return []
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return []

        raw_suggestions = data.get("suggestions", [])
        if not isinstance(raw_suggestions, list):
            return []

        suggestions: list[Suggestion] = []
        for item in raw_suggestions:
            if not isinstance(item, dict):
                continue
            target_section = str(item.get("target_section", "")).strip()
            suggested_change = str(item.get("suggested_change", "")).strip()
            rationale = str(item.get("rationale", "")).strip()

            # Skip suggestions missing required fields (Property 17)
            if not target_section or not suggested_change or not rationale:
                continue

            gap_reference = item.get("gap_reference")
            if gap_reference:
                gap_reference = str(gap_reference).strip() or None

            suggestions.append(
                Suggestion(
                    id=f"s_{uuid.uuid4().hex[:8]}",
                    target_section=target_section,
                    suggested_change=suggested_change,
                    rationale=rationale,
                    gap_reference=gap_reference,
                    approved=None,
                )
            )

        return suggestions

    # ------------------------------------------------------------------
    # Prompt builder
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        gap_report: GapReport,
        answers: list[QuestionAnswer],
        resume_sections: dict[str, str],
    ) -> str:
        """Build the LLM user prompt.

        Includes gap list, question answers, and section-level content only —
        NOT the full resume text (Requirement 9.2).
        """
        # Sort gaps: HIGH first
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

        # Format answers
        if answers:
            answer_lines = [
                f"  Q{i+1}: {a.answer_text}" for i, a in enumerate(answers)
            ]
            answers_section = "\n".join(answer_lines)
        else:
            answers_section = "  (no answers provided)"

        # Truncate section content to keep prompt within token budget
        sections_lines: list[str] = []
        total_chars = 0
        for section_name, content in resume_sections.items():
            if total_chars >= _MAX_TOTAL_SECTION_CHARS:
                break
            truncated = content[:_MAX_SECTION_CHARS]
            if len(content) > _MAX_SECTION_CHARS:
                truncated += " [...]"
            sections_lines.append(f"  [{section_name}]\n  {truncated}")
            total_chars += len(truncated)

        sections_content = (
            "\n\n".join(sections_lines) if sections_lines else "  (no section content provided)"
        )

        return _USER_PROMPT_TEMPLATE.format(
            gap_list=gap_list_str,
            answers_section=answers_section,
            sections_content=sections_content,
        )

    # ------------------------------------------------------------------
    # Fallback suggestion generation (no LLM)
    # ------------------------------------------------------------------

    def _fallback_suggestions(self, gap_report: GapReport) -> list[Suggestion]:
        """Generate template-based suggestions from gap items without LLM.

        Ensures at least one suggestion per HIGH-severity gap (Requirement 9.6).
        """
        severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
        sorted_gaps = sorted(
            gap_report.gaps,
            key=lambda g: severity_order.get(g.severity, 3),
        )

        suggestions: list[Suggestion] = []
        for gap in sorted_gaps:
            text = self._gap_to_suggestion(gap)
            if text:
                suggestions.append(
                    Suggestion(
                        id=f"s_{uuid.uuid4().hex[:8]}",
                        target_section=self._gap_to_target_section(gap),
                        suggested_change=text,
                        rationale=self._gap_to_rationale(gap),
                        gap_reference=gap.item,
                        approved=None,
                    )
                )

        return suggestions

    def _gap_to_suggestion(self, gap: GapItem) -> str:
        """Convert a GapItem to a fallback suggested_change string."""
        template = _FALLBACK_TEMPLATES.get(gap.gap_type.value, "")
        if not template:
            return f"Address the gap: {gap.item}"
        return template.format(item=gap.item)

    def _gap_to_target_section(self, gap: GapItem) -> str:
        """Map a GapItem to the most appropriate resume section."""
        from app.models import GapType
        mapping = {
            GapType.MISSING_SKILL: "Skills",
            GapType.WEAK_SECTION: gap.item,  # item IS the section name
            GapType.EXPERIENCE_GAP: "Experience",
        }
        return mapping.get(gap.gap_type, "Skills")

    def _gap_to_rationale(self, gap: GapItem) -> str:
        """Generate a brief rationale for a fallback suggestion."""
        from app.models import GapType
        if gap.gap_type == GapType.MISSING_SKILL:
            return (
                f"'{gap.item}' is listed as a required skill in the job description "
                "but is absent from your resume. Adding it improves ATS keyword matching."
            )
        if gap.gap_type == GapType.WEAK_SECTION:
            return (
                f"Your {gap.item} section has insufficient content. "
                "ATS systems and recruiters expect more detail in this area."
            )
        if gap.gap_type == GapType.EXPERIENCE_GAP:
            return (
                "The job description requires more experience than currently shown. "
                "Highlighting additional relevant work can help bridge this gap."
            )
        return "Addressing this gap will improve your resume's alignment with the job description."

    # ------------------------------------------------------------------
    # Coverage enforcement (Property 16)
    # ------------------------------------------------------------------

    def _ensure_high_severity_coverage(
        self,
        suggestions: list[Suggestion],
        gap_report: GapReport,
    ) -> list[Suggestion]:
        """Ensure at least one suggestion per HIGH-severity gap (Requirement 9.6).

        If the LLM omitted coverage for a high-severity gap, appends a
        fallback suggestion for that gap.
        """
        high_gaps = [g for g in gap_report.gaps if g.severity == Severity.HIGH]
        if not high_gaps:
            return suggestions

        # Build a set of gap items already covered by existing suggestions
        covered: set[str] = set()
        for s in suggestions:
            if s.gap_reference:
                covered.add(s.gap_reference.lower().strip())
            # Also check if the suggested_change mentions the gap item
            for gap in high_gaps:
                if gap.item.lower() in s.suggested_change.lower():
                    covered.add(gap.item.lower().strip())

        # Append fallback suggestions for uncovered high-severity gaps
        extra: list[Suggestion] = []
        for gap in high_gaps:
            if gap.item.lower().strip() not in covered:
                logger.debug(
                    "SuggestionEngine: adding fallback coverage for HIGH gap: %s",
                    gap.item,
                )
                text = self._gap_to_suggestion(gap)
                extra.append(
                    Suggestion(
                        id=f"s_{uuid.uuid4().hex[:8]}",
                        target_section=self._gap_to_target_section(gap),
                        suggested_change=text,
                        rationale=self._gap_to_rationale(gap),
                        gap_reference=gap.item,
                        approved=None,
                    )
                )

        return suggestions + extra
