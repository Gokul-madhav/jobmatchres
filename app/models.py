"""
Shared data models for the AI Resume ATS Optimizer.

All dataclasses used across components are defined here to avoid circular
imports and provide a single source of truth for the domain model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Resume models
# ---------------------------------------------------------------------------

@dataclass
class ContactInfo:
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    location: Optional[str] = None


@dataclass
class ExperienceEntry:
    company: str
    title: str
    start_date: str
    end_date: Optional[str] = None  # None = "Present"
    description: str = ""
    skills_mentioned: list[str] = field(default_factory=list)


@dataclass
class EducationEntry:
    institution: str
    degree: str
    field: str
    graduation_year: Optional[int] = None


@dataclass
class ProjectEntry:
    name: str
    description: str
    skills_mentioned: list[str] = field(default_factory=list)


@dataclass
class ParsedResume:
    contact: ContactInfo
    skills: list[str]
    experience: list[ExperienceEntry]
    education: list[EducationEntry]
    projects: list[ProjectEntry]
    raw_text: str
    total_experience_years: float = 0.0
    summary: Optional[str] = None
    detected_sections: list[str] = field(default_factory=list)
    formatting_issues: list[str] = field(default_factory=list)
    achievements: list[str] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# JD models
# ---------------------------------------------------------------------------

@dataclass
class ParsedJD:
    required_skills: list[str]
    preferred_skills: list[str]
    keywords: list[str]
    raw_text: str
    min_experience_years: Optional[int] = None
    max_experience_years: Optional[int] = None


# ---------------------------------------------------------------------------
# Scoring models
# ---------------------------------------------------------------------------

@dataclass
class MatchResult:
    overall_score: float   # 0–100
    keyword_score: float   # 0–100
    semantic_score: float  # 0–100


@dataclass
class ATSSubScore:
    name: str
    raw_score: float           # 0–100
    weight: float
    weighted_contribution: float  # raw_score * weight


@dataclass
class ATSResult:
    overall_score: float       # 0–100
    sub_scores: list[ATSSubScore]


# ---------------------------------------------------------------------------
# Gap models
# ---------------------------------------------------------------------------

class GapType(str, Enum):
    MISSING_SKILL = "missing_skill"
    WEAK_SECTION = "weak_section"
    EXPERIENCE_GAP = "experience_gap"


class Severity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class GapItem:
    gap_type: GapType
    item: str
    severity: Severity


@dataclass
class GapReport:
    gaps: list[GapItem]
    has_gaps: bool


# ---------------------------------------------------------------------------
# Question / Answer models
# ---------------------------------------------------------------------------

@dataclass
class Question:
    id: str
    text: str
    target_gap: Optional[str] = None  # gap item reference
    is_fallback: bool = False


@dataclass
class QuestionAnswer:
    question_id: str
    answer_text: str


# ---------------------------------------------------------------------------
# Suggestion models
# ---------------------------------------------------------------------------

@dataclass
class Suggestion:
    id: str
    target_section: str
    suggested_change: str
    rationale: str
    gap_reference: Optional[str] = None
    approved: Optional[bool] = None  # None = pending


# ---------------------------------------------------------------------------
# Session model
# ---------------------------------------------------------------------------

@dataclass
class Session:
    session_id: str
    parsed_resume: ParsedResume
    parsed_jd: ParsedJD
    match_result: MatchResult
    ats_result: ATSResult
    gap_report: GapReport
    questions: list[Question] = field(default_factory=list)
    answers: list[QuestionAnswer] = field(default_factory=list)
    suggestions: list[Suggestion] = field(default_factory=list)
    download_url: Optional[str] = None
    created_at: str = ""
    expires_at: str = ""  # 24 hours after creation
