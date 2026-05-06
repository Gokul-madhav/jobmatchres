"""
LLM Recovery Engine — gap-filling pass for ResumeParser.

Uses GPT-4o-mini to find skills, projects, experience, education, and contact
details that the rule-based parser missed. Intentionally scoped to ONLY recover
missing data — never re-parses or overwrites what the parser already found.

Design principles:
- Called AFTER the rule-based parser has produced its best result
- Prompt includes already-extracted data so the LLM never duplicates it
- Raw text is truncated to ~3 000 tokens to keep cost low
- Returns a LLMRecoveryResult dataclass; caller merges it into ParsedResume
- Thread-safe: uses synchronous OpenAI client (caller runs in thread pool)
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Maximum characters of resume text sent to the LLM (~3 000 tokens ≈ 12 000 chars)
_MAX_TEXT_CHARS = 12_000

# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

@dataclass
class LLMRecoveryResult:
    missing_skills: list[str] = field(default_factory=list)
    missing_projects: list[str] = field(default_factory=list)
    missing_experience: list[str] = field(default_factory=list)
    missing_education: list[str] = field(default_factory=list)
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    contact_linkedin: str = ""
    contact_location: str = ""
    summary: str = ""


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(
    raw_text: str,
    existing_skills: list[str],
    existing_projects: list[str],
    existing_experience_titles: list[str],
    existing_education: list[str],
    contact_name: str,
    contact_email: str,
) -> str:
    truncated = raw_text[:_MAX_TEXT_CHARS]
    if len(raw_text) > _MAX_TEXT_CHARS:
        truncated += "\n[... text truncated ...]"

    return f"""You are a **strict resume recovery extraction assistant**.

A rule-based parser has already extracted structured data from a resume.
Your ONLY task is to **identify and extract information that was MISSED**.

---

# STRICT RULES

* DO NOT hallucinate
* DO NOT infer or assume anything
* DO NOT rewrite, summarize, or improve text
* DO NOT repeat any already extracted data
* ONLY extract information explicitly present in the resume
* If information is not clearly present → return empty

---

# ALREADY EXTRACTED DATA

* Name: {contact_name or "not found"}
* Email: {contact_email or "not found"}
* Skills: {", ".join(existing_skills) if existing_skills else "none"}
* Projects: {", ".join(existing_projects) if existing_projects else "none"}
* Experience titles: {", ".join(existing_experience_titles) if existing_experience_titles else "none"}
* Education: {", ".join(existing_education) if existing_education else "none"}

---

#  RESUME TEXT

---

## {truncated}

---

#  EXTRACTION TASKS

1. Extract **missing technical skills**:

   * Programming languages, tools, frameworks, platforms
   * Return short names only (e.g., "Python", "AWS", "Docker")
   * Ignore soft skills
   * DO NOT repeat existing skills

---

2. Extract **missing project names**:

   * Include projects even if they appear inside experience or paragraphs
   * Return project names only (no descriptions)
   * DO NOT repeat existing projects

---

3. Extract **missing experience entries**:

   * Format: "Title at Company (start_year - end_year)" OR "Title at Company (year)"
   * If company or dates are missing, include what is available
   * DO NOT repeat existing experience titles

---

4. Extract **missing education entries**:

   * Format: "Degree in Field at Institution (year)"
   * DO NOT repeat existing education entries

---

5. Extract **missing contact information** ONLY if currently "not found":

   * contact_name
   * contact_email
   * contact_phone
   * contact_linkedin
   * contact_location

---

6. Extract a **professional summary** ONLY if missing:

   * 2–3 sentences
   * Must be directly taken from resume text (no rewriting)

---

#  EXTRACTION GUIDELINES

* Prefer explicit lines over inferred information
* Extract skills from:

  * project descriptions
  * experience descriptions
* Avoid duplicates
* Preserve original wording

---

#  OUTPUT FORMAT (STRICT)

Return ONLY valid JSON (no markdown, no explanation):

{{
"missing_skills": [],
"missing_projects": [],
"missing_experience": [],
"missing_education": [],
"contact_name": "",
"contact_email": "",
"contact_phone": "",
"contact_linkedin": "",
"contact_location": "",
"summary": ""
}}
"""


# ---------------------------------------------------------------------------
# Main recovery function
# ---------------------------------------------------------------------------

def run_llm_recovery(
    raw_text: str,
    existing_skills: list[str],
    existing_projects: list[str],
    existing_experience_titles: list[str],
    api_key: str,
    model: str = "gpt-4o-mini",
    timeout_seconds: int = 20,
    existing_education: list[str] | None = None,
    contact_name: str = "",
    contact_email: str = "",
) -> LLMRecoveryResult:
    """Call GPT-4o-mini to find what the parser missed.

    Returns an empty LLMRecoveryResult on any error (graceful degradation).
    """
    if not api_key or not api_key.strip():
        logger.debug("LLM recovery skipped — no API key configured")
        return LLMRecoveryResult()

    if not raw_text.strip():
        return LLMRecoveryResult()

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=timeout_seconds)

        prompt = _build_prompt(
            raw_text=raw_text,
            existing_skills=existing_skills,
            existing_projects=existing_projects,
            existing_experience_titles=existing_experience_titles,
            existing_education=existing_education or [],
            contact_name=contact_name,
            contact_email=contact_email,
        )

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=1000,
        )

        content = response.choices[0].message.content or ""
        result = _parse_llm_response(content)
        logger.info(
            "LLM recovery: +%d skills, +%d projects, +%d experience, +%d education",
            len(result.missing_skills), len(result.missing_projects),
            len(result.missing_experience), len(result.missing_education),
        )
        return result

    except Exception as exc:
        logger.warning("LLM recovery failed (%s: %s) — using parser-only result", type(exc).__name__, exc)
        return LLMRecoveryResult()


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_llm_response(content: str) -> LLMRecoveryResult:
    """Parse the JSON response from the LLM into a LLMRecoveryResult."""
    content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
    content = re.sub(r"\s*```$", "", content.strip()).strip()

    if not content:
        return LLMRecoveryResult()

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if not m:
            logger.warning("LLM recovery: could not parse JSON: %s", content[:200])
            return LLMRecoveryResult()
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return LLMRecoveryResult()

    def _clean_list(raw: object) -> list[str]:
        if not isinstance(raw, list):
            return []
        return [str(item).strip() for item in raw if item and str(item).strip()]

    def _clean_str(raw: object) -> str:
        if not raw:
            return ""
        return str(raw).strip()

    return LLMRecoveryResult(
        missing_skills=_clean_list(data.get("missing_skills")),
        missing_projects=_clean_list(data.get("missing_projects")),
        missing_experience=_clean_list(data.get("missing_experience")),
        missing_education=_clean_list(data.get("missing_education")),
        contact_name=_clean_str(data.get("contact_name")),
        contact_email=_clean_str(data.get("contact_email")),
        contact_phone=_clean_str(data.get("contact_phone")),
        contact_linkedin=_clean_str(data.get("contact_linkedin")),
        contact_location=_clean_str(data.get("contact_location")),
        summary=_clean_str(data.get("summary")),
    )
