"""
ATSEngine — computes ATS score as a weighted sum of five sub-scores.

Sub-score weights:
  keyword             0.30
  semantic            0.20
  section_completeness 0.20
  formatting          0.15
  experience_match    0.15

Overall score = sum(raw_score * weight) for all sub-scores.

Design reference: Requirements 6.1–6.8, Properties 9–11.
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from app.models import ATSResult, ATSSubScore, ParsedJD, ParsedResume

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Standard sections recognised by the ATS engine
# ---------------------------------------------------------------------------

_STANDARD_SECTIONS = ("summary", "skills", "experience", "education", "projects")

# Formatting issue tokens produced by ResumeParser._detect_formatting_issues
# Each token maps to a point deduction from the formatting sub-score.
_FORMATTING_DEDUCTIONS: dict[str, float] = {
    "table_detected": 25.0,
    "image_detected": 20.0,
    "multi_column_detected": 20.0,
    "non_standard_font": 15.0,
    # Catch-all for any other issue token
    "__default__": 10.0,
}


class ATSEngine:
    """Compute ATS score as a weighted blend of five sub-scorers."""

    WEIGHTS: dict[str, float] = {
        "keyword": 0.30,
        "semantic": 0.20,
        "section_completeness": 0.20,
        "formatting": 0.15,
        "experience_match": 0.15,
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compute_ats(
        self,
        parsed_resume: ParsedResume,
        parsed_jd: ParsedJD,
        resume_embedding: np.ndarray,
        jd_embedding: np.ndarray,
    ) -> ATSResult:
        """Return an ATSResult with overall score and all five sub-scores.

        overall_score = sum(sub_score.weighted_contribution for all sub_scores)
        """
        raw_scores: dict[str, float] = {
            "keyword": self._keyword_score(parsed_resume, parsed_jd),
            "semantic": self._semantic_score(resume_embedding, jd_embedding),
            "section_completeness": self._section_completeness_score(parsed_resume),
            "formatting": self._formatting_score(parsed_resume),
            "experience_match": self._experience_match_score(parsed_resume, parsed_jd),
        }

        sub_scores: list[ATSSubScore] = []
        overall = 0.0
        for name, weight in self.WEIGHTS.items():
            raw = raw_scores[name]
            contribution = raw * weight
            sub_scores.append(
                ATSSubScore(
                    name=name,
                    raw_score=round(raw, 4),
                    weight=weight,
                    weighted_contribution=round(contribution, 4),
                )
            )
            overall += contribution

        return ATSResult(
            overall_score=round(overall, 4),
            sub_scores=sub_scores,
        )

    # ------------------------------------------------------------------
    # Sub-scorers
    # ------------------------------------------------------------------

    def _keyword_score(
        self,
        parsed_resume: ParsedResume,
        parsed_jd: ParsedJD,
    ) -> float:
        """Keyword overlap: |resume_skills ∩ required_skills| / |required_skills| × 100.

        Returns 0 when required_skills is empty.
        """
        required = parsed_jd.required_skills
        if not required:
            return 0.0
        resume_set = {s.lower().strip() for s in parsed_resume.skills}
        required_set = {s.lower().strip() for s in required}
        matched = len(resume_set & required_set)
        return (matched / len(required_set)) * 100.0

    def _semantic_score(
        self,
        resume_embedding: np.ndarray,
        jd_embedding: np.ndarray,
    ) -> float:
        """Cosine similarity between resume and JD embeddings, scaled to [0, 100]."""
        from app.components.embedding_engine import EmbeddingEngine

        engine = EmbeddingEngine()
        return engine.cosine_similarity(resume_embedding, jd_embedding) * 100.0

    def _section_completeness_score(self, parsed_resume: ParsedResume) -> float:
        """Award 20 points per present, non-empty standard section (max 100).

        Standard sections: summary, skills, experience, education, projects.
        A section is considered present when:
          - Its name appears in parsed_resume.detected_sections, AND
          - The corresponding field on ParsedResume is non-empty.
        """
        points_per_section = 100.0 / len(_STANDARD_SECTIONS)  # 20.0
        score = 0.0

        detected_lower = {s.lower() for s in parsed_resume.detected_sections}

        for section in _STANDARD_SECTIONS:
            present = section in detected_lower
            non_empty = self._section_is_non_empty(parsed_resume, section)
            if present and non_empty:
                score += points_per_section

        return min(score, 100.0)

    def _formatting_score(self, parsed_resume: ParsedResume) -> float:
        """Start at 100 and deduct for each ATS-unfriendly formatting issue.

        Issue tokens come from ParsedResume.formatting_issues (populated by
        ResumeParser._detect_formatting_issues).  Score is clamped to [0, 100].
        """
        score = 100.0
        for issue in parsed_resume.formatting_issues:
            deduction = _FORMATTING_DEDUCTIONS.get(
                issue.lower(), _FORMATTING_DEDUCTIONS["__default__"]
            )
            score -= deduction
        return max(score, 0.0)

    def _experience_match_score(
        self,
        parsed_resume: ParsedResume,
        parsed_jd: ParsedJD,
    ) -> float:
        """Compare resume total_experience_years against JD min/max range.

        Scoring logic:
          - No JD experience requirement → 100 (no penalty)
          - resume_years >= max_years (or only min set and resume >= min) → 100
          - resume_years in [min, max] → 100
          - resume_years < min → proportional score: (resume_years / min) * 100
            clamped to [0, 100]
        """
        resume_years: float = parsed_resume.total_experience_years
        min_years: Optional[int] = parsed_jd.min_experience_years
        max_years: Optional[int] = parsed_jd.max_experience_years

        # No requirement specified → full score
        if min_years is None and max_years is None:
            return 100.0

        # Determine effective minimum (default 0 if only max is set)
        effective_min = float(min_years) if min_years is not None else 0.0
        effective_max = float(max_years) if max_years is not None else float("inf")

        if resume_years >= effective_min:
            # Within or above range → full score
            return 100.0

        # Below minimum → proportional score
        if effective_min == 0:
            return 100.0

        return max((resume_years / effective_min) * 100.0, 0.0)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _section_is_non_empty(parsed_resume: ParsedResume, section: str) -> bool:
        """Return True when the section field on ParsedResume has content."""
        if section == "summary":
            return bool(parsed_resume.summary and parsed_resume.summary.strip())
        if section == "skills":
            return bool(parsed_resume.skills)
        if section == "experience":
            return bool(parsed_resume.experience)
        if section == "education":
            return bool(parsed_resume.education)
        if section == "projects":
            return bool(parsed_resume.projects)
        return False
