"""
ResumeAgent — LLM-first full resume extraction agent.

Uses GPT-4o-mini as the PRIMARY extraction engine with a strict deterministic
system prompt. Extracts ALL structured data from a resume in one shot.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Max characters sent to LLM — ~4000 tokens
_MAX_CHARS = 16_000

# ---------------------------------------------------------------------------
# System prompt (strict, deterministic)
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a strict, deterministic resume parsing engine.
Your ONLY task is to extract explicitly stated structured data from resume text and return valid JSON.

NON-NEGOTIABLE RULES:
- DO NOT hallucinate
- DO NOT infer missing values
- DO NOT guess
- DO NOT rewrite, paraphrase, or summarize
- DO NOT improve wording
- DO NOT merge unrelated data
- DO NOT add new fields
- If data is missing → return "" for strings, [] for arrays
- Preserve original text exactly wherever possible

EXTRACTION PRIORITY:
1. Structured sections (Skills, Experience, Education, etc.)
2. Bullet points
3. Paragraph text

Return ONLY valid JSON. No markdown. No explanation. No extra text outside JSON."""

_USER_PROMPT_TEMPLATE = """Extract ALL information from this resume text.

RESUME TEXT:
---
{resume_text}
---

Return this EXACT JSON structure:
{{
  "contact": {{
    "name": "",
    "email": "",
    "phone": "",
    "linkedin": "",
    "location": ""
  }},
  "summary": "",
  "skills": [],
  "experience": [
    {{
      "title": "",
      "company": "",
      "start_date": "",
      "end_date": "",
      "description": []
    }}
  ],
  "projects": [
    {{
      "name": "",
      "description": [],
      "technologies": []
    }}
  ],
  "education": [
    {{
      "degree": "",
      "field": "",
      "institution": "",
      "year": "",
      "grade": ""
    }}
  ],
  "achievements": [],
  "certifications": [],
  "languages": []
}}

FIELD RULES:

contact:
- Extract exactly as written
- linkedin: extract the URL or handle as-is

skills:
- Extract ONLY: programming languages, frameworks, tools, technologies, platforms
- Return short names (e.g., Python, PyTorch, MySQL)
- Remove duplicates
- Ignore soft skills

experience:
- Extract each role separately
- description: array of bullet point strings, keep EXACTLY as written
- If no bullets → split lines logically into array items
- Do NOT rewrite text

projects:
- Extract ALL projects
- description: array of bullet-style strings
- technologies: extract ONLY if explicitly mentioned, do NOT infer

education:
- degree: exact degree name (e.g., "B.Tech", "MSc", "Diploma")
- field: field of study (e.g., "Computer Science", "Mechanical Engineering")
- institution: exact institution name
- year: graduation year or expected year as string
- grade: CGPA, percentage, or grade if mentioned, else ""

achievements:
- Include: awards, rankings, publications, leadership roles, competitions
- One entry per item, do NOT merge

certifications:
- Include: courses, certificates, badges, online certifications
- One entry per item

languages:
- Spoken/written languages only (NOT programming languages)

FINAL VALIDATION:
- Ensure JSON is valid
- No trailing commas
- No missing keys
- No extra text outside JSON
- No hallucinated values
- Deduplicate repeated entries
- Output ONLY JSON"""


# ---------------------------------------------------------------------------
# Result models
# ---------------------------------------------------------------------------

@dataclass
class AgentContactInfo:
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    location: str = ""


@dataclass
class AgentExperience:
    title: str = ""
    company: str = ""
    start_date: str = ""
    end_date: str = ""
    description: list[str] = field(default_factory=list)  # bullet points


@dataclass
class AgentEducation:
    institution: str = ""
    degree: str = ""
    field: str = ""
    year: str = ""
    grade: str = ""


@dataclass
class AgentProject:
    name: str = ""
    description: list[str] = field(default_factory=list)  # bullet points
    technologies: list[str] = field(default_factory=list)


@dataclass
class AgentResumeResult:
    contact: AgentContactInfo = field(default_factory=AgentContactInfo)
    summary: str = ""
    skills: list[str] = field(default_factory=list)
    experience: list[AgentExperience] = field(default_factory=list)
    education: list[AgentEducation] = field(default_factory=list)
    projects: list[AgentProject] = field(default_factory=list)
    achievements: list[str] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)
    total_experience_years: float = 0.0
    raw_text: str = ""
    extraction_source: str = "agent"


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class ResumeAgent:
    """LLM-first resume extraction agent using strict deterministic prompt."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", timeout: int = 30) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def extract(self, raw_text: str) -> AgentResumeResult:
        """Run full LLM extraction on the resume text."""
        if not raw_text.strip():
            return AgentResumeResult(raw_text=raw_text, extraction_source="rules_only")

        truncated = raw_text[:_MAX_CHARS]
        if len(raw_text) > _MAX_CHARS:
            truncated += "\n[... text truncated for token limit ...]"

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key, timeout=self.timeout)

            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": _USER_PROMPT_TEMPLATE.format(resume_text=truncated)},
                ],
                temperature=0.0,
                max_tokens=2500,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or ""
            result = self._parse_response(content, raw_text)
            result.extraction_source = "agent"
            logger.info(
                "ResumeAgent: %d skills, %d exp, %d edu, %d projects, %d achievements",
                len(result.skills), len(result.experience),
                len(result.education), len(result.projects),
                len(result.achievements),
            )
            return result

        except Exception as exc:
            logger.warning("ResumeAgent failed (%s: %s) — falling back to rules", type(exc).__name__, exc)
            return AgentResumeResult(raw_text=raw_text, extraction_source="rules_only")

    def _parse_response(self, content: str, raw_text: str) -> AgentResumeResult:
        """Parse the LLM JSON response into AgentResumeResult."""
        content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content.strip()).strip()

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                logger.warning("ResumeAgent: could not parse JSON response")
                return AgentResumeResult(raw_text=raw_text, extraction_source="rules_only")
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return AgentResumeResult(raw_text=raw_text, extraction_source="rules_only")

        def _str(v: object) -> str:
            return str(v).strip() if v else ""

        def _list_str(v: object) -> list[str]:
            if not isinstance(v, list):
                return []
            return [str(x).strip() for x in v if x and str(x).strip()]

        # Contact
        c = data.get("contact") or {}
        contact = AgentContactInfo(
            name=_str(c.get("name")),
            email=_str(c.get("email")),
            phone=_str(c.get("phone")),
            linkedin=_str(c.get("linkedin")),
            location=_str(c.get("location")),
        )

        # Experience
        experience: list[AgentExperience] = []
        for e in (data.get("experience") or []):
            if not isinstance(e, dict):
                continue
            # description can be list or string — normalize to list
            desc_raw = e.get("description", [])
            if isinstance(desc_raw, str):
                desc = [desc_raw] if desc_raw.strip() else []
            else:
                desc = _list_str(desc_raw)
            exp = AgentExperience(
                title=_str(e.get("title")),
                company=_str(e.get("company")),
                start_date=_str(e.get("start_date")),
                end_date=_str(e.get("end_date")),
                description=desc,
            )
            if exp.title or exp.company:
                experience.append(exp)

        # Education — deduplicate
        education: list[AgentEducation] = []
        seen_edu: set[str] = set()
        for e in (data.get("education") or []):
            if not isinstance(e, dict):
                continue
            edu = AgentEducation(
                institution=_str(e.get("institution")),
                degree=_str(e.get("degree")),
                field=_str(e.get("field")),
                year=_str(e.get("year")),
                grade=_str(e.get("grade")),
            )
            key = f"{edu.degree[:20]}|{edu.institution[:20]}".lower()
            if (edu.institution or edu.degree) and key not in seen_edu:
                seen_edu.add(key)
                education.append(edu)

        # Projects — deduplicate
        projects: list[AgentProject] = []
        seen_proj: set[str] = set()
        for p in (data.get("projects") or []):
            if not isinstance(p, dict):
                continue
            # description can be list or string
            desc_raw = p.get("description", [])
            if isinstance(desc_raw, str):
                desc = [desc_raw] if desc_raw.strip() else []
            else:
                desc = _list_str(desc_raw)
            proj = AgentProject(
                name=_str(p.get("name")),
                description=desc,
                technologies=_list_str(p.get("technologies")),
            )
            key = proj.name.lower()[:30]
            if proj.name and key not in seen_proj:
                seen_proj.add(key)
                projects.append(proj)

        # Skills — deduplicate case-insensitively
        raw_skills = _list_str(data.get("skills"))
        seen_sk: set[str] = set()
        skills: list[str] = []
        for sk in raw_skills:
            if sk.lower() not in seen_sk:
                seen_sk.add(sk.lower())
                skills.append(sk)

        # Compute total experience years
        total_years = self._compute_experience_years(experience)

        return AgentResumeResult(
            contact=contact,
            summary=_str(data.get("summary")),
            skills=skills,
            experience=experience,
            education=education,
            projects=projects,
            achievements=_list_str(data.get("achievements")),
            certifications=_list_str(data.get("certifications")),
            languages=_list_str(data.get("languages")),
            total_experience_years=total_years,
            raw_text=raw_text,
        )

    def _compute_experience_years(self, experience: list[AgentExperience]) -> float:
        """Estimate total years from experience entries."""
        from datetime import date
        total_days = 0
        today = date.today()
        year_re = re.compile(r'\b(20\d{2}|19\d{2})\b')
        present_re = re.compile(r'\b(present|current|now|ongoing)\b', re.IGNORECASE)

        for e in experience:
            start_years = year_re.findall(e.start_date)
            if not start_years:
                continue
            try:
                start = date(int(start_years[0]), 1, 1)
            except ValueError:
                continue

            if present_re.search(e.end_date) or not e.end_date.strip():
                end = today
            else:
                end_years = year_re.findall(e.end_date)
                if end_years:
                    try:
                        end = date(int(end_years[-1]), 12, 31)
                    except ValueError:
                        end = today
                else:
                    end = today

            if end >= start:
                total_days += (end - start).days

        return round(total_days / 365.25, 1)
