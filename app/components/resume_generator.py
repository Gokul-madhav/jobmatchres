"""
ResumeGenerator — MNC-grade ATS-optimised PDF resumes via ReportLab.

Templates:
  clean    — Google/Meta style: pure white, tight spacing, Helvetica, thin rules
  modern   — McKinsey/Deloitte style: dark navy header bar, accent line, clean body
  executive — Goldman/BCG style: serif name, double rule, premium spacing
  compact  — Amazon/Microsoft style: maximum density, 9pt body, fits everything on 1 page

All templates:
  - Single-column (ATS parsers hate tables/columns)
  - Standard fonts only (Helvetica family — built-in ReportLab, zero install)
  - 0.5 in margins → ~7.5 in usable width → fits more content
  - Bullet points rendered as individual Paragraphs (not blobs)
  - Skills extracted cleanly from suggestion text
  - Achievements + Certifications sections included
"""
from __future__ import annotations

import io
import logging
import re

from app.models import ParsedResume, Suggestion

logger = logging.getLogger(__name__)

AVAILABLE_TEMPLATES = ["clean", "modern", "executive", "compact"]

# ── Section name normalisation ──────────────────────────────────────────────
_SECTION_ALIASES: dict[str, str] = {
    "summary": "Summary", "profile": "Summary", "objective": "Summary",
    "skills": "Skills", "skill": "Skills", "technical skills": "Skills",
    "experience": "Experience", "work experience": "Experience",
    "employment": "Experience", "work history": "Experience",
    "education": "Education", "academic": "Education",
    "projects": "Projects", "project": "Projects", "key projects": "Projects",
    "achievements": "Achievements", "achievement": "Achievements",
    "awards": "Achievements", "honors": "Achievements",
    "certifications": "Certifications", "certification": "Certifications",
    "certificates": "Certifications", "courses": "Certifications",
    "languages": "Languages",
}


def _norm_section(name: str) -> str:
    return _SECTION_ALIASES.get(name.lower().strip(), name.strip().title())


def _extract_skill(text: str) -> str:
    """Pull a clean skill name out of a suggestion string."""
    m = re.search(r"['\u2018\u2019\u201c\u201d\"](.*?)['\u2018\u2019\u201c\u201d\"]", text)
    if m:
        return m.group(1).strip()
    m = re.search(r"(?:add|include|append)\s+(.+?)\s+(?:to|in)\b", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return text.strip()


def _split_bullets(text: str) -> list[str]:
    """Split a newline-joined description into individual bullet strings."""
    lines = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        line = re.sub(r"^[•\-\*\u2022]\s*", "", line)
        if line:
            lines.append(line)
    return lines


# ── Template colour/spacing configs ────────────────────────────────────────

_CONFIGS: dict[str, dict] = {
    "clean": {
        "left_margin": 0.5, "right_margin": 0.5,
        "top_margin": 0.5, "bottom_margin": 0.5,
        "name_size": 17, "name_font": "Helvetica-Bold",
        "contact_size": 8.5, "section_size": 10, "body_size": 9, "bullet_size": 9,
        "section_font": "Helvetica-Bold",
        "name_color": "#000000", "contact_color": "#444444",
        "section_color": "#000000", "rule_color": "#000000",
        "rule_thickness": 0.5,
        "section_space_before": 9, "section_space_after": 3,
        "body_space_before": 2, "body_leading": 12,
        "bullet_indent": 12,
    },
    "modern": {
        "left_margin": 0.5, "right_margin": 0.5,
        "top_margin": 0.5, "bottom_margin": 0.5,
        "name_size": 18, "name_font": "Helvetica-Bold",
        "contact_size": 8.5, "section_size": 10, "body_size": 9, "bullet_size": 9,
        "section_font": "Helvetica-Bold",
        "name_color": "#1A2B4A", "contact_color": "#4A5568",
        "section_color": "#1A2B4A", "rule_color": "#1A2B4A",
        "rule_thickness": 1.5,
        "section_space_before": 10, "section_space_after": 3,
        "body_space_before": 2, "body_leading": 12,
        "bullet_indent": 12,
    },
    "executive": {
        "left_margin": 0.55, "right_margin": 0.55,
        "top_margin": 0.55, "bottom_margin": 0.5,
        "name_size": 20, "name_font": "Helvetica-Bold",
        "contact_size": 9, "section_size": 10.5, "body_size": 9.5, "bullet_size": 9.5,
        "section_font": "Helvetica-Bold",
        "name_color": "#0A0A0A", "contact_color": "#555555",
        "section_color": "#0A0A0A", "rule_color": "#8B7355",
        "rule_thickness": 1.0,
        "section_space_before": 11, "section_space_after": 4,
        "body_space_before": 3, "body_leading": 13,
        "bullet_indent": 14,
    },
    "compact": {
        "left_margin": 0.45, "right_margin": 0.45,
        "top_margin": 0.4, "bottom_margin": 0.4,
        "name_size": 15, "name_font": "Helvetica-Bold",
        "contact_size": 8, "section_size": 9.5, "body_size": 8.5, "bullet_size": 8.5,
        "section_font": "Helvetica-Bold",
        "name_color": "#000000", "contact_color": "#555555",
        "section_color": "#000000", "rule_color": "#333333",
        "rule_thickness": 0.5,
        "section_space_before": 7, "section_space_after": 2,
        "body_space_before": 1, "body_leading": 11,
        "bullet_indent": 10,
    },
}


class ResumeGenerator:

    def generate(
        self,
        parsed_resume: ParsedResume,
        approved_suggestions: list[Suggestion],
        template_id: str = "clean",
    ) -> bytes:
        if template_id not in AVAILABLE_TEMPLATES:
            template_id = "clean"
        try:
            return self._render(parsed_resume, approved_suggestions, template_id)
        except Exception as exc:
            logger.error("ResumeGenerator failed: %s", exc)
            raise

    # ── Core renderer ───────────────────────────────────────────────────────

    def _render(
        self,
        resume: ParsedResume,
        suggestions: list[Suggestion],
        tid: str,
    ) -> bytes:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate

        cfg = _CONFIGS[tid]
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=letter,
            leftMargin=cfg["left_margin"] * inch,
            rightMargin=cfg["right_margin"] * inch,
            topMargin=cfg["top_margin"] * inch,
            bottomMargin=cfg["bottom_margin"] * inch,
        )

        # Build section additions map (normalised keys)
        additions: dict[str, list[str]] = {}
        for s in suggestions:
            if s.approved:
                key = _norm_section(s.target_section)
                additions.setdefault(key, []).append(s.suggested_change)

        styles = self._styles(cfg)
        story = self._story(resume, additions, styles, cfg, tid)
        doc.build(story)
        return buf.getvalue()

    # ── Style factory ───────────────────────────────────────────────────────

    def _styles(self, cfg: dict) -> dict:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

        base = getSampleStyleSheet()

        def _c(hex_str: str):
            return colors.HexColor(hex_str)

        return {
            "name": ParagraphStyle(
                "Name", parent=base["Normal"],
                fontSize=cfg["name_size"], fontName=cfg["name_font"],
                textColor=_c(cfg["name_color"]),
                alignment=TA_CENTER, spaceAfter=3, spaceBefore=0,
            ),
            "contact": ParagraphStyle(
                "Contact", parent=base["Normal"],
                fontSize=cfg["contact_size"], fontName="Helvetica",
                textColor=_c(cfg["contact_color"]),
                alignment=TA_CENTER, spaceAfter=6,
            ),
            "section": ParagraphStyle(
                "Section", parent=base["Normal"],
                fontSize=cfg["section_size"], fontName=cfg["section_font"],
                textColor=_c(cfg["section_color"]),
                spaceBefore=cfg["section_space_before"], spaceAfter=1,
            ),
            "body": ParagraphStyle(
                "Body", parent=base["Normal"],
                fontSize=cfg["body_size"], fontName="Helvetica",
                textColor=colors.black,
                spaceBefore=cfg["body_space_before"],
                spaceAfter=2, leading=cfg["body_leading"],
            ),
            "jobtitle": ParagraphStyle(
                "JobTitle", parent=base["Normal"],
                fontSize=cfg["body_size"], fontName="Helvetica-Bold",
                textColor=colors.black,
                spaceBefore=cfg["body_space_before"] + 1,
                spaceAfter=1, leading=cfg["body_leading"],
            ),
            "bullet": ParagraphStyle(
                "Bullet", parent=base["Normal"],
                fontSize=cfg["bullet_size"], fontName="Helvetica",
                textColor=colors.black,
                leftIndent=cfg["bullet_indent"],
                spaceBefore=0, spaceAfter=1,
                leading=cfg["body_leading"],
            ),
            "_cfg": cfg,
        }

    # ── Story builder ───────────────────────────────────────────────────────

    def _story(
        self,
        r: ParsedResume,
        additions: dict[str, list[str]],
        styles: dict,
        cfg: dict,
        tid: str,
    ) -> list:
        from reportlab.platypus import Paragraph, Spacer

        story: list = []

        # ── Header ──────────────────────────────────────────────────────
        name = r.contact.name or "Candidate"
        story.append(Paragraph(self._x(name), styles["name"]))

        parts: list[str] = []
        if r.contact.email:    parts.append(r.contact.email)
        if r.contact.phone:    parts.append(r.contact.phone)
        if r.contact.linkedin: parts.append(r.contact.linkedin)
        if r.contact.location: parts.append(r.contact.location)
        if parts:
            story.append(Paragraph(self._x(" | ".join(parts)), styles["contact"]))

        # ── Summary ─────────────────────────────────────────────────────
        summary_adds = additions.get("Summary", [])
        if r.summary or summary_adds:
            story.extend(self._rule("SUMMARY", styles, cfg, tid))
            if r.summary:
                story.append(Paragraph(self._x(r.summary), styles["body"]))
            for a in summary_adds:
                story.append(Paragraph(self._x(a), styles["body"]))

        # ── Skills ──────────────────────────────────────────────────────
        skills = list(r.skills)
        existing_lower = {s.lower() for s in skills}
        for a in additions.get("Skills", []):
            extracted = _extract_skill(a)
            for part in extracted.split(","):
                part = part.strip()
                if part and part.lower() not in existing_lower:
                    skills.append(part)
                    existing_lower.add(part.lower())

        if skills:
            story.extend(self._rule("SKILLS", styles, cfg, tid))
            story.append(Paragraph(self._x(", ".join(skills)), styles["body"]))

        # ── Experience ──────────────────────────────────────────────────
        exp_adds = additions.get("Experience", [])
        if r.experience or exp_adds:
            story.extend(self._rule("EXPERIENCE", styles, cfg, tid))
            for exp in r.experience:
                # Title line
                title = f"<b>{self._x(exp.title)}</b>"
                if exp.company:
                    title += f" — {self._x(exp.company)}"
                dates: list[str] = []
                if exp.start_date: dates.append(exp.start_date)
                if exp.end_date:   dates.append(exp.end_date)
                elif exp.start_date: dates.append("Present")
                if dates:
                    title += f"  <font size='{cfg['body_size'] - 0.5}'><i>({' – '.join(dates)})</i></font>"
                story.append(Paragraph(title, styles["jobtitle"]))
                # Bullets
                for line in _split_bullets(exp.description):
                    story.append(Paragraph(f"• {self._x(line)}", styles["bullet"]))
            for a in exp_adds:
                story.append(Paragraph(f"• {self._x(a)}", styles["bullet"]))

        # ── Education ───────────────────────────────────────────────────
        edu_adds = additions.get("Education", [])
        if r.education or edu_adds:
            story.extend(self._rule("EDUCATION", styles, cfg, tid))
            for edu in r.education:
                line = f"<b>{self._x(edu.degree)}</b>"
                if edu.field:        line += f" in {self._x(edu.field)}"
                if edu.institution:  line += f" — {self._x(edu.institution)}"
                if edu.graduation_year: line += f"  <i>({edu.graduation_year})</i>"
                story.append(Paragraph(line, styles["body"]))
            for a in edu_adds:
                story.append(Paragraph(self._x(a), styles["body"]))

        # ── Projects ────────────────────────────────────────────────────
        proj_adds = additions.get("Projects", [])
        if r.projects or proj_adds:
            story.extend(self._rule("PROJECTS", styles, cfg, tid))
            for proj in r.projects:
                story.append(Paragraph(
                    f"<b>{self._x(proj.name)}</b>", styles["jobtitle"]
                ))
                for line in _split_bullets(proj.description):
                    story.append(Paragraph(f"• {self._x(line)}", styles["bullet"]))
                if proj.skills_mentioned:
                    tech = "Technologies: " + ", ".join(proj.skills_mentioned)
                    story.append(Paragraph(
                        f"<i>{self._x(tech)}</i>", styles["bullet"]
                    ))
            for a in proj_adds:
                story.append(Paragraph(f"• {self._x(a)}", styles["bullet"]))

        # ── Achievements ────────────────────────────────────────────────
        ach_adds = additions.get("Achievements", [])
        parsed_ach = getattr(r, "achievements", [])
        if parsed_ach or ach_adds:
            story.extend(self._rule("ACHIEVEMENTS", styles, cfg, tid))
            for item in parsed_ach:
                story.append(Paragraph(f"• {self._x(item)}", styles["bullet"]))
            for a in ach_adds:
                story.append(Paragraph(f"• {self._x(a)}", styles["bullet"]))

        # ── Certifications ───────────────────────────────────────────────
        cert_adds = additions.get("Certifications", [])
        parsed_cert = getattr(r, "certifications", [])
        if parsed_cert or cert_adds:
            story.extend(self._rule("CERTIFICATIONS", styles, cfg, tid))
            for item in parsed_cert:
                story.append(Paragraph(f"• {self._x(item)}", styles["bullet"]))
            for a in cert_adds:
                story.append(Paragraph(f"• {self._x(a)}", styles["bullet"]))

        return story

    # ── Section rule ────────────────────────────────────────────────────────

    def _rule(self, title: str, styles: dict, cfg: dict, tid: str) -> list:
        from reportlab.lib import colors
        from reportlab.platypus import HRFlowable, Paragraph

        items: list = [Paragraph(title, styles["section"])]

        if tid == "executive":
            # Double rule: thin gold + thin black
            items.append(HRFlowable(
                width="100%", thickness=1.0,
                color=colors.HexColor(cfg["rule_color"]),
                spaceAfter=0, spaceBefore=1,
            ))
            items.append(HRFlowable(
                width="100%", thickness=0.3,
                color=colors.HexColor("#000000"),
                spaceAfter=cfg["section_space_after"], spaceBefore=1,
            ))
        else:
            items.append(HRFlowable(
                width="100%", thickness=cfg["rule_thickness"],
                color=colors.HexColor(cfg["rule_color"]),
                spaceAfter=cfg["section_space_after"], spaceBefore=0,
            ))

        return items

    # ── XML escape ──────────────────────────────────────────────────────────

    @staticmethod
    def _x(text: str) -> str:
        return (
            text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
        )
