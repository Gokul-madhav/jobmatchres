"""
JDParser — hybrid rule-based + LLM job description parser.

Architecture:
  1. Rule-based pass  → fast, deterministic, zero cost
  2. Confidence score → decides whether LLM is needed
  3. LLM fallback     → GPT-4o-mini, only when confidence < 0.6 or skills < 3
  4. Merge            → combine rule + LLM results, deduplicate

Public API (unchanged):
  JDParser().parse(jd_text) -> ParsedJD

Internal structured result (used for merging before building ParsedJD):
  _JDData dataclass with skills, keywords, experience, responsibilities, tools
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

from app.components.resume_parser import SKILL_ALIASES, KNOWN_SKILLS
from app.errors import AppError, ErrorCode
from app.models import ParsedJD

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_JD_MIN_LENGTH = 50
_TOP_N_KEYWORDS = 20
_LLM_CONFIDENCE_THRESHOLD = 0.6
_LLM_MIN_SKILLS_THRESHOLD = 3
_LLM_MAX_INPUT_CHARS = 6_000   # ~1 500 tokens — keeps cost low
_LLM_MAX_OUTPUT_TOKENS = 500

# ---------------------------------------------------------------------------
# Skill dictionary — union of KNOWN_SKILLS + domain-specific additions
# ---------------------------------------------------------------------------

_SKILL_DICTIONARY: frozenset[str] = KNOWN_SKILLS | frozenset({
    # Additional domain skills not in KNOWN_SKILLS
    "SQL", "NoSQL", "REST", "GraphQL", "gRPC", "Microservices", "CI/CD",
    "Agile", "Scrum", "Kanban", "DevOps", "Machine Learning", "Deep Learning",
    "Natural Language Processing", "Computer Vision", "Data Science",
    "Data Engineering", "Data Analysis", "Business Intelligence",
    "Cloud Computing", "Serverless", "Event-Driven Architecture",
    "Test-Driven Development", "Object-Oriented Programming",
    "Functional Programming", "System Design", "API Design",
    "TypeScript", "JavaScript", "Python", "Java", "Go", "Rust", "C++", "C#",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB",
    "React", "Angular", "Vue", "Node.js", "Django", "Flask", "FastAPI",
    "Spring Boot", "Express", "Next.js", "Svelte",
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
    "Tableau", "Power BI", "Excel", "Spark", "Hadoop", "Kafka",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Jenkins", "GitHub Actions", "CircleCI", "Helm",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite",
    "Oracle", "Cassandra", "DynamoDB", "Neo4j",
    "Git", "Linux", "Bash", "Jira", "Confluence", "Figma", "Postman",
    "Simulink", "Arduino", "MATLAB", "Power BI",
})

# Tools subset — used for dedicated tools extraction
_TOOLS_DICTIONARY: frozenset[str] = frozenset({
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Jenkins", "GitHub", "GitLab", "GitHub Actions", "CircleCI", "Helm",
    "Jira", "Confluence", "Figma", "Postman", "Swagger",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Oracle", "Cassandra", "DynamoDB", "Neo4j", "SQLite",
    "Tableau", "Power BI", "Excel", "Spark", "Hadoop", "Kafka",
    "Git", "Linux", "Bash", "PowerShell", "Nginx", "Apache",
    "Prometheus", "Grafana", "Datadog", "Splunk", "ELK",
    "Simulink", "MATLAB", "Arduino", "LabVIEW", "AutoCAD",
})

# Responsibility trigger words
_RESP_TRIGGERS = re.compile(
    r"\b(responsible|develop|build|design|implement|create|maintain|"
    r"manage|lead|architect|deploy|optimize|collaborate|deliver|"
    r"support|ensure|establish|drive|own|oversee)\b",
    re.IGNORECASE,
)

# Preferred / required signal words
_PREFERRED_SIGNALS = re.compile(
    r"\b(preferred|nice[\s\-]to[\s\-]have|bonus|plus|desirable|"
    r"advantageous|ideally|optional|familiarity with|exposure to)\b",
    re.IGNORECASE,
)

# Experience range patterns
_EXP_RANGE_RE = re.compile(
    r"(\d+)\s*(?:[-–to]+\s*(\d+))?\s*\+?\s*years?",
    re.IGNORECASE,
)
_EXP_MIN_RE = re.compile(
    r"(?:minimum|at\s+least|minimum\s+of)\s+(\d+)\s*\+?\s*years?",
    re.IGNORECASE,
)

# English stopwords for keyword extraction
_STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "this", "that", "these", "those", "we", "you", "our", "your", "their",
    "its", "it", "he", "she", "they", "who", "which", "what", "how",
    "not", "no", "nor", "so", "yet", "both", "either", "neither",
    "each", "all", "any", "some", "such", "more", "most", "other",
    "than", "then", "when", "where", "while", "if", "unless", "until",
    "about", "above", "after", "before", "between", "into", "through",
    "during", "including", "without", "across", "following", "plus",
    "also", "well", "just", "very", "highly", "strong", "good",
    "excellent", "experience", "knowledge", "ability", "skills", "skill",
    "work", "working", "team", "role", "position", "job", "candidate",
    "required", "preferred", "must", "will", "able", "new", "use",
})


# ---------------------------------------------------------------------------
# Internal data container
# ---------------------------------------------------------------------------

@dataclass
class _JDData:
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    experience_required: str = ""
    responsibilities: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    min_experience_years: Optional[int] = None
    max_experience_years: Optional[int] = None


# ---------------------------------------------------------------------------
# LLM provider wrapper (swappable)
# ---------------------------------------------------------------------------

class _LLMProvider:
    """Thin wrapper around the LLM API. Swap provider by subclassing."""

    def __init__(self, api_key: str, model: str, timeout: int) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def complete(self, prompt: str) -> str:
        """Call the LLM and return the raw text response."""
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=_LLM_MAX_OUTPUT_TOKENS,
        )
        return response.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# JDParser
# ---------------------------------------------------------------------------

class JDParser:
    """Hybrid rule-based + LLM job description parser."""

    # ------------------------------------------------------------------
    # Public API (signature unchanged)
    # ------------------------------------------------------------------

    def parse(self, jd_text: str) -> ParsedJD:
        """Parse a job description and return a ParsedJD.

        Raises AppError(JD_TOO_SHORT) when jd_text has fewer than 50 chars.
        """
        if len(jd_text.strip()) < _JD_MIN_LENGTH:
            raise AppError(ErrorCode.JD_TOO_SHORT)

        # Step 1: rule-based pass
        rule_data = self._parse_rule_based(jd_text)

        # Step 2: confidence scoring
        confidence = self._confidence_score(rule_data)
        all_skills = rule_data.required_skills + rule_data.preferred_skills
        needs_llm = (
            confidence < _LLM_CONFIDENCE_THRESHOLD
            or len(all_skills) < _LLM_MIN_SKILLS_THRESHOLD
        )

        # Step 3: LLM fallback (only when needed)
        if needs_llm:
            llm_data = self._parse_llm(jd_text)
            if llm_data:
                rule_data = self._merge(rule_data, llm_data)
                logger.debug(
                    "JD parser: LLM fallback used (confidence=%.2f, skills=%d)",
                    confidence, len(all_skills),
                )

        # Build ParsedJD from merged data
        return ParsedJD(
            required_skills=rule_data.required_skills,
            preferred_skills=rule_data.preferred_skills,
            keywords=rule_data.keywords,
            raw_text=jd_text,
            min_experience_years=rule_data.min_experience_years,
            max_experience_years=rule_data.max_experience_years,
        )

    # ------------------------------------------------------------------
    # Step 1: Rule-based parsing
    # ------------------------------------------------------------------

    def _parse_rule_based(self, jd_text: str) -> _JDData:
        required_skills, preferred_skills = self._extract_skills(jd_text)
        keywords = self._extract_keywords(jd_text)
        min_exp, max_exp = self._extract_experience_range(jd_text)
        responsibilities = self._extract_responsibilities(jd_text)
        tools = self._extract_tools(jd_text)

        exp_str = ""
        if min_exp is not None and max_exp is not None:
            exp_str = f"{min_exp}-{max_exp} years"
        elif min_exp is not None:
            exp_str = f"{min_exp}+ years"
        elif max_exp is not None:
            exp_str = f"up to {max_exp} years"

        return _JDData(
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            keywords=keywords,
            experience_required=exp_str,
            responsibilities=responsibilities,
            tools=tools,
            min_experience_years=min_exp,
            max_experience_years=max_exp,
        )

    def _extract_skills(self, text: str) -> tuple[list[str], list[str]]:
        """Return (required_skills, preferred_skills) using skill dictionary + TF-IDF."""
        text_lower = text.lower()
        lines = [l.strip() for l in re.split(r"[\n.;]", text) if l.strip()]

        # Dictionary-based pass: check every known skill against full text
        dict_skills: set[str] = set()
        for skill in _SKILL_DICTIONARY:
            if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
                dict_skills.add(skill)

        # TF-IDF candidates for additional token-level extraction
        tfidf_candidates = self._tfidf_skill_candidates(text)

        required: list[str] = []
        preferred: list[str] = []
        seen_required: set[str] = set()
        seen_preferred: set[str] = set()

        # Classify dictionary skills by line context
        for line in lines:
            is_preferred = bool(_PREFERRED_SIGNALS.search(line))
            line_lower = line.lower()

            # Dictionary skills found in this line
            for skill in dict_skills:
                if re.search(r'\b' + re.escape(skill.lower()) + r'\b', line_lower):
                    norm = self._normalize_skill(skill)
                    key = norm.lower()
                    if is_preferred:
                        if key not in seen_preferred and key not in seen_required:
                            seen_preferred.add(key)
                            preferred.append(norm)
                    else:
                        if key not in seen_required:
                            seen_required.add(key)
                            required.append(norm)

            # TF-IDF tokens found in this line (catches non-dictionary skills)
            for skill in self._skills_in_line(line, tfidf_candidates):
                norm = self._normalize_skill(skill)
                key = norm.lower()
                if is_preferred:
                    if key not in seen_preferred and key not in seen_required:
                        seen_preferred.add(key)
                        preferred.append(norm)
                else:
                    if key not in seen_required:
                        seen_required.add(key)
                        required.append(norm)

        # Fallback: add any dictionary skills not yet classified (assume required)
        for skill in dict_skills:
            norm = self._normalize_skill(skill)
            key = norm.lower()
            if key not in seen_required and key not in seen_preferred:
                seen_required.add(key)
                required.append(norm)

        # Last resort: KeyBERT if still empty
        if not required and not preferred:
            required = self._keybert_skills(text)

        return required, preferred

    def _extract_tools(self, text: str) -> list[str]:
        """Extract tools/platforms from the JD using the tools dictionary."""
        text_lower = text.lower()
        found: list[str] = []
        seen: set[str] = set()
        for tool in _TOOLS_DICTIONARY:
            if re.search(r'\b' + re.escape(tool.lower()) + r'\b', text_lower):
                key = tool.lower()
                if key not in seen:
                    seen.add(key)
                    found.append(tool)
        return sorted(found)

    def _extract_responsibilities(self, text: str) -> list[str]:
        """Extract up to 5 responsibility sentences from the JD."""
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+|\n', text)
        responsibilities: list[str] = []
        for sent in sentences:
            sent = sent.strip().strip("•·▪▸-*").strip()
            if not sent or len(sent) < 15:
                continue
            if _RESP_TRIGGERS.search(sent):
                # Clean up and truncate long sentences
                clean = re.sub(r'\s+', ' ', sent)
                if len(clean) > 150:
                    clean = clean[:147] + "..."
                responsibilities.append(clean)
            if len(responsibilities) >= 5:
                break
        return responsibilities

    def _tfidf_skill_candidates(self, text: str) -> set[str]:
        """Use TF-IDF to surface high-weight tokens as skill candidates."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(
                analyzer="word",
                ngram_range=(1, 3),
                max_features=200,
                stop_words="english",
                token_pattern=r"(?u)\b[A-Za-z][A-Za-z0-9+#.\-]{1,30}\b",
            )
            vectorizer.fit([text])
            return set(vectorizer.get_feature_names_out())
        except Exception:
            return set()

    def _skills_in_line(self, line: str, candidates: set[str]) -> list[str]:
        """Return skill tokens from a line that appear in the candidate set."""
        tokens = re.findall(r"\b[A-Za-z][A-Za-z0-9+#.\-]{1,30}\b", line)
        found: list[str] = []
        seen: set[str] = set()
        candidates_lower = {c.lower() for c in candidates}
        for token in tokens:
            lower = token.lower()
            if lower in candidates_lower and lower not in seen:
                seen.add(lower)
                found.append(token)
        return found

    def _keybert_skills(self, text: str) -> list[str]:
        """Extract skill-like keyphrases using KeyBERT as last-resort fallback."""
        try:
            from keybert import KeyBERT
            kw_model = KeyBERT()
            keywords = kw_model.extract_keywords(
                text, keyphrase_ngram_range=(1, 2), stop_words="english", top_n=15,
            )
            return [self._normalize_skill(kw) for kw, _ in keywords]
        except Exception:
            return []

    def _extract_keywords(self, text: str) -> list[str]:
        """Return top-N TF-IDF keywords formatted as 'keyword:weight'."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            import numpy as np
            vectorizer = TfidfVectorizer(
                analyzer="word",
                ngram_range=(1, 2),
                max_features=500,
                stop_words="english",
                token_pattern=r"(?u)\b[A-Za-z][A-Za-z0-9+#.\-]{1,30}\b",
            )
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            top_indices = np.argsort(scores)[::-1][:_TOP_N_KEYWORDS]
            keywords: list[str] = []
            for idx in top_indices:
                if scores[idx] > 0:
                    keywords.append(f"{feature_names[idx]}:{round(float(scores[idx]), 4)}")
            return keywords
        except Exception:
            return self._extract_keywords_fallback(text)

    def _extract_keywords_fallback(self, text: str) -> list[str]:
        """Simple word-frequency fallback when sklearn is unavailable."""
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.\-]{2,30}\b', text.lower())
        freq: dict[str, int] = {}
        for w in words:
            if w not in _STOPWORDS:
                freq[w] = freq.get(w, 0) + 1
        top = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:_TOP_N_KEYWORDS]
        total = sum(c for _, c in top) or 1
        return [f"{w}:{round(c/total, 4)}" for w, c in top]

    def _extract_experience_range(self, text: str) -> tuple[Optional[int], Optional[int]]:
        """Extract min/max years of experience from JD text."""
        min_match = _EXP_MIN_RE.search(text)
        if min_match:
            return int(min_match.group(1)), None
        matches = list(_EXP_RANGE_RE.finditer(text))
        if not matches:
            return None, None
        m = matches[0]
        return int(m.group(1)), int(m.group(2)) if m.group(2) else None

    # ------------------------------------------------------------------
    # Step 2: Confidence scoring
    # ------------------------------------------------------------------

    def _confidence_score(self, data: _JDData) -> float:
        """Score how complete the rule-based extraction is (0.0 – 1.0)."""
        score = 0.0
        all_skills = data.required_skills + data.preferred_skills
        if len(all_skills) >= 3:
            score += 0.30
        if data.experience_required:
            score += 0.20
        if len(data.responsibilities) >= 2:
            score += 0.20
        if len(data.keywords) >= 5:
            score += 0.20
        if len(data.tools) >= 2:
            score += 0.10
        return round(score, 2)

    # ------------------------------------------------------------------
    # Step 3: LLM fallback
    # ------------------------------------------------------------------

    def _parse_llm(self, jd_text: str) -> Optional[_JDData]:
        """Call GPT-4o-mini to extract structured data. Returns None on failure."""
        try:
            from app.config import settings
            api_key = settings.openai_api_key or settings.llm_api_key
            if not api_key or not api_key.strip():
                logger.debug("JD LLM fallback skipped — no API key")
                return None

            provider = _LLMProvider(
                api_key=api_key,
                model=settings.parser_recovery_model,
                timeout=settings.parser_recovery_timeout_seconds,
            )
            prompt = self._build_llm_prompt(jd_text)
            raw = provider.complete(prompt)
            return self._parse_llm_response(raw)
        except Exception as exc:
            logger.warning("JD LLM fallback failed (%s: %s)", type(exc).__name__, exc)
            return None

    def _build_llm_prompt(self, jd_text: str) -> str:
        """Build the LLM prompt with truncated JD text."""
        truncated = jd_text[:_LLM_MAX_INPUT_CHARS]
        if len(jd_text) > _LLM_MAX_INPUT_CHARS:
            truncated += "\n[... text truncated ...]"

        return f"""You are an expert job description analyzer.
Extract structured data from the job description.
Return STRICT JSON (no markdown, no explanation):
{{
  "skills": [],
  "keywords": [],
  "experience_required": "",
  "responsibilities": [],
  "tools": []
}}

Rules:
- Do NOT hallucinate
- Only extract from the given text
- Do NOT repeat duplicates
- Keep skills concise (e.g., Python, React, AWS)
- Responsibilities must be short bullet-like sentences (max 5)
- keywords: top 10 meaningful terms from the JD
- tools: specific software/platform names only
- experience_required: e.g. "3-5 years" or "2+ years" or ""

Job Description:
{truncated}"""

    def _parse_llm_response(self, content: str) -> Optional[_JDData]:
        """Parse the LLM JSON response into a _JDData object."""
        # Strip markdown fences
        content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content.strip()).strip()

        if not content:
            return None

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                return None
            try:
                data = json.loads(m.group(0))
            except json.JSONDecodeError:
                return None

        def _clean(raw: object) -> list[str]:
            if not isinstance(raw, list):
                return []
            return [str(x).strip() for x in raw if x and str(x).strip()]

        exp_str = str(data.get("experience_required", "")).strip()
        # Parse experience string back to min/max
        min_exp, max_exp = self._extract_experience_range(exp_str) if exp_str else (None, None)

        return _JDData(
            required_skills=_clean(data.get("skills")),
            preferred_skills=[],
            keywords=_clean(data.get("keywords")),
            experience_required=exp_str,
            responsibilities=_clean(data.get("responsibilities")),
            tools=_clean(data.get("tools")),
            min_experience_years=min_exp,
            max_experience_years=max_exp,
        )

    # ------------------------------------------------------------------
    # Step 4: Merge rule + LLM results
    # ------------------------------------------------------------------

    def _merge(self, rule: _JDData, llm: _JDData) -> _JDData:
        """Merge LLM data into rule data. Rule data takes precedence; LLM fills gaps."""

        def _merge_lists(primary: list[str], secondary: list[str]) -> list[str]:
            seen = {x.lower() for x in primary}
            result = list(primary)
            for item in secondary:
                if item.lower() not in seen:
                    seen.add(item.lower())
                    result.append(item)
            return result

        # Normalize LLM skills through alias dict
        llm_skills_norm = [self._normalize_skill(s) for s in llm.required_skills]

        merged_required = _merge_lists(rule.required_skills, llm_skills_norm)
        merged_preferred = _merge_lists(rule.preferred_skills, llm.preferred_skills)

        # Keywords: merge, strip weights from LLM keywords if needed
        llm_kw_clean = [
            kw if ":" in kw else kw for kw in llm.keywords
        ]
        merged_keywords = _merge_lists(rule.keywords, llm_kw_clean)

        # Responsibilities: prefer rule if ≥ 2, else fill from LLM
        merged_resp = rule.responsibilities if len(rule.responsibilities) >= 2 else \
            _merge_lists(rule.responsibilities, llm.responsibilities)

        # Tools: merge both
        merged_tools = _merge_lists(rule.tools, llm.tools)

        # Experience: prefer rule if present
        exp_str = rule.experience_required or llm.experience_required
        min_exp = rule.min_experience_years if rule.min_experience_years is not None \
            else llm.min_experience_years
        max_exp = rule.max_experience_years if rule.max_experience_years is not None \
            else llm.max_experience_years

        return _JDData(
            required_skills=merged_required,
            preferred_skills=merged_preferred,
            keywords=merged_keywords,
            experience_required=exp_str,
            responsibilities=merged_resp,
            tools=merged_tools,
            min_experience_years=min_exp,
            max_experience_years=max_exp,
        )

    # ------------------------------------------------------------------
    # Skill normalization (shared alias dict with ResumeParser)
    # ------------------------------------------------------------------

    def _normalize_skill(self, skill: str) -> str:
        """Normalize a skill name using the shared canonical alias dictionary."""
        stripped = skill.strip()
        if stripped in SKILL_ALIASES:
            return SKILL_ALIASES[stripped]
        lower = stripped.lower()
        for alias, canonical in SKILL_ALIASES.items():
            if alias.lower() == lower:
                return canonical
        return stripped
