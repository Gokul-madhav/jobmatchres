"""
ResumeParser — extracts and structures text from PDF and DOCX resume files.

Task 2.1 covers text extraction (_extract_text_pdf, _extract_text_docx).
Task 2.2 implements section detection, skill extraction, normalization,
experience year computation, and the full parse orchestration.

Handles both standard resume formats (clear section headers) and non-standard
formats with spaced-out headers (e.g. "P R OFESSIONAL PROFILE") and
pipe-separated inline entries (e.g. "Title | Company | 2025").
"""
from __future__ import annotations

import io
import logging
import re
from datetime import date
from typing import Literal

logger = logging.getLogger(__name__)

import fitz  # PyMuPDF
from docx import Document

from app.errors import AppError, ErrorCode
from app.models import (
    ContactInfo,
    EducationEntry,
    ExperienceEntry,
    ParsedResume,
    ProjectEntry,
)
from app.components.llm_recovery import run_llm_recovery

# ---------------------------------------------------------------------------
# Canonical skill alias dictionary (shared with JDParser per design doc)
# ---------------------------------------------------------------------------

SKILL_ALIASES: dict[str, str] = {
    "JS": "JavaScript",
    "TS": "TypeScript",
    "ML": "Machine Learning",
    "AI": "Artificial Intelligence",
    "NLP": "Natural Language Processing",
    "CV": "Computer Vision",
    "DL": "Deep Learning",
    "k8s": "Kubernetes",
    "k8": "Kubernetes",
    "py": "Python",
    "PY": "Python",
    "GCP": "Google Cloud Platform",
    "AWS": "Amazon Web Services",
    "CI/CD": "CI/CD",
    "OOP": "Object-Oriented Programming",
    "FP": "Functional Programming",
    "DB": "Database",
    "SQL": "SQL",
    "NoSQL": "NoSQL",
    "REST": "REST",
    "API": "API",
    "UI": "UI",
    "UX": "UX",
    "TDD": "Test-Driven Development",
    "BDD": "Behavior-Driven Development",
    "ORM": "ORM",
    "MVC": "MVC",
    "SPA": "Single Page Application",
    "SSR": "Server-Side Rendering",
    "CSR": "Client-Side Rendering",
}

# ---------------------------------------------------------------------------
# Section header patterns (case-insensitive)
# Matches lines that are ONLY the header word(s), with optional trailing colon.
# These are applied against NORMALIZED text (spaced-out headers collapsed).
# ---------------------------------------------------------------------------

_SECTION_PATTERNS: dict[str, re.Pattern[str]] = {
    "summary": re.compile(
        r"^\s*(summary|objective|profile|professional\s+summary|career\s+objective|"
        r"professional\s+profile)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "skills": re.compile(
        r"^\s*(skills|technical\s+skills|core\s+competencies|technologies|key\s+skills|"
        r"technical\s+expertise|areas\s+of\s+expertise)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "experience": re.compile(
        r"^\s*(experience|work\s+experience|employment|professional\s+experience|"
        r"work\s+history|employment\s+history|career\s+history|"
        r"professional\s+experience\s+&\s+selected\s+projects)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "education": re.compile(
        r"^\s*(education|academic\s+background|academic\s+qualifications|"
        r"qualifications|educational\s+background)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "projects": re.compile(
        r"^\s*(projects|personal\s+projects|side\s+projects|portfolio|"
        r"open\s+source|notable\s+projects)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "achievements": re.compile(
        r"^\s*(achievements|certifications|achievements\s+&\s+certifications|"
        r"awards|honors)\s*:?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
}

# Keywords used for proximity fallback when no headers are found
_SECTION_KEYWORDS: dict[str, list[str]] = {
    "summary": ["objective", "summary", "profile", "about me", "overview"],
    "skills": ["python", "java", "javascript", "sql", "react", "node", "aws", "docker",
               "tableau", "excel", "matlab", "power bi"],
    "experience": ["company", "employer", "worked at", "position", "role",
                   "responsibilities", "employment", "career"],
    "education": ["university", "college", "bachelor", "master", "degree",
                  "graduated", "gpa", "diploma", "institute"],
    "projects": ["project", "projects", "built", "developed", "github", "deployed", "portfolio"],
}

# Full-line patterns for _detect_sections (used with re.Pattern.fullmatch)
_SECTION_LINE_PATTERNS: dict[str, re.Pattern[str]] = {
    "summary": re.compile(
        r"(summary|objective|profile|about\s+me|professional\s+summary|"
        r"career\s+objective|professional\s+profile|about|overview)\s*:?",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"(skills|technical\s+skills|core\s+competencies|technologies|"
        r"key\s+skills|technical\s+expertise|areas\s+of\s+expertise|"
        r"competencies|expertise|tools\s+&\s+technologies)\s*:?",
        re.IGNORECASE,
    ),
    "experience": re.compile(
        r"(experience|work\s+experience|employment|professional\s+experience|"
        r"work\s+history|employment\s+history|career\s+history|"
        r"professional\s+background|professional\s+experience\s+&\s+selected\s+projects|"
        r"career\s+experience|relevant\s+experience)\s*:?",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"(education|academic\s+background|academic\s+qualifications|"
        r"qualifications|educational\s+background|academic\s+history|"
        r"degrees?|training\s+&\s+education)\s*:?",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"(projects|personal\s+projects|side\s+projects|portfolio|"
        r"open\s+source|notable\s+projects|key\s+projects|"
        r"selected\s+projects)\s*:?",
        re.IGNORECASE,
    ),
    "achievements": re.compile(
        r"(achievements|certifications|achievements\s+&\s+certifications|"
        r"awards|honors|honours|accomplishments|recognition)\s*:?",
        re.IGNORECASE,
    ),
}

# Regex for contact info extraction
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
_LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w\-]+", re.IGNORECASE)
_LOCATION_RE = re.compile(
    r"\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z]+))\b"
)

# Date patterns for experience year computation
_DATE_RE = re.compile(
    r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    r"[\s,\.]*(\d{4})"
    r"|(\d{1,2})[/\-](\d{4})"
    r"|(\d{4})",
    re.IGNORECASE,
)
_PRESENT_RE = re.compile(r"\b(present|current|now|ongoing)\b", re.IGNORECASE)

_MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Patterns that indicate a line is a bullet point / description, not a title
_BULLET_RE = re.compile(r"^[\-\*•·▪▸◦‣⁃]\s+")
# Skill section label prefixes — only strip labels that are ≤ 4 words before the colon
_SKILL_LABEL_RE = re.compile(
    r"^(?:\w+(?:\s+\w+){0,3})\s*:\s*",
    re.IGNORECASE,
)

# Section synonyms for secondary keyword matching
_SECTION_SYNONYMS: dict[str, list[str]] = {
    "summary": ["about me", "introduction", "bio", "overview", "who i am", "personal statement"],
    "skills": ["competencies", "capabilities", "proficiencies", "what i know", "tech stack", "toolbox", "expertise"],
    "experience": ["career", "positions", "roles", "jobs", "work", "employment record", "professional background", "selected projects"],
    "education": ["academics", "schooling", "training", "degrees", "credentials", "qualifications"],
    "projects": ["portfolio", "work samples", "case studies", "builds", "contributions"],
    "achievements": ["accomplishments", "recognition", "awards", "honors", "publications", "certifications"],
}

# Known tech and domain skills for second-pass scanning
_KNOWN_SKILLS: frozenset[str] = frozenset({
    # Programming languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl",
    # Web/frameworks
    "React", "Angular", "Vue", "Node.js", "Django", "Flask", "FastAPI",
    "Spring", "Express", "Next.js", "Nuxt.js", "Svelte", "Laravel",
    # Data/ML
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
    "Tableau", "Power BI", "Excel", "Spark", "Hadoop", "Kafka",
    # Cloud/DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "Jenkins", "GitHub", "GitLab", "CircleCI", "Helm",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite",
    "Oracle", "Cassandra", "DynamoDB", "Neo4j",
    # Tools
    "Git", "Linux", "Bash", "PowerShell", "Jira", "Confluence", "Figma",
    "Postman", "Swagger", "GraphQL", "REST", "gRPC",
    # Aviation/domain specific
    "Simulink", "Arduino",
})

# Public alias for external access (e.g. inline skill scanning)
KNOWN_SKILLS: frozenset[str] = _KNOWN_SKILLS

# Common English words used to filter non-tech tokens in _extract_tech_terms
_COMMON_ENGLISH: frozenset[str] = frozenset({
    "the", "and", "or", "for", "with", "from", "into", "onto", "upon",
    "this", "that", "these", "those", "their", "there", "they", "them",
    "has", "have", "had", "was", "were", "been", "being", "are", "is",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "also", "both", "each", "all", "any", "some", "such", "more", "most",
    "very", "well", "just", "only", "even", "then", "than", "when",
    "where", "which", "while", "who", "whom", "whose", "what", "how",
    "across", "between", "within", "through", "during", "under", "over",
    "about", "above", "below", "after", "before", "since", "until",
    "new", "old", "big", "small", "large", "high", "low", "long", "short",
    "good", "bad", "best", "first", "last", "next", "same", "other",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "many", "few", "much", "little", "several", "various",
    # Action verbs (past tense)
    "led", "built", "developed", "implemented", "designed", "managed",
    "created", "worked", "achieved", "improved", "reduced", "increased",
    "deployed", "integrated", "mentored", "conducted", "collaborated",
    "architected", "optimized", "migrated", "automated", "delivered",
    "established", "maintained", "supported", "provided", "ensured",
    "participated", "operated", "examined", "engaged", "audited",
    "assessed", "collected", "processed", "modelled", "evaluated",
    "identified", "produced", "analysed", "analysing", "modelling",
    "selected", "recognised", "commissioned", "reimagine", "addressing",
    "aligned", "initiated", "researching", "benchmarking", "visualising",
    # Present/gerund verbs
    "using", "including", "following", "making", "taking", "getting",
    "going", "coming", "seeing", "knowing", "thinking", "looking",
    "working", "helping", "showing", "moving", "playing", "running",
    "writing", "reading", "learning", "teaching", "building", "testing",
})

# Known noise words to filter from skill extraction
_SKILL_NOISE = frozenset({
    "and", "or", "the", "with", "for", "using", "via", "etc", "including",
    "such", "as", "like", "also", "both", "either", "other", "various",
    "experience", "knowledge", "proficiency", "proficient", "familiar",
    "working", "strong", "good", "excellent", "advanced", "basic",
    "intermediate", "expert", "years", "year", "months", "month",
})


class ResumeParser:
    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def parse(self, file_bytes: bytes, file_type: Literal["pdf", "docx"]) -> ParsedResume:
        """Orchestrate full resume parsing and return a ParsedResume.

        Raises AppError(PARSE_FAILURE) when no text can be extracted.
        """
        if file_type == "pdf":
            raw_text = self._extract_text_pdf(file_bytes)
        else:
            raw_text = self._extract_text_docx(file_bytes)

        if not raw_text.strip():
            raise AppError(ErrorCode.PARSE_FAILURE)

        sections = self._detect_sections(raw_text)
        contact = self._extract_contact(raw_text)
        summary = sections.get("summary", "").strip() or None

        # Skills: prioritise the dedicated skills section, then scan full text
        skills_section_text = sections.get("skills", "")
        skills = self._extract_skills(skills_section_text, full_text=raw_text)

        experience = self._parse_experience(sections.get("experience", ""))
        education = self._parse_education(sections.get("education", ""))

        # Also scan summary and experience descriptions for inline skills
        all_section_texts = [
            summary or "",
            sections.get("experience", ""),
            sections.get("education", ""),
            sections.get("projects", ""),
            sections.get("achievements", ""),
        ]
        for src in all_section_texts:
            for sk in self._extract_inline_skills(src):
                if sk.lower() not in {s.lower() for s in skills}:
                    skills.append(sk)

        # Projects: use dedicated section if present; otherwise extract from experience
        projects_text = sections.get("projects", "")
        if projects_text.strip():
            projects = self._parse_projects(projects_text)
        else:
            projects = self._extract_projects_from_experience(
                sections.get("experience", "")
            )

        total_years = self._extract_experience_years(experience)
        formatting_issues = self._detect_formatting_issues(raw_text)

        # ------------------------------------------------------------------
        # LLM Recovery pass — find what the rule-based parser missed.
        # Runs only when OPENAI_API_KEY is set; fails silently on any error.
        # Uses run_in_executor to avoid blocking the async event loop.
        # ------------------------------------------------------------------
        try:
            from app.config import settings as _settings
            if _settings.parser_recovery_enabled and _settings.openai_api_key:
                import concurrent.futures as _cf
                import asyncio as _asyncio

                _api_key = _settings.openai_api_key
                _model = _settings.parser_recovery_model
                _timeout = _settings.parser_recovery_timeout_seconds

                # Build education list for context
                _existing_edu = [
                    f"{e.degree} at {e.institution}" for e in education if e.degree or e.institution
                ]

                # Run the synchronous LLM call in a thread pool so it doesn't
                # block the FastAPI async event loop
                def _run_recovery():
                    return run_llm_recovery(
                        raw_text=raw_text,
                        existing_skills=skills,
                        existing_projects=[p.name for p in projects],
                        existing_experience_titles=[e.title for e in experience],
                        api_key=_api_key,
                        model=_model,
                        timeout_seconds=_timeout,
                        existing_education=_existing_edu,
                        contact_name=contact.name or "",
                        contact_email=contact.email or "",
                    )

                # Try to get the running event loop (FastAPI async context)
                try:
                    loop = _asyncio.get_event_loop()
                    if loop.is_running():
                        # We're inside an async context — use thread pool
                        with _cf.ThreadPoolExecutor(max_workers=1) as executor:
                            future = executor.submit(_run_recovery)
                            recovery = future.result(timeout=_timeout + 5)
                    else:
                        recovery = _run_recovery()
                except RuntimeError:
                    recovery = _run_recovery()

                logger.info(
                    "LLM recovery: +%d skills, +%d projects, +%d experience, +%d education",
                    len(recovery.missing_skills),
                    len(recovery.missing_projects),
                    len(recovery.missing_experience),
                    len(recovery.missing_education),
                )

                # --- Merge skills ---
                existing_skill_keys = {s.lower() for s in skills}
                for sk in recovery.missing_skills:
                    if sk.strip() and sk.lower() not in existing_skill_keys:
                        skills.append(sk.strip())
                        existing_skill_keys.add(sk.lower())

                # --- Merge projects ---
                existing_project_names = {p.name.lower() for p in projects}
                for proj_name in recovery.missing_projects:
                    if proj_name.strip() and proj_name.lower() not in existing_project_names:
                        projects.append(ProjectEntry(
                            name=proj_name.strip(),
                            description="",
                            skills_mentioned=[],
                        ))
                        existing_project_names.add(proj_name.lower())

                # --- Merge experience (validate: short title, not a sentence) ---
                # Use first 3 words of title for fuzzy dedup
                def _exp_key(title: str) -> str:
                    return " ".join(title.lower().split()[:3])

                existing_exp_keys = {_exp_key(e.title) for e in experience}
                for exp_str in recovery.missing_experience:
                    title, company, start_date, end_date = self._parse_llm_experience_str(exp_str)
                    if (
                        title
                        and _exp_key(title) not in existing_exp_keys
                        and len(title.split()) <= 6
                        and not title.endswith(".")
                    ):
                        experience.append(ExperienceEntry(
                            title=title,
                            company=company,
                            start_date=start_date,
                            end_date=end_date,
                            description="",
                            skills_mentioned=[],
                        ))
                        existing_exp_keys.add(_exp_key(title))

                # --- Merge education ---
                # Use first 3 words of degree + first 3 words of institution for fuzzy dedup
                def _edu_key(degree: str, institution: str) -> str:
                    d_words = degree.lower().split()[:3]
                    i_words = institution.lower().split()[:3]
                    return " ".join(d_words) + "|" + " ".join(i_words)

                existing_edu_keys = {
                    _edu_key(e.degree, e.institution) for e in education
                }
                for edu_str in recovery.missing_education:
                    # Parse "Degree in Field at Institution (year)"
                    edu_entry = self._parse_llm_education_str(edu_str)
                    if edu_entry:
                        key = _edu_key(edu_entry.degree, edu_entry.institution)
                        if key not in existing_edu_keys and (edu_entry.degree or edu_entry.institution):
                            education.append(edu_entry)
                            existing_edu_keys.add(key)

                # --- Fill missing contact fields ---
                if not contact.name and recovery.contact_name:
                    contact.name = recovery.contact_name
                if not contact.email and recovery.contact_email:
                    contact.email = recovery.contact_email
                if not contact.phone and recovery.contact_phone:
                    contact.phone = recovery.contact_phone
                if not contact.linkedin and recovery.contact_linkedin:
                    contact.linkedin = recovery.contact_linkedin
                if not contact.location and recovery.contact_location:
                    contact.location = recovery.contact_location

                # --- Fill missing summary ---
                if not summary and recovery.summary:
                    summary = recovery.summary

                # Recalculate total years after merging
                total_years = self._extract_experience_years(experience)

        except Exception as _exc:
            logger.warning("LLM recovery error (non-fatal): %s: %s", type(_exc).__name__, _exc)

        # Final deduplication of skills (case-insensitive)
        seen_final: set[str] = set()
        deduped_skills: list[str] = []
        for sk in skills:
            key = sk.lower().strip()
            if key and key not in seen_final:
                seen_final.add(key)
                deduped_skills.append(sk)
        skills = deduped_skills

        # Deduplicate education (by degree + institution first 3 words, normalized)
        seen_edu: set[str] = set()
        deduped_edu: list[EducationEntry] = []
        for e in education:
            deg_norm = re.sub(r'[^\w\s]', '', e.degree.lower())
            inst_norm = re.sub(r'[^\w\s]', '', e.institution.lower())
            key = " ".join(deg_norm.split()[:3]) + "|" + " ".join(inst_norm.split()[:3])
            if key not in seen_edu:
                seen_edu.add(key)
                deduped_edu.append(e)
        education = deduped_edu

        # Deduplicate experience (by title first 3 words, case-insensitive)
        seen_exp: set[str] = set()
        deduped_exp: list[ExperienceEntry] = []
        for e in experience:
            # Normalize: strip punctuation, lowercase, first 4 words
            title_norm = re.sub(r'[^\w\s]', '', e.title.lower())
            key = " ".join(title_norm.split()[:4])
            if not key:
                key = e.title.lower()[:20]
            if key not in seen_exp:
                seen_exp.add(key)
                deduped_exp.append(e)
        experience = deduped_exp

        return ParsedResume(
            contact=contact,
            skills=skills,
            experience=experience,
            education=education,
            projects=projects,
            raw_text=raw_text,
            total_experience_years=total_years,
            summary=summary,
            detected_sections=list(sections.keys()),
            formatting_issues=formatting_issues,
        )

    # ------------------------------------------------------------------
    # Text extraction
    # ------------------------------------------------------------------

    def _extract_text_pdf(self, file_bytes: bytes) -> str:
        """Extract plain text from a PDF using PyMuPDF, with line reconstruction.

        Some PDFs (especially LinkedIn exports and single-column layouts) produce
        text with no newlines — everything on one long line. This method detects
        that case and reconstructs logical line breaks before returning.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages: list[str] = [page.get_text() for page in doc]
        doc.close()
        raw = "\n".join(pages)
        return self._preprocess_pdf_text(raw)

    def _preprocess_pdf_text(self, text: str) -> str:
        """Reconstruct line breaks in flat PDF text.

        Handles resumes where PyMuPDF returns everything on one line because
        the PDF uses absolute positioning (common in LinkedIn exports, Canva
        templates, and single-column ATS-friendly formats).

        Strategy:
        1. If the text already has reasonable line breaks (avg line < 120 chars),
           return as-is with only minor cleanup.
        2. Otherwise, inject newlines before known section headers, before
           date patterns that follow non-date text, and before bullet markers.
        """
        lines = text.splitlines()
        non_empty = [l for l in lines if l.strip()]
        if not non_empty:
            return text

        avg_len = sum(len(l) for l in non_empty) / len(non_empty)

        # If average line length is reasonable, just clean up and return
        if avg_len < 120:
            return text

        # Flat text — reconstruct line breaks
        # Known section header words to inject a newline before
        _section_words = (
            r"Summary|Skills|Experience|Education|Projects|Certifications|"
            r"Achievements|Publications|Awards|Honors|Activities|Interests|"
            r"Volunteering|Languages|References|Profile|Objective|Overview"
        )

        # Step 1: inject newline before section headers
        # e.g. "...Python Skills AI / ML..." -> "...Python\nSkills\nAI / ML..."
        text = re.sub(
            r'(?<=[a-z0-9\.\,\)])(\s+)(' + _section_words + r')(\s)',
            r'\n\2\n',
            text,
        )

        # Step 2: inject newline before "– " or "- " bullet markers
        # e.g. "...techniques.– Built..." -> "...techniques.\n– Built..."
        text = re.sub(r'([\.!?])\s*([–\-])\s+', r'\1\n\2 ', text)

        # Step 3: inject newline before date patterns that follow non-date text
        # e.g. "NIT Rourkela July 2025" -> "NIT Rourkela\nJuly 2025"
        text = re.sub(
            r'([A-Za-z])\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})',
            r'\1\n\2',
            text,
        )

        # Step 4: inject newline before institution/company names that follow dates
        # e.g. "July 2025 NIT Rourkela" -> "July 2025\nNIT Rourkela"
        text = re.sub(
            r'(\d{4})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:University|College|Institute|School|Corp|Inc|Ltd|LLC))?)',
            r'\1\n\2',
            text,
        )

        # Step 5: inject newline before pipe-separated entries
        # e.g. "...Python Project Name | Tech | 2024..." -> "...\nProject Name | Tech | 2024..."
        text = re.sub(r'([a-z\.\,])\s+([A-Z][^|]+\|)', r'\1\n\2', text)

        return text

    def _extract_text_docx(self, file_bytes: bytes) -> str:
        """Extract plain text from a DOCX using python-docx."""
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)

    # ------------------------------------------------------------------
    # Section detection
    # ------------------------------------------------------------------

    def _normalize_spaced_text(self, text: str) -> str:
        """Collapse spaced-out uppercase headers like 'P R OFESSIONAL' -> 'PROFESSIONAL'.

        Handles patterns where individual capital letters are separated by spaces
        before a word fragment, e.g. 'E D UCATION' -> 'EDUCATION',
        'S K I L L S' -> 'SKILLS', 'A C HI E VEMENTS' -> 'ACHIEVEMENTS'.

        New logic: start a group when we see a single uppercase letter. Continue
        adding tokens as long as each token is uppercase alpha AND (is single char
        OR the previous token was single char). Stop when we see two consecutive
        multi-char tokens OR a non-uppercase-alpha token.
        """
        words = text.split(" ")
        result_words: list[str] = []
        i = 0
        while i < len(words):
            w = words[i]
            # Start a spaced-out word group only when current token is a single uppercase letter
            if len(w) <= 2 and w.isupper() and w.isalpha():
                group = [w]
                j = i + 1
                prev_was_single = True
                while j < len(words):
                    nw = words[j]
                    # Stop if separator word
                    if nw in ("&", "/", "AND", "OR", "-"):
                        break
                    # Stop if not uppercase alpha
                    if not (nw and nw.isupper() and nw.isalpha()):
                        break
                    is_single = len(nw) == 1
                    # Continue if current is single OR previous was single
                    # Stop only when both previous AND current are multi-char
                    if not prev_was_single and not is_single:
                        break
                    group.append(nw)
                    prev_was_single = is_single
                    j += 1
                if len(group) > 1:
                    result_words.append("".join(group))
                    i = j
                    continue
            result_words.append(w)
            i += 1
        return " ".join(result_words)

    def _detect_sections(self, raw_text: str) -> dict[str, str]:
        """Detect resume sections using regex header matching.

        Normalizes spaced-out headers (e.g. 'P R OFESSIONAL PROFILE') before
        matching. Falls back to synonym matching, then keyword proximity heuristics
        when no headers found.
        Returns a dict mapping canonical section name -> section content.
        """
        lines_orig = raw_text.splitlines()
        lines_norm = [self._normalize_spaced_text(line) for line in lines_orig]

        matches: list[tuple[int, int, str]] = []  # (line_index, end_line_index, section_name)

        # Pass 1: match each normalized line directly against section patterns
        for line_idx, norm_line in enumerate(lines_norm):
            stripped = norm_line.strip()
            if not stripped:
                continue
            for section_name, pattern in _SECTION_LINE_PATTERNS.items():
                m = pattern.fullmatch(stripped) or pattern.fullmatch(stripped.rstrip(":").strip())
                if m:
                    matches.append((line_idx, line_idx + 1, section_name))
                    break

        # Pass 2: synonym matching on normalized+lowercased stripped lines
        if not matches:
            for line_idx, norm_line in enumerate(lines_norm):
                stripped_lower = norm_line.strip().lower().rstrip(":")
                if not stripped_lower:
                    continue
                for section_name, synonyms in _SECTION_SYNONYMS.items():
                    if stripped_lower in synonyms:
                        matches.append((line_idx, line_idx + 1, section_name))
                        break

        if not matches:
            return self._detect_sections_by_proximity(raw_text)

        # Deduplicate: keep first occurrence of each section name, sorted by position
        matches.sort(key=lambda x: x[0])
        seen_sections: set[str] = set()
        deduped: list[tuple[int, int, str]] = []
        for m in matches:
            if m[2] not in seen_sections:
                seen_sections.add(m[2])
                deduped.append(m)
        matches = deduped

        sections: dict[str, str] = {}
        for i, (line_idx, end_line_idx, name) in enumerate(matches):
            next_line_idx = matches[i + 1][0] if i + 1 < len(matches) else len(lines_orig)
            content_lines = lines_orig[end_line_idx:next_line_idx]
            content = "\n".join(content_lines).strip()
            sections[name] = content

        return sections

    def _detect_sections_by_proximity(self, raw_text: str) -> dict[str, str]:
        """Keyword proximity fallback: assign lines to sections based on nearby keywords.

        Resets current_section when a new section keyword is found. Also treats
        short all-caps/title-case lines containing a section keyword as headers
        (resetting the section). Only assigns lines within 50 lines of the
        triggering keyword.
        """
        lines = raw_text.splitlines()
        sections: dict[str, list[str]] = {}
        current_section: str | None = None
        lines_since_trigger = 0

        for line in lines:
            line_lower = line.lower()
            stripped = line.strip()

            # Check if this line is a section header
            found_section: str | None = None
            for section_name, keywords in _SECTION_KEYWORDS.items():
                if any(kw in line_lower for kw in keywords):
                    # Treat as a header reset if the line is short and header-like
                    is_header_like = (
                        len(stripped) < 40
                        and (stripped.isupper() or stripped.istitle())
                    )
                    if is_header_like or current_section is None:
                        found_section = section_name
                        break
                    # Even if not header-like, still assign content to this section
                    found_section = section_name
                    break

            if found_section is not None:
                current_section = found_section
                lines_since_trigger = 0
            elif current_section is not None:
                lines_since_trigger += 1
                # Stop assigning after 50 lines without a new trigger
                if lines_since_trigger > 50:
                    current_section = None

            if current_section:
                sections.setdefault(current_section, []).append(line)

        return {k: "\n".join(v) for k, v in sections.items()}

    # ------------------------------------------------------------------
    # Skill extraction and normalization
    # ------------------------------------------------------------------

    def _extract_skills(self, skills_section: str, full_text: str = "") -> list[str]:
        """Extract skills from the skills section, with full-text fallback.

        Handles:
        - Category sub-headers like "Aviation Data & Tech" -> skipped
        - Label prefixes like "Languages: Python, JS" -> strips "Languages:"
        - Dash-separated lists: "Python - Excel - Tableau"
        - Comma/pipe/bullet/newline/semicolon delimiters
        - Parenthetical descriptions: "Python (data analysis, automation)" -> "Python"
        - Deduplication and normalization
        - Second pass: scans source text for known skills missed by delimiter splitting
        """
        source = skills_section if skills_section.strip() else full_text
        skills: list[str] = []
        seen: set[str] = set()

        for line in source.splitlines():
            line = line.strip()
            if not line:
                continue
            # Strip bullet characters at line start
            line = _BULLET_RE.sub("", line).strip()

            # Skip pure category sub-headers (no separators, short, known words)
            if self._is_pure_category_header(line):
                continue

            # Strip parenthetical content BEFORE splitting so commas inside
            # parens don't create spurious tokens: "Python (data, auto)" -> "Python"
            line = re.sub(r"\s*\([^)]*\)", "", line).strip()
            if not line:
                continue

            # Strip label prefix ONLY when it's a clearly categorical label
            label_m = _SKILL_LABEL_RE.match(line)
            if label_m:
                remainder = line[label_m.end():].strip()
                if remainder:
                    line = remainder

            # Split on: " - " (space-dash-space), comma, pipe, semicolon
            tokens = re.split(r"\s+-\s+|[,|;]+", line)
            for token in tokens:
                token = token.strip().strip("•·▪▸*()[]").strip()
                if not token:
                    continue
                if not self._is_valid_skill_token(token):
                    continue
                normalized = self._normalize_skill(token)
                key = normalized.lower()
                if key not in seen:
                    seen.add(key)
                    skills.append(normalized)

        # Second pass: scan for known skills missed by delimiter splitting
        for skill in _KNOWN_SKILLS:
            pattern = re.compile(r'\b' + re.escape(skill) + r'\b', re.IGNORECASE)
            if pattern.search(source):
                normalized = self._normalize_skill(skill)
                key = normalized.lower()
                if key not in seen:
                    seen.add(key)
                    skills.append(normalized)

        return skills

    def _extract_inline_skills(self, text: str) -> list[str]:
        """Scan paragraph text for skills using the KNOWN_SKILLS dictionary."""
        found: list[str] = []
        seen: set[str] = set()
        text_lower = text.lower()
        for skill in KNOWN_SKILLS:
            skill_lower = skill.lower()
            if re.search(r'\b' + re.escape(skill_lower) + r'\b', text_lower):
                key = skill_lower
                if key not in seen:
                    seen.add(key)
                    found.append(skill)
        return found

    def _is_pure_category_header(self, text: str) -> bool:
        """Return True if the line is a standalone category label with no skills.

        A pure category header:
        - Has no skill-list separators (commas, pipes, " - ")
        - Has no colon (colon means it's a label:value line)
        - Is short (≤ 6 words)
        - Contains only known category words OR is all-caps with no digits
        """
        stripped = text.strip()
        # If it contains skill-list separators, it's a skill list line
        if re.search(r"[,|;]|\s+-\s+", stripped):
            return False
        # If it contains a colon it's a label:value line, handled separately
        if ":" in stripped:
            return False
        # If it contains parentheses it's a skill with description
        if "(" in stripped:
            return False
        words = stripped.split()
        if len(words) > 6:
            return False
        _category_words = {
            "aviation", "data", "tech", "business", "soft", "hard", "skills",
            "languages", "tools", "platforms", "frameworks", "databases", "cloud",
            "devops", "frontend", "backend", "mobile", "testing", "methodologies",
            "certifications", "achievements", "awards", "honors", "other",
            "technical", "professional", "personal", "core", "key",
        }
        word_set = {w.lower().strip("&/") for w in words if w.strip("&/")}
        if word_set and word_set.issubset(_category_words | {"&", "/", "and", "or"}):
            return True
        return False

    def _is_valid_skill_token(self, token: str) -> bool:
        """Return True if the token looks like a real skill name.

        Tightened: max 5 words (down from 6), max 60 chars (down from 80).
        Rejects tokens with more than 2 consecutive lowercase common English words.
        """
        if not token:
            return False
        # Length bounds: 2-60 chars
        if len(token) < 2 or len(token) > 60:
            return False
        # Purely numeric
        if token.isdigit():
            return False
        # Noise words (single-word noise only)
        if token.lower() in _SKILL_NOISE:
            return False
        # Very long phrases (more than 5 words) are descriptions, not skills
        if token.count(" ") > 4:
            return False
        # Check for more than 2 consecutive lowercase common English words
        words = token.split()
        consecutive_common = 0
        for word in words:
            if word.lower() in _COMMON_ENGLISH:
                consecutive_common += 1
                if consecutive_common > 2:
                    return False
            else:
                consecutive_common = 0
        # Lines that look like descriptions (start with action verb words)
        if re.match(
            r"^(led|built|developed|implemented|designed|managed|created|"
            r"worked|responsible|achieved|improved|reduced|increased|"
            r"deployed|integrated|mentored|conducted|collaborated|"
            r"architected|optimized|migrated|automated|delivered|"
            r"established|maintained|supported|provided|ensured|"
            r"participated|operated|examined|engaged|audited|assessed|"
            r"collected|processed|modelled|evaluated|identified|produced)\b",
            token, re.IGNORECASE,
        ):
            return False
        return True

    def _normalize_skill(self, skill: str) -> str:
        """Normalize a skill name using the canonical alias dictionary."""
        stripped = skill.strip()
        # Exact match (case-sensitive for abbreviations like JS, ML)
        if stripped in SKILL_ALIASES:
            return SKILL_ALIASES[stripped]
        # Case-insensitive match for lowercase aliases like "py"
        lower = stripped.lower()
        for alias, canonical in SKILL_ALIASES.items():
            if alias.lower() == lower:
                return canonical
        return stripped

    # ------------------------------------------------------------------
    # Experience year computation
    # ------------------------------------------------------------------

    def _extract_experience_years(self, experience_entries: list[ExperienceEntry]) -> float:
        """Compute total years of experience from a list of ExperienceEntry objects."""
        if not experience_entries:
            return 0.0

        total_days = 0
        today = date.today()

        for entry in experience_entries:
            start = self._parse_date(entry.start_date)
            if start is None:
                continue
            if entry.end_date is None or _PRESENT_RE.search(entry.end_date or ""):
                end = today
            else:
                end = self._parse_date(entry.end_date)
                if end is None:
                    end = today

            if end >= start:
                total_days += (end - start).days

        return round(total_days / 365.25, 2)

    def _parse_date(self, date_str: str) -> date | None:
        """Parse a date string into a date object. Returns None if unparseable."""
        if not date_str:
            return None
        if _PRESENT_RE.search(date_str):
            return date.today()

        m = _DATE_RE.search(date_str)
        if not m:
            return None

        month_name, year_from_name, month_num, year_from_slash, year_only = m.groups()

        if month_name and year_from_name:
            month = _MONTH_MAP.get(month_name.lower()[:3], 1)
            return date(int(year_from_name), month, 1)
        if month_num and year_from_slash:
            return date(int(year_from_slash), int(month_num), 1)
        if year_only:
            return date(int(year_only), 1, 1)

        return None

    # ------------------------------------------------------------------
    # Contact info extraction
    # ------------------------------------------------------------------

    def _extract_contact(self, raw_text: str) -> ContactInfo:
        """Extract contact information from the top portion of the resume.

        Handles both standard multi-line formats and single-line formats like:
        "GUNA SHYAM NARAYANA MSc ... - email@x.com - +44 ... - linkedin.com/in/..."
        """
        # Search the full raw text for contact fields — some resumes pack
        # everything on one very long line
        email_m = _EMAIL_RE.search(raw_text)
        linkedin_m = _LINKEDIN_RE.search(raw_text)

        # Phone: use a stricter pattern to avoid matching date ranges like "2023 - 2024"
        _strict_phone = re.compile(
            r"(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})"
        )
        phone_m = _strict_phone.search(raw_text)

        name = self._extract_name(raw_text, email_m, phone_m, linkedin_m)

        # Extract location: look for "City, Country" or "City, ST" patterns in header
        header_text = "\n".join(raw_text.splitlines()[:15])
        location_m = _LOCATION_RE.search(header_text)
        location = location_m.group(1).strip() if location_m else None

        return ContactInfo(
            name=name,
            email=email_m.group(0) if email_m else None,
            phone=phone_m.group(0).strip() if phone_m else None,
            linkedin=linkedin_m.group(0) if linkedin_m else None,
            location=location,
        )

    def _extract_name(
        self,
        raw_text: str,
        email_m: re.Match | None,
        phone_m: re.Match | None,
        linkedin_m: re.Match | None,
    ) -> str:
        """Extract the candidate name from the top of the resume.

        Handles:
        1. Standard: name on its own line at the top
        2. Single-line: "FULL NAME Credential - Institution - email - phone - linkedin"
           where name is everything before the first credential/institution marker
        """
        lines = raw_text.splitlines()

        for line in lines[:10]:
            line = line.strip()
            if not line:
                continue

            has_contact = (
                (email_m and email_m.group(0) in line)
                or (phone_m and phone_m.group(0).strip() in line)
                or (linkedin_m and linkedin_m.group(0) in line)
            )

            if has_contact:
                # Split on " - " and take the first segment, then strip credentials
                parts = re.split(r"\s+-\s+", line)
                candidate = parts[0].strip() if parts else line.strip()
                # Remove trailing credential/degree patterns like "MSc ...", "BSc ...", "PhD ..."
                candidate = re.sub(
                    r"\s+(MSc|BSc|BEng|MEng|MBA|PhD|BA|MA|BBA|MCA|BCA|BTech|MTech|"
                    r"Diploma|Certificate|MRes|LLB|LLM)(\s+.*)?$",
                    "", candidate, flags=re.IGNORECASE,
                ).strip()
                if candidate:
                    return candidate

            # Skip lines that look like section headers
            norm = self._normalize_spaced_text(line)
            if any(p.fullmatch(norm.strip()) or p.fullmatch(norm.strip().rstrip(":").strip())
                   for p in _SECTION_LINE_PATTERNS.values()):
                continue

            if line and not has_contact:
                # Long lines with " - " separators are single-line headers
                if len(line) > 60 and " - " in line:
                    parts = re.split(r"\s+-\s+", line)
                    candidate = parts[0].strip()
                    candidate = re.sub(
                        r"\s+(MSc|BSc|BEng|MEng|MBA|PhD|BA|MA|BBA|MCA|BCA|BTech|MTech|"
                        r"Diploma|Certificate|MRes|LLB|LLM)\b.*$",
                        "", candidate, flags=re.IGNORECASE,
                    ).strip()
                    return candidate
                return line

        return ""

    # ------------------------------------------------------------------
    # Section-specific parsers
    # ------------------------------------------------------------------

    def _is_description_line(self, line: str) -> bool:
        """Return True if a line looks like a description sentence rather than a job header."""
        stripped = line.strip()
        # Bullets are always descriptions
        if _BULLET_RE.match(stripped):
            return True
        # Lines starting with lowercase are descriptions
        if stripped and stripped[0].islower():
            return True
        # Lines that are very long (> 120 chars) are descriptions
        if len(stripped) > 120:
            return True
        # Lines starting with common description starters
        _desc_starters = re.compile(
            r"^(live|self|this|the|a\s|an\s|in\s|at\s|for\s|by\s|to\s|as\s|"
            r"during|working|using|with|from|through|across|over|under|"
            r"competitively|independently|analysing|modelling|audited|"
            r"developed|collected|built|evaluated|engaged|designed|"
            r"responsible|managing|leading|creating|supporting|"
            r"providing|ensuring|delivering|implementing|maintaining|"
            r"collaborated|participated|operated|examined|assessed|"
            r"identified|produced|recognised|selected|commissioned|"
            r"as\s+part\s+of|working\s+with)",
            re.IGNORECASE,
        )
        if _desc_starters.match(stripped):
            return True
        return False

    def _parse_experience(self, text: str) -> list[ExperienceEntry]:
        """Parse experience section text into ExperienceEntry objects.

        Handles common formats:
        - "Title | Company | Date Range" or "Title | Company | Year · Location"
        - "Title\\nCompany\\nDate Range" on separate lines
        - "Title– Subtitle\\nCompany\\nDate" (em-dash subtitle separator)
        - Bullet-point descriptions following the header lines
        """
        if not text.strip():
            return []

        # Pre-process: normalize "Title– Subtitle" -> "Title: Subtitle"
        # so the em-dash isn't confused with a bullet marker
        # e.g. "Research Intern– 3D Face Reconstruction" -> "Research Intern: 3D Face Reconstruction"
        text = re.sub(
            r'^(\s*[A-Z][^\n–—]{2,40})\s*[–—]\s*([A-Z3][^\n–—]{2,60})$',
            r'\1: \2',
            text,
            flags=re.MULTILINE,
        )

        lines = [l.strip() for l in text.splitlines() if l.strip()]
        entries: list[ExperienceEntry] = []

        # Regex to detect a date range line (contains a year or month+year)
        _date_in_line = re.compile(
            r"\b(\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*)\b",
            re.IGNORECASE,
        )
        # Regex to detect a pipe-separated "Title | Company | Date" line
        _pipe_line = re.compile(r"\|")

        # Regex to detect a line that is ONLY a date range (no job title content).
        # Such lines should be appended to the current block, not start a new one.
        _pure_date_re = re.compile(
            r'^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+)?\d{4}'
            r'\s*[-–—to]+\s*'
            r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+)?\d{4}$'
            r'|^\d{4}\s*[-–—to]+\s*(?:\d{4}|present|current|now|ongoing)$'
            r'|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}'
            r'\s*[-–—to]+\s*(?:present|current|now|ongoing)$',
            re.IGNORECASE,
        )

        # Group lines into entry blocks.
        # A new block starts when we see a pipe-separated header OR
        # a non-bullet line that contains a date (likely a job header).
        blocks: list[list[str]] = []
        current: list[str] = []

        for line in lines:
            is_bullet = bool(_BULLET_RE.match(line))
            has_date = bool(_date_in_line.search(line))
            has_pipe = bool(_pipe_line.search(line))

            # A pipe-separated line with a date is always a new entry header
            if has_pipe and has_date and not is_bullet:
                if current:
                    blocks.append(current)
                current = [line]
            elif not is_bullet and has_date and current:
                # Only start a new block if the line looks like a job header,
                # not a description sentence that happens to contain a year,
                # and not a pure date line (e.g. "March 2021 - Present")
                is_pure_date = bool(_pure_date_re.match(line.strip()))
                if not self._is_description_line(line) and not is_pure_date:
                    blocks.append(current)
                    current = [line]
                else:
                    current.append(line)
            else:
                current.append(line)
        if current:
            blocks.append(current)

        for block in blocks:
            if not block:
                continue

            header = block[0]
            desc_lines = [l for l in block[1:] if l.strip()]

            title = ""
            company = ""
            start_date = ""
            end_date: str | None = None

            # Case 1: pipe-separated "Title | Company | Date [· Location]"
            if _pipe_line.search(header):
                parts = [p.strip() for p in header.split("|")]
                title = parts[0] if len(parts) > 0 else ""
                company = parts[1] if len(parts) > 1 else ""
                date_part = parts[2] if len(parts) > 2 else ""
                # Strip middle-dot location suffix: "2025 · London Heathrow" -> "2025"
                date_part = re.split(r"\s*[·•]\s*", date_part)[0].strip()
                start_date, end_date = self._parse_date_range(date_part or header)
            else:
                # Case 2: separate lines — first non-bullet line is title,
                # next is company, next is date range
                title = header
                non_bullet_rest = [l for l in desc_lines if not _BULLET_RE.match(l)]
                bullet_lines = [l for l in desc_lines if _BULLET_RE.match(l)]

                if non_bullet_rest:
                    # Check if first non-bullet line looks like a date range
                    if _date_in_line.search(non_bullet_rest[0]) and len(non_bullet_rest[0]) < 60:
                        start_date, end_date = self._parse_date_range(non_bullet_rest[0])
                        desc_lines = bullet_lines
                    else:
                        company = non_bullet_rest[0]
                        if len(non_bullet_rest) > 1 and _date_in_line.search(non_bullet_rest[1]):
                            start_date, end_date = self._parse_date_range(non_bullet_rest[1])
                            desc_lines = bullet_lines
                        else:
                            desc_lines = bullet_lines

                # If no date found yet, try extracting from the title line itself
                if not start_date:
                    start_date, end_date = self._parse_date_range(header)
                    # If date was embedded in title, clean it from title
                    if start_date:
                        title = re.sub(
                            r"\s*[\|,]\s*\d{4}.*$|\s*[\|,]\s*(?:jan|feb|mar|apr|may|jun|"
                            r"jul|aug|sep|oct|nov|dec)\w*.*$",
                            "", title, flags=re.IGNORECASE,
                        ).strip()

                # Handle "Title at Company (Date)" or "Title at Company, Date - Date"
                if not company and re.search(r'\bat\b', title, re.IGNORECASE):
                    # Match: "Title at Company (Date)" or "Title at Company"
                    at_paren = re.match(
                        r'^(.+?)\s+at\s+(.+?)\s*\(([^)]+)\)\s*$', title, re.IGNORECASE
                    )
                    at_plain = re.match(
                        r'^(.+?)\s+at\s+(.+)$', title, re.IGNORECASE
                    )
                    if at_paren:
                        title = at_paren.group(1).strip()
                        company = at_paren.group(2).strip()
                        paren_content = at_paren.group(3).strip()
                        if paren_content and not start_date:
                            start_date, end_date = self._parse_date_range(paren_content)
                    elif at_plain:
                        title = at_plain.group(1).strip()
                        company_raw = at_plain.group(2).strip()
                        # Date might be embedded in company portion
                        if _date_in_line.search(company_raw):
                            start_date, end_date = self._parse_date_range(company_raw)
                            company = re.sub(
                                r'\s*[-–,]\s*\d{4}.*$', '', company_raw
                            ).strip()
                        else:
                            company = company_raw

            description = " ".join(
                _BULLET_RE.sub("", l).strip() for l in desc_lines if l.strip()
            )

            entries.append(ExperienceEntry(
                company=company,
                title=title,
                start_date=start_date,
                end_date=end_date,
                description=description,
                skills_mentioned=self._extract_tech_terms(description),
            ))

        return entries

    def _parse_date_range(self, text: str) -> tuple[str, str | None]:
        """Extract start and end date strings from a date range text.

        Returns (start_date_str, end_date_str | None).
        end_date_str is "Present" if the range is open-ended.
        Handles: "Jan 2022 - Present", "2021 – 2024", "Jan 2025 – May 2026",
                 "2025 · London", "Ongoing", "Expected First Class"
        """
        # Treat "ongoing", "expected" as present-like
        _open_re = re.compile(
            r"\b(present|current|now|ongoing|expected)\b", re.IGNORECASE
        )

        if _open_re.search(text):
            parts = re.split(r"\s*[-–—to]+\s*", text, maxsplit=1)
            start_raw = parts[0].strip() if parts else text
            start_m = _DATE_RE.search(start_raw)
            start = start_m.group(0) if start_m else start_raw
            return start, "Present"

        # Strip middle-dot location suffix: "2025 · London Heathrow" -> "2025"
        text = re.split(r"\s*[·•]\s*", text)[0].strip()

        # Look for "Month Year - Month Year" or "Year - Year"
        date_tokens = re.findall(
            r"(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[\s,\.]*\d{4}|\d{4})",
            text,
            re.IGNORECASE,
        )
        if len(date_tokens) >= 2:
            return date_tokens[0].strip(), date_tokens[1].strip()
        if len(date_tokens) == 1:
            return date_tokens[0].strip(), None
        return "", None

    def _parse_education(self, text: str) -> list[EducationEntry]:
        """Parse education section text into EducationEntry objects.

        Handles formats like:
        - "Degree | Institution, Country | Date Range"
        - "Institution B.Tech– Field — CGPA: X Expected Year"  (inline flat format)
        - "Degree\\nInstitution\\nYear"
        - "Institution\\nDegree in Field\\nYear"
        - "Degree, Institution, Year"
        """
        if not text.strip():
            return []

        # Pre-process: normalize em-dash degree separators
        # "B.Tech– Computer Science" -> "B.Tech in Computer Science"
        # "Diploma– Computer Science" -> "Diploma in Computer Science"
        text = re.sub(
            r'\b(B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|B\.?A|M\.?A|'
            r'Diploma|Certificate|BEng|MEng|MBA|PhD|BSc|MSc)\s*[–—-]\s*',
            r'\1 in ',
            text,
            flags=re.IGNORECASE,
        )

        entries: list[EducationEntry] = []
        year_re = re.compile(r"\b(19|20)\d{2}\b")
        # Lines to skip: GPA, module lists, grade descriptors, student role lines
        _skip_re = re.compile(
            r"\b(gpa|modules?:|grade:|first\s+class|second\s+class|distinction|"
            r"merit|pass|student\s+rep|president|society)\b",
            re.IGNORECASE,
        )
        degree_re = re.compile(
            r"\b(bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|"
            r"b\.?a\.?|m\.?a\.?|b\.?e\.?|m\.?e\.?|mba|btech|mtech|beng|meng|"
            r"diploma|certificate|degree|msc|bsc|llb|llm)\b",
            re.IGNORECASE,
        )
        _pipe_line = re.compile(r"\|")

        lines = [l.strip() for l in text.splitlines() if l.strip()]

        # Zero-th pass: handle "Institution DegreeName in Field — metadata Year" flat format
        # e.g. "Lakireddy Bali Reddy College of Engineering B.Tech in Computer Science — CGPA: 8.4 Expected May 2026"
        # e.g. "Sree Vahini Institute of Science and Technology Diploma in Computer Science — Grade: 86% June 2023"
        _inline_edu_re = re.compile(
            r'^(.+?(?:university|college|institute|school|academy|technology|engineering)[\w\s,\.]*?)'
            r'\s+((?:b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|b\.?a|m\.?a|'
            r'diploma|certificate|beng|meng|mba|phd|bsc|msc)\b[^—–]*?)'
            r'(?:\s*[—–]\s*.+?)?'
            r'\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|\d{4})?$',
            re.IGNORECASE,
        )
        processed_lines: list[str] = []
        for line in lines:
            m = _inline_edu_re.match(line.strip())
            if m and degree_re.search(line):
                institution_part = m.group(1).strip().strip(',').strip()
                degree_part = m.group(2).strip()
                year_raw = m.group(3)
                grad_year_inline: int | None = None
                if year_raw:
                    ym = year_re.search(year_raw)
                    if ym:
                        grad_year_inline = int(ym.group(0))
                # Parse degree + field
                in_m = re.search(r'\bin\b(.+)$', degree_part, re.IGNORECASE)
                if in_m:
                    field_part = in_m.group(1).strip()
                    deg_part = degree_part[: in_m.start()].strip()
                else:
                    deg_part = degree_part
                    field_part = ""
                if institution_part and deg_part:
                    entries.append(EducationEntry(
                        institution=institution_part,
                        degree=deg_part,
                        field=field_part,
                        graduation_year=grad_year_inline,
                    ))
                    continue
            processed_lines.append(line)
        lines = processed_lines

        if not lines and entries:
            return entries

        # First pass: parse pipe-separated entries
        # e.g. "MSc Airline & Airport Corporate Management | London Metropolitan University, UK | Jan 2025 – May 2026"
        remaining_lines: list[str] = []
        for line in lines:
            if _pipe_line.search(line) and degree_re.search(line):
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 2:
                    degree_part = parts[0].strip()
                    institution_part = parts[1].strip()
                    date_part = parts[2].strip() if len(parts) > 2 else ""

                    grad_year: int | None = None
                    if date_part:
                        _, end_str = self._parse_date_range(date_part)
                        year_m = year_re.search(end_str or date_part)
                        if year_m:
                            grad_year = int(year_m.group(0))
                        if grad_year is None:
                            year_m = year_re.search(date_part)
                            if year_m:
                                grad_year = int(year_m.group(0))

                    in_match = re.search(r"\bin\b([^,]+?)(?:\s+(?:at|from).*)?$", degree_part, re.IGNORECASE)
                    if in_match:
                        field = in_match.group(1).strip()
                        degree = degree_part[: in_match.start()].strip()
                    else:
                        degree = degree_part
                        field = ""

                    entries.append(EducationEntry(
                        institution=institution_part,
                        degree=degree,
                        field=field,
                        graduation_year=grad_year,
                    ))
                    continue
            # Skip metadata lines that follow a pipe-separated entry
            if _skip_re.search(line) and not degree_re.search(line):
                continue
            remaining_lines.append(line)

        if not remaining_lines:
            return entries

        # Second pass: handle "Degree, Institution, Year" single-line comma-separated format
        # e.g. "MSc Data Science, University of Edinburgh, 2017"
        _comma_edu_re = re.compile(
            r'^((?:bachelor|master|msc|bsc|phd|diploma|certificate|degree|beng|meng|mba|llb|llm)[^,|]*)'
            r',\s*([^,|]+(?:university|college|institute|school|academy|polytechnic)[^,|]*)'
            r'(?:,\s*(\d{4}))?',
            re.IGNORECASE,
        )
        new_remaining: list[str] = []
        for line in remaining_lines:
            if not degree_re.search(line) or _pipe_line.search(line):
                new_remaining.append(line)
                continue
            m = _comma_edu_re.match(line.strip())
            if m:
                degree_raw = m.group(1).strip()
                institution_raw = m.group(2).strip()
                year_raw = m.group(3)
                in_match = re.search(r'\bin\b([^,]+?)(?:\s+(?:at|from).*)?$', degree_raw, re.IGNORECASE)
                if in_match:
                    field = in_match.group(1).strip()
                    degree = degree_raw[: in_match.start()].strip()
                else:
                    degree = degree_raw
                    field = ""
                entries.append(EducationEntry(
                    institution=institution_raw,
                    degree=degree,
                    field=field,
                    graduation_year=int(year_raw) if year_raw else None,
                ))
            else:
                new_remaining.append(line)
        remaining_lines = new_remaining

        if not remaining_lines:
            return entries

        # Third pass: multi-line block parsing
        blocks: list[list[str]] = []
        current: list[str] = []

        for line in remaining_lines:
            if degree_re.search(line) and current and not degree_re.search(current[-1]):
                blocks.append(current)
                current = [line]
            else:
                current.append(line)
        if current:
            blocks.append(current)

        for block in blocks:
            if not block:
                continue

            content_lines = [l for l in block if not _skip_re.search(l)]
            if not content_lines:
                continue

            institution = ""
            degree = ""
            field = ""
            grad_year = None

            block_text = " ".join(block)
            year_m = year_re.search(block_text)
            if year_m:
                grad_year = int(year_m.group(0))

            degree_line_idx = next(
                (i for i, l in enumerate(content_lines) if degree_re.search(l)), None
            )

            if degree_line_idx is not None:
                degree_line = content_lines[degree_line_idx]
                if degree_line_idx > 0:
                    institution = content_lines[0]
                    degree_raw = degree_line
                else:
                    degree_raw = degree_line
                    institution = content_lines[1] if len(content_lines) > 1 else ""

                in_match = re.search(r"\bin\b([^,]+?)(?:\s+(?:at|from).*)?$", degree_raw, re.IGNORECASE)
                if in_match:
                    field = in_match.group(1).strip()
                    degree = degree_raw[: in_match.start()].strip()
                else:
                    degree = degree_raw
            else:
                institution = content_lines[0]
                degree = content_lines[1] if len(content_lines) > 1 else ""
                field = content_lines[2] if len(content_lines) > 2 else ""

            institution = year_re.sub("", institution).strip().strip("|,·").strip()
            degree = year_re.sub("", degree).strip().strip("|,·").strip()

            if institution or degree:
                entries.append(EducationEntry(
                    institution=institution,
                    degree=degree,
                    field=field,
                    graduation_year=grad_year,
                ))

        return entries

    def _parse_projects(self, text: str) -> list[ProjectEntry]:
        """Parse projects section text into ProjectEntry objects.

        Handles:
        - Pipe-separated: "Project Title | Context | Year"
        - Plain title line followed by bullet descriptions
        - Title lines that end with a period (description sentences) are skipped as titles
        """
        if not text.strip():
            return []

        entries: list[ProjectEntry] = []
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        _pipe_line = re.compile(r"\|")
        _date_in_line = re.compile(
            r"\b(\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*)\b",
            re.IGNORECASE,
        )

        current_name = ""
        current_desc_lines: list[str] = []

        def flush() -> None:
            nonlocal current_name, current_desc_lines
            if current_name:
                desc = " ".join(
                    _BULLET_RE.sub("", l).strip() for l in current_desc_lines
                )
                entries.append(ProjectEntry(
                    name=current_name,
                    description=desc,
                    skills_mentioned=self._extract_tech_terms(desc),
                ))
            current_name = ""
            current_desc_lines = []

        for line in lines:
            is_bullet = bool(_BULLET_RE.match(line))

            # Pipe-separated project header: "Title | Context | Year"
            if _pipe_line.search(line) and not is_bullet:
                parts = [p.strip() for p in line.split("|")]
                project_name = parts[0].strip()
                # Only treat as project if name looks like a title (not a sentence)
                if project_name and not project_name.endswith("."):
                    flush()
                    current_name = project_name
                    # Remaining parts become part of description context
                    context = " | ".join(parts[1:]).strip()
                    if context:
                        current_desc_lines = [context]
                    continue

            # Non-bullet, non-pipe line: potential project title
            if not is_bullet:
                # A title line: short enough, doesn't end with period
                is_title = len(line) <= 100 and not line.endswith(".")
                if is_title and current_name:
                    flush()
                    current_name = line
                elif not current_name:
                    current_name = line
                else:
                    current_desc_lines.append(line)
            else:
                current_desc_lines.append(line)

        flush()
        return entries

    def _extract_projects_from_experience(self, experience_text: str) -> list[ProjectEntry]:
        """Extract project entries from an experience section that mixes jobs and projects.

        Identifies entries that look like projects (research, independent work, named
        initiatives) rather than traditional employment, based on company/context keywords.
        """
        if not experience_text.strip():
            return []

        _project_signals = re.compile(
            r"\b(research|project|independent|initiative|study|analysis|"
            r"programme|program|simulation|design|development|investigation|"
            r"confidential|restricted)\b",
            re.IGNORECASE,
        )
        _employment_signals = re.compile(
            r"\b(ltd|llc|inc|corp|company|co\.|plc|gmbh|pvt|private|limited|"
            r"university|college|institute|school)\b",
            re.IGNORECASE,
        )

        # Re-parse the experience section to get all entries
        all_entries = self._parse_experience(experience_text)
        projects: list[ProjectEntry] = []

        for entry in all_entries:
            company_lower = entry.company.lower()
            # Classify as project if company/context contains project signals
            # and does NOT look like a real employer
            is_project = (
                _project_signals.search(entry.company)
                and not _employment_signals.search(entry.company)
            ) or _project_signals.search(entry.title)

            if is_project:
                desc = entry.description
                projects.append(ProjectEntry(
                    name=entry.title,
                    description=desc,
                    skills_mentioned=self._extract_tech_terms(desc),
                ))

        return projects

    def _extract_tech_terms(self, text: str) -> list[str]:
        """Extract technology names from free-form description text.

        Uses a general approach instead of a hardcoded domain-specific blocklist:
        - Tokens in _KNOWN_SKILLS always pass
        - Tokens matching tech patterns (digits, dots, +, #, or all-caps 2-5 chars) pass
        - Other tokens pass only if NOT in _COMMON_ENGLISH and pass _is_valid_skill_token
        """
        # Match: CamelCase words, words with dots/plus/hash, known abbreviations
        pattern = re.compile(
            r"\b([A-Z][a-zA-Z0-9+#.\-]{1,30}|[a-z]{2,}(?:\.[a-z]{2,})+)\b"
        )
        found: list[str] = []
        seen: set[str] = set()
        for m in pattern.finditer(text):
            token = m.group(0)
            token_lower = token.lower()

            # Always skip common English words
            if token_lower in _COMMON_ENGLISH:
                continue

            # Check if it's a known skill (case-insensitive)
            is_known = any(s.lower() == token_lower for s in _KNOWN_SKILLS)

            # Check if it matches a tech pattern: contains digits/dots/+/# or is all-caps 2-5 chars
            is_tech_pattern = (
                bool(re.search(r'[0-9+#.]', token))
                or (token.isupper() and 2 <= len(token) <= 5)
            )

            if is_known or is_tech_pattern or self._is_valid_skill_token(token):
                normalized = self._normalize_skill(token)
                key = normalized.lower()
                if key not in seen:
                    seen.add(key)
                    found.append(normalized)
        return found

    # ------------------------------------------------------------------
    # Formatting issue detection
    # ------------------------------------------------------------------

    def _parse_llm_experience_str(self, exp_str: str) -> tuple[str, str, str, str | None]:
        """Parse an LLM-returned experience string into (title, company, start, end).

        Handles formats like:
        - "Software Engineer at Google (2020 - 2022)"
        - "Data Analyst at DataCo (Mar 2018 - Dec 2019)"
        - "Research Assistant (2019)"
        - "Senior Developer at Acme"
        """
        title = exp_str.strip()
        company = ""
        start_date = ""
        end_date: str | None = None

        # Extract parenthetical date range: "... (Jan 2020 - Dec 2022)"
        paren_m = re.search(r"\(([^)]+)\)\s*$", title)
        if paren_m:
            date_str = paren_m.group(1).strip()
            start_date, end_date = self._parse_date_range(date_str)
            title = title[: paren_m.start()].strip()

        # Extract "at Company" from title
        at_m = re.match(r"^(.+?)\s+at\s+(.+)$", title, re.IGNORECASE)
        if at_m:
            title = at_m.group(1).strip()
            company = at_m.group(2).strip()

        return title, company, start_date, end_date

    def _parse_llm_education_str(self, edu_str: str) -> EducationEntry | None:
        """Parse an LLM-returned education string into an EducationEntry.

        Handles formats like:
        - "MSc Computer Science at University of Edinburgh (2020)"
        - "Bachelor of Science in Computer Science at Stanford (2019)"
        - "BEng Aerospace Engineering at LBRC College (2024)"
        """
        if not edu_str.strip():
            return None

        text = edu_str.strip()
        institution = ""
        degree = ""
        field = ""
        grad_year: int | None = None

        # Extract year from parentheses
        paren_m = re.search(r"\((\d{4})\)\s*$", text)
        if paren_m:
            grad_year = int(paren_m.group(1))
            text = text[: paren_m.start()].strip()

        # Extract "at Institution"
        at_m = re.search(r"\s+at\s+(.+)$", text, re.IGNORECASE)
        if at_m:
            institution = at_m.group(1).strip()
            text = text[: at_m.start()].strip()

        # Split degree and field on "in"
        in_m = re.search(r"\bin\b(.+)$", text, re.IGNORECASE)
        if in_m:
            field = in_m.group(1).strip()
            degree = text[: in_m.start()].strip()
        else:
            degree = text

        if not degree and not institution:
            return None

        return EducationEntry(
            institution=institution,
            degree=degree,
            field=field,
            graduation_year=grad_year,
        )

    def _detect_formatting_issues(self, raw_text: str) -> list[str]:
        """Detect ATS-unfriendly formatting patterns in raw text."""
        issues: list[str] = []
        # Tables: multiple tab-separated columns on the same line
        if re.search(r"(\t.+){3,}", raw_text):
            issues.append("table_detected")
        # Multi-column: many lines with large mid-line whitespace gaps
        multi_col_count = sum(
            1 for line in raw_text.splitlines()
            if re.search(r"\S {5,}\S", line) and len(line) > 40
        )
        if multi_col_count > 10:
            issues.append("multi_column_layout")
        # Headers/footers: very short repeated lines at top/bottom
        lines = raw_text.splitlines()
        if lines and len(lines[0].strip()) < 5 and len(lines) > 5:
            issues.append("possible_header_footer")
        return issues
