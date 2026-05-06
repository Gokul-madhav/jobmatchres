"""
JDAgent — LLM-first job description extraction agent.

Uses GPT-4o-mini to extract ALL structured data from a job description:
  - Job title, company, location, job type (remote/hybrid/onsite)
  - Required skills, preferred skills, tools
  - Experience required (years)
  - Responsibilities (bullet points)
  - Qualifications
  - Keywords (top terms)
  - Salary range (if mentioned)
  - Benefits

Pure LLM extraction — no rule-based fallback.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

_MAX_CHARS = 12_000  # ~3000 tokens


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a deterministic job description parsing engine.
Your ONLY task is to extract explicitly stated structured data from job description text and return valid JSON.

HARD RULES (STRICT):
- DO NOT hallucinate
- DO NOT infer missing values
- DO NOT guess meanings
- DO NOT rewrite or summarize text
- DO NOT merge fields
- DO NOT add new fields
- If information is missing: return "" for strings, return [] for arrays
- Preserve original wording exactly"""

_USER_PROMPT = """Extract ALL information from this job description.

JOB DESCRIPTION:
---
{jd_text}
---

Return this EXACT JSON structure:
{{
  "job_title": "",
  "company": "",
  "location": "",
  "job_type": "",
  "required_skills": [],
  "preferred_skills": [],
  "tools": [],
  "experience_required": "",
  "responsibilities": [],
  "qualifications": [],
  "keywords": [],
  "salary_range": "",
  "benefits": []
}}

FIELD DEFINITIONS:

job_title: Exact title as written

company: Extract ONLY if explicitly mentioned

location: Extract exact location text (city/state/country or Remote/Hybrid/Onsite)

job_type: Extract explicit type ONLY (Full-time, Part-time, Contract, Remote, Hybrid, Onsite)

required_skills:
- Include ONLY skills that are explicitly required
- In sections like "Requirements", "Must have", "We're looking for"
- DO NOT include preferred or optional skills

preferred_skills:
- Include ONLY skills marked as preferred / plus / bonus / advantage

tools:
- Extract ONLY: software, platforms, frameworks, cloud services
- Examples: Python, TensorFlow, AWS, Docker, Kubernetes
- DO NOT include general concepts (e.g., "Machine Learning")

experience_required:
- Extract exact phrase
- Examples: "3-5 years", "0-3+ Years", "2 years minimum"

responsibilities:
- Extract ALL responsibility bullet points
- Keep exact wording
- One item per line
- Do NOT merge or rewrite

qualifications:
- Include: degrees, certifications, education requirements

keywords:
- Extract 10-15 important technical/business terms
- Avoid stopwords
- Use exact words from JD

salary_range: Extract ONLY if explicitly mentioned

benefits: Extract only explicitly listed benefits

FINAL VALIDATION (MANDATORY):
- Ensure valid JSON
- No trailing commas
- No missing keys
- No extra text outside JSON
- No hallucinated values
- No duplicate entries

Output ONLY JSON."""


# ---------------------------------------------------------------------------
# Result model
# ---------------------------------------------------------------------------

@dataclass
class JDAgentResult:
    job_title: str = ""
    company: str = ""
    location: str = ""
    job_type: str = ""
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    experience_required: str = ""
    responsibilities: list[str] = field(default_factory=list)
    qualifications: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    salary_range: str = ""
    benefits: list[str] = field(default_factory=list)
    raw_text: str = ""
    extraction_source: str = "agent"


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class JDAgent:
    """LLM-first job description extraction agent."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", timeout: int = 30) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def extract(self, jd_text: str) -> JDAgentResult:
        """Run full LLM extraction on the JD text."""
        if not jd_text.strip():
            return JDAgentResult(raw_text=jd_text, extraction_source="empty")

        if len(jd_text) < 50:
            return JDAgentResult(raw_text=jd_text, extraction_source="too_short")

        truncated = jd_text[:_MAX_CHARS]
        if len(jd_text) > _MAX_CHARS:
            truncated += "\n[... text truncated ...]"

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key, timeout=self.timeout)

            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": _USER_PROMPT.format(jd_text=truncated)},
                ],
                temperature=0.0,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or ""
            result = self._parse_response(content, jd_text)
            result.extraction_source = "agent"
            logger.info(
                "JDAgent: %d req skills, %d pref skills, %d tools, %d responsibilities",
                len(result.required_skills), len(result.preferred_skills),
                len(result.tools), len(result.responsibilities),
            )
            return result

        except Exception as exc:
            logger.warning("JDAgent failed (%s: %s)", type(exc).__name__, exc)
            return JDAgentResult(raw_text=jd_text, extraction_source="error")

    def _parse_response(self, content: str, jd_text: str) -> JDAgentResult:
        """Parse the LLM JSON response."""
        content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content.strip()).strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                return JDAgentResult(raw_text=jd_text, extraction_source="parse_error")
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return JDAgentResult(raw_text=jd_text, extraction_source="parse_error")

        def _str(v: object) -> str:
            return str(v).strip() if v else ""

        def _list(v: object) -> list[str]:
            if not isinstance(v, list):
                return []
            return [str(x).strip() for x in v if x and str(x).strip()]

        # Deduplicate skills
        req_skills = _list(data.get("required_skills"))
        pref_skills = _list(data.get("preferred_skills"))
        tools = _list(data.get("tools"))

        seen_req = {s.lower() for s in req_skills}
        seen_pref = {s.lower() for s in pref_skills if s.lower() not in seen_req}
        seen_tools = {t.lower() for t in tools if t.lower() not in seen_req and t.lower() not in seen_pref}

        return JDAgentResult(
            job_title=_str(data.get("job_title")),
            company=_str(data.get("company")),
            location=_str(data.get("location")),
            job_type=_str(data.get("job_type")),
            required_skills=[s for s in req_skills if s.lower() in seen_req],
            preferred_skills=[s for s in pref_skills if s.lower() in seen_pref],
            tools=[t for t in tools if t.lower() in seen_tools],
            experience_required=_str(data.get("experience_required")),
            responsibilities=_list(data.get("responsibilities")),
            qualifications=_list(data.get("qualifications")),
            keywords=_list(data.get("keywords")),
            salary_range=_str(data.get("salary_range")),
            benefits=_list(data.get("benefits")),
            raw_text=jd_text,
        )
