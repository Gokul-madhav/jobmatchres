"""
GapDetector — identifies missing skills, weak sections, and experience gaps.

Compares a ParsedResume against a ParsedJD and returns a GapReport containing
GapItem entries for each detected gap, each with a type, item name, and severity.

Severity assignment:
  - MISSING required skill  → HIGH
  - MISSING preferred skill → LOW
  - WEAK section            → MEDIUM
  - EXPERIENCE gap          → HIGH

Design reference: Requirements 7.1–7.5, 2.5, Properties 12–13.
"""
from __future__ import annotations

import logging

from app.models import (
    GapItem,
    GapReport,
    GapType,
    ParsedJD,
    ParsedResume,
    Severity,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds (per design doc)
# ---------------------------------------------------------------------------

WEAK_SECTION_MIN_SKILLS: int = 5
WEAK_SECTION_MIN_EXPERIENCE_ENTRIES: int = 2

# Standard sections checked for weak-section detection.
# Each entry maps a section name (as it appears in ParsedResume.detected_sections)
# to a human-readable label used in GapItem.item.
_STANDARD_SECTIONS: dict[str, str] = {
    "summary": "Summary",
    "skills": "Skills",
    "experience": "Work Experience",
    "education": "Education",
    "projects": "Projects",
}


class GapDetector:
    """Detect skill, section, and experience gaps between a resume and a JD."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, parsed_resume: ParsedResume, parsed_jd: ParsedJD) -> GapReport:
        """Return a GapReport for the given resume/JD pair.

        Runs three detection passes in order:
          1. Missing required skills (HIGH severity)
          2. Missing preferred skills (LOW severity)
          3. Weak sections (MEDIUM severity)
          4. Experience gap (HIGH severity)
        """
        gaps: list[GapItem] = []

        gaps.extend(self._detect_missing_skills(parsed_resume, parsed_jd))
        gaps.extend(self._detect_weak_sections(parsed_resume))
        gap = self._detect_experience_gap(parsed_resume, parsed_jd)
        if gap is not None:
            gaps.append(gap)

        logger.debug(
            "GapDetector: %d gaps found (%d high, %d medium, %d low)",
            len(gaps),
            sum(1 for g in gaps if g.severity == Severity.HIGH),
            sum(1 for g in gaps if g.severity == Severity.MEDIUM),
            sum(1 for g in gaps if g.severity == Severity.LOW),
        )

        return GapReport(gaps=gaps, has_gaps=bool(gaps))

    # ------------------------------------------------------------------
    # Pass 1 & 2: Missing skills
    # ------------------------------------------------------------------

    def _detect_missing_skills(
        self,
        parsed_resume: ParsedResume,
        parsed_jd: ParsedJD,
    ) -> list[GapItem]:
        """Return GapItems for every required/preferred skill absent from the resume.

        Skill comparison is case-insensitive and strip-normalised.
        Required skills → HIGH severity.
        Preferred skills → LOW severity.
        """
        resume_skill_keys: set[str] = {
            s.lower().strip() for s in parsed_resume.skills if s.strip()
        }

        gaps: list[GapItem] = []

        # Required skills — HIGH severity
        for skill in parsed_jd.required_skills:
            if not skill.strip():
                continue
            if skill.lower().strip() not in resume_skill_keys:
                gaps.append(
                    GapItem(
                        gap_type=GapType.MISSING_SKILL,
                        item=skill.strip(),
                        severity=Severity.HIGH,
                    )
                )

        # Preferred skills — LOW severity (only if not already flagged as required)
        required_keys: set[str] = {
            s.lower().strip() for s in parsed_jd.required_skills if s.strip()
        }
        for skill in parsed_jd.preferred_skills:
            if not skill.strip():
                continue
            key = skill.lower().strip()
            # Skip if already in resume or already flagged as a required gap
            if key in resume_skill_keys:
                continue
            if key in required_keys:
                continue
            gaps.append(
                GapItem(
                    gap_type=GapType.MISSING_SKILL,
                    item=skill.strip(),
                    severity=Severity.LOW,
                )
            )

        return gaps

    # ------------------------------------------------------------------
    # Pass 3: Weak sections
    # ------------------------------------------------------------------

    def _detect_weak_sections(self, parsed_resume: ParsedResume) -> list[GapItem]:
        """Return GapItems for standard sections that are present but below threshold.

        A section is "weak" when it is detected (present in detected_sections)
        but its content falls below the minimum threshold:
          - skills:     fewer than WEAK_SECTION_MIN_SKILLS items
          - experience: fewer than WEAK_SECTION_MIN_EXPERIENCE_ENTRIES entries
          - education:  fewer than 1 entry (any education entry counts)
          - projects:   fewer than 1 entry
          - summary:    empty or whitespace-only string

        Absent sections (not in detected_sections) are NOT flagged here —
        that is handled by Requirement 2.5 / Gap_Detector missing-section logic.
        """
        detected_lower: set[str] = {
            s.lower().strip() for s in parsed_resume.detected_sections
        }
        gaps: list[GapItem] = []

        for section_key, section_label in _STANDARD_SECTIONS.items():
            if section_key not in detected_lower:
                # Section is absent — not a "weak section" gap (it's simply missing)
                continue

            weak = self._is_section_weak(parsed_resume, section_key)
            if weak:
                gaps.append(
                    GapItem(
                        gap_type=GapType.WEAK_SECTION,
                        item=section_label,
                        severity=Severity.MEDIUM,
                    )
                )

        return gaps

    def _is_section_weak(self, parsed_resume: ParsedResume, section: str) -> bool:
        """Return True when the section is present but below its content threshold."""
        if section == "skills":
            return len(parsed_resume.skills) < WEAK_SECTION_MIN_SKILLS
        if section == "experience":
            return len(parsed_resume.experience) < WEAK_SECTION_MIN_EXPERIENCE_ENTRIES
        if section == "education":
            return len(parsed_resume.education) < 1
        if section == "projects":
            return len(parsed_resume.projects) < 1
        if section == "summary":
            return not (parsed_resume.summary and parsed_resume.summary.strip())
        return False

    # ------------------------------------------------------------------
    # Pass 4: Experience gap
    # ------------------------------------------------------------------

    def _detect_experience_gap(
        self,
        parsed_resume: ParsedResume,
        parsed_jd: ParsedJD,
    ) -> GapItem | None:
        """Return a HIGH-severity GapItem when resume years < JD minimum, else None."""
        min_years = parsed_jd.min_experience_years
        if min_years is None:
            return None

        resume_years = parsed_resume.total_experience_years
        if resume_years < float(min_years):
            shortfall = round(float(min_years) - resume_years, 1)
            item = (
                f"Experience gap: {resume_years:.1f} yrs found, "
                f"{min_years}+ yrs required (shortfall: {shortfall} yrs)"
            )
            return GapItem(
                gap_type=GapType.EXPERIENCE_GAP,
                item=item,
                severity=Severity.HIGH,
            )

        return None
