"""
Session API router — EPIC 9 endpoints.

POST   /api/v1/sessions                              — create session (upload + score)
GET    /api/v1/sessions/{session_id}/questions       — generate questions
POST   /api/v1/sessions/{session_id}/answers         — submit answers + generate suggestions
POST   /api/v1/sessions/{session_id}/suggestions/approve — approve/reject suggestions
POST   /api/v1/sessions/{session_id}/generate        — generate PDF resume
GET    /api/v1/sessions/{session_id}/download        — redirect to download URL

Design reference: Requirements 1.1, 1.3, 1.4, 3.1, 3.5, 5.1, 6.1, 7.1,
                  8.1, 8.4, 8.6, 9.1–9.6, 10.1, 10.3, 10.4, 10.6, 12.1, 12.4
"""
from __future__ import annotations

import asyncio
import dataclasses
import datetime
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse

from app.cache import get_session, set_session
from app.config import settings
from app.errors import AppError, ErrorCode
from app.models import (
    GapReport,
    ParsedJD,
    ParsedResume,
    Question,
    QuestionAnswer,
    Session,
    Suggestion,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sessions"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _file_extension(filename: str) -> str:
    _, ext = os.path.splitext(filename.lower())
    return ext


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat() + "Z"


def _expires_iso(ttl_seconds: int = 86400) -> str:
    return (
        datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl_seconds)
    ).isoformat() + "Z"


def _load_session_or_404(session_id: str) -> Session:
    """Load a session from Redis or raise SESSION_NOT_FOUND."""
    session = get_session(session_id)
    if session is None:
        raise AppError(ErrorCode.SESSION_NOT_FOUND)
    return session


# ---------------------------------------------------------------------------
# File text extraction + experience parsing helpers
# ---------------------------------------------------------------------------

def _extract_raw_text(file_bytes: bytes, file_type: str) -> str:
    """Extract plain text from PDF or DOCX — no parsing, just text."""
    if file_type == "pdf":
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        import re
        raw = "\n".join(pages)
        raw = re.sub(r'\n{3,}', '\n\n', raw)
        return raw.strip()
    else:
        import io
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs).strip()


def _parse_year(year_str: str) -> Optional[int]:
    """Parse a year string like '2022', '2022-2024', 'Expected 2025' → int or None."""
    import re
    if not year_str:
        return None
    m = re.search(r'\b(20\d{2}|19\d{2})\b', year_str)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def _parse_min_exp(exp_str: str) -> Optional[int]:
    """Parse '3-5 years' → 3, '5+ years' → 5, '2 years' → 2."""
    import re
    if not exp_str:
        return None
    m = re.search(r'(\d+)', exp_str)
    return int(m.group(1)) if m else None


def _parse_max_exp(exp_str: str) -> Optional[int]:
    """Parse '3-5 years' → 5, '5+ years' → None, '2 years' → 2."""
    import re
    if not exp_str:
        return None
    m = re.search(r'(\d+)\s*[-–]\s*(\d+)', exp_str)
    if m:
        return int(m.group(2))
    # Single number — use as both min and max
    m2 = re.search(r'(\d+)', exp_str)
    return int(m2.group(1)) if m2 else None


# ---------------------------------------------------------------------------
# POST /sessions — create session
# ---------------------------------------------------------------------------

@router.post("/sessions")
async def create_session(request: Request) -> JSONResponse:
    """
    Upload a resume file and job description text, run the full scoring pipeline,
    and return a session_id with match_result, ats_result, and gap_report.

    Validates:
      - resume_file: PDF or DOCX, max 5 MB
      - jd_text: minimum 50 characters
    """
    # --- Parse multipart form ---
    form = await request.form()
    resume_file: Optional[UploadFile] = form.get("resume_file")  # type: ignore[assignment]
    jd_text: str = str(form.get("jd_text", "")).strip()

    # --- Validate jd_text ---
    if len(jd_text) < 50:
        raise AppError(
            ErrorCode.JD_TOO_SHORT,
            details={"field": "jd_text", "min_length": 50, "actual_length": len(jd_text)},
        )

    # --- Validate resume_file ---
    if resume_file is None:
        raise AppError(
            ErrorCode.UNSUPPORTED_FORMAT,
            message="No resume file uploaded.",
            details={"field": "resume_file"},
        )

    filename = resume_file.filename or ""
    ext = _file_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError(
            ErrorCode.UNSUPPORTED_FORMAT,
            details={"field": "resume_file", "filename": filename, "allowed": list(ALLOWED_EXTENSIONS)},
        )

    file_bytes = await resume_file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise AppError(
            ErrorCode.FILE_TOO_LARGE,
            details={
                "field": "resume_file",
                "max_bytes": settings.max_file_size_bytes,
                "actual_bytes": len(file_bytes),
            },
        )

    file_type = "pdf" if ext == ".pdf" else "docx"

    # --- Run blocking pipeline in thread pool ---
    loop = asyncio.get_event_loop()

    def _run_pipeline() -> Session:
        from app.components.embedding_engine import EmbeddingEngine
        from app.components.matching_engine import MatchingEngine
        from app.components.ats_engine import ATSEngine
        from app.components.gap_detector import GapDetector

        # ── 1. Extract raw text from file ──────────────────────────────────
        try:
            raw_text = _extract_raw_text(file_bytes, file_type)
        except Exception as exc:
            raise AppError(ErrorCode.PARSE_FAILURE, f"Text extraction failed: {exc}") from exc

        if not raw_text.strip():
            raise AppError(ErrorCode.PARSE_FAILURE, "Could not extract text from the uploaded file.")

        # ── 2 & 3. Run ResumeAgent + JDAgent in parallel ─────────────────
        import concurrent.futures as _cf

        def _run_resume_agent() -> "ParsedResume":
            from app.components.resume_agent import ResumeAgent
            from app.models import ContactInfo, ExperienceEntry, EducationEntry, ProjectEntry

            try:
                agent = ResumeAgent(
                    api_key=settings.openai_api_key,
                    model=settings.parser_recovery_model,
                    timeout=max(settings.parser_recovery_timeout_seconds, 60),
                )
                ar = agent.extract(raw_text)
            except AppError:
                raise
            except Exception as exc:
                raise AppError(ErrorCode.PARSE_FAILURE, f"Resume agent failed: {exc}") from exc

            experience_entries: list[ExperienceEntry] = [
                ExperienceEntry(
                    company=e.company,
                    title=e.title,
                    start_date=e.start_date,
                    end_date=e.end_date or "",
                    description="\n".join(e.description) if e.description else "",
                    skills_mentioned=[],
                )
                for e in ar.experience
            ]
            education_entries: list[EducationEntry] = [
                EducationEntry(
                    institution=e.institution,
                    degree=e.degree,
                    field=e.field,
                    graduation_year=_parse_year(e.year),
                )
                for e in ar.education
            ]
            project_entries: list[ProjectEntry] = [
                ProjectEntry(
                    name=p.name,
                    description="\n".join(p.description) if p.description else "",
                    skills_mentioned=p.technologies,
                )
                for p in ar.projects
            ]
            detected_sections: list[str] = []
            if ar.summary:       detected_sections.append("summary")
            if ar.skills:        detected_sections.append("skills")
            if ar.experience:    detected_sections.append("experience")
            if ar.education:     detected_sections.append("education")
            if ar.projects:      detected_sections.append("projects")
            if ar.achievements:  detected_sections.append("achievements")
            if ar.certifications: detected_sections.append("certifications")

            return ParsedResume(
                contact=ContactInfo(
                    name=ar.contact.name,
                    email=ar.contact.email or None,
                    phone=ar.contact.phone or None,
                    linkedin=ar.contact.linkedin or None,
                    location=ar.contact.location or None,
                ),
                skills=ar.skills,
                experience=experience_entries,
                education=education_entries,
                projects=project_entries,
                raw_text=ar.raw_text,
                total_experience_years=ar.total_experience_years,
                summary=ar.summary or None,
                detected_sections=detected_sections,
                formatting_issues=[],
                achievements=ar.achievements,
                certifications=ar.certifications,
                languages=ar.languages,
            )

        def _run_jd_agent() -> "ParsedJD":
            from app.components.jd_agent import JDAgent

            try:
                jd_agent = JDAgent(
                    api_key=settings.openai_api_key,
                    model=settings.parser_recovery_model,
                    timeout=max(settings.parser_recovery_timeout_seconds, 60),
                )
                jr = jd_agent.extract(jd_text)
            except Exception as exc:
                raise AppError(ErrorCode.PARSE_FAILURE, f"JD agent failed: {exc}") from exc

            all_required = list(dict.fromkeys(jr.required_skills + jr.tools))
            return ParsedJD(
                required_skills=all_required,
                preferred_skills=jr.preferred_skills,
                keywords=jr.keywords,
                raw_text=jr.raw_text,
                min_experience_years=_parse_min_exp(jr.experience_required),
                max_experience_years=_parse_max_exp(jr.experience_required),
            )

        # Fire both agents concurrently
        with _cf.ThreadPoolExecutor(max_workers=2) as pool:
            future_resume = pool.submit(_run_resume_agent)
            future_jd = pool.submit(_run_jd_agent)
            # Raise immediately if either fails
            parsed_resume: ParsedResume = future_resume.result()
            parsed_jd: ParsedJD = future_jd.result()

        # ── 4. Embed resume and JD ────────────────────────────────────────
        engine = EmbeddingEngine()
        resume_text = parsed_resume.raw_text or " ".join(parsed_resume.skills)
        jd_text_for_embed = parsed_jd.raw_text or " ".join(parsed_jd.required_skills)
        resume_embedding = engine.embed(resume_text)
        jd_embedding = engine.embed(jd_text_for_embed)

        # ── 5. Compute match ──────────────────────────────────────────────
        match_result = MatchingEngine().compute_match(
            parsed_resume.skills,
            parsed_jd.required_skills,
            resume_embedding,
            jd_embedding,
        )

        # ── 6. Compute ATS score ──────────────────────────────────────────
        ats_result = ATSEngine().compute_ats(
            parsed_resume, parsed_jd, resume_embedding, jd_embedding
        )

        # ── 7. Detect gaps ────────────────────────────────────────────────
        gap_report = GapDetector().detect(parsed_resume, parsed_jd)

        # 7. Build and store session
        session_id = str(uuid.uuid4())
        now = _now_iso()
        expires = _expires_iso(settings.session_ttl_seconds)

        session = Session(
            session_id=session_id,
            parsed_resume=parsed_resume,
            parsed_jd=parsed_jd,
            match_result=match_result,
            ats_result=ats_result,
            gap_report=gap_report,
            created_at=now,
            expires_at=expires,
        )
        set_session(session, ttl_seconds=settings.session_ttl_seconds)
        return session

    with ThreadPoolExecutor(max_workers=1) as executor:
        session = await loop.run_in_executor(executor, _run_pipeline)

    return JSONResponse(
        status_code=201,
        content={
            "session_id": session.session_id,
            "match_result": dataclasses.asdict(session.match_result),
            "ats_result": dataclasses.asdict(session.ats_result),
            "gap_report": dataclasses.asdict(session.gap_report),
            "created_at": session.created_at,
            "expires_at": session.expires_at,
        },
    )


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}/questions — generate questions
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/questions")
async def get_questions(session_id: str, request: Request) -> JSONResponse:
    """
    Load session, generate clarifying questions from the gap report,
    store questions in session, and return them.

    Returns HTTP 206 with fallback questions when the LLM is unavailable.
    """
    session = _load_session_or_404(session_id)

    loop = asyncio.get_event_loop()

    def _run() -> tuple[list[Question], bool]:
        from app.components.question_engine import QuestionEngine, ResumeContext

        resume_context = ResumeContext(
            candidate_name=session.parsed_resume.contact.name or "",
            total_experience_years=session.parsed_resume.total_experience_years,
            top_skills=session.parsed_resume.skills[:10],
            detected_sections=session.parsed_resume.detected_sections,
            summary_snippet=(session.parsed_resume.summary or "")[:300],
        )

        engine = QuestionEngine(
            api_key=settings.openai_api_key or settings.llm_api_key,
            model=settings.llm_model,
            timeout_seconds=settings.llm_question_timeout_seconds,
        )
        questions = engine.generate_questions(session.gap_report, resume_context)
        fallback_mode = any(q.is_fallback for q in questions)
        return questions, fallback_mode

    with ThreadPoolExecutor(max_workers=1) as executor:
        questions, fallback_mode = await loop.run_in_executor(executor, _run)

    # Persist questions in session
    session.questions = questions
    set_session(session, ttl_seconds=settings.session_ttl_seconds)

    response_data = {
        "session_id": session_id,
        "questions": [dataclasses.asdict(q) for q in questions],
        "question_count": len(questions),
        "fallback_mode": fallback_mode,
    }

    if fallback_mode:
        return JSONResponse(
            status_code=206,
            content={
                **response_data,
                "error_code": ErrorCode.LLM_UNAVAILABLE.value,
                "message": "LLM unavailable — fallback questions returned.",
            },
        )

    return JSONResponse(status_code=200, content=response_data)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/answers — submit answers + generate suggestions
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/answers")
async def submit_answers(session_id: str, request: Request) -> JSONResponse:
    """
    Validate and store answers, generate improvement suggestions,
    persist both in session, and return the suggestion list.

    Returns HTTP 206 when the LLM is unavailable.
    """
    session = _load_session_or_404(session_id)

    body = await request.json()
    raw_answers = body.get("answers", [])

    if not isinstance(raw_answers, list):
        raise AppError(
            ErrorCode.INTERNAL_ERROR,
            message="'answers' must be a list.",
            http_status=400,
            details={"field": "answers"},
        )

    answers: list[QuestionAnswer] = []
    for item in raw_answers:
        if not isinstance(item, dict):
            continue
        question_id = str(item.get("question_id", "")).strip()
        answer_text = str(item.get("answer_text", "")).strip()
        if question_id:
            answers.append(QuestionAnswer(question_id=question_id, answer_text=answer_text))

    loop = asyncio.get_event_loop()

    def _run() -> tuple[list[Suggestion], str]:
        from app.components.suggestion_engine import SuggestionEngine

        # Build resume sections dict for context
        resume_sections: dict[str, str] = {}
        if session.parsed_resume.summary:
            resume_sections["Summary"] = session.parsed_resume.summary
        if session.parsed_resume.skills:
            resume_sections["Skills"] = ", ".join(session.parsed_resume.skills)
        for exp in session.parsed_resume.experience[:3]:
            if exp.description:
                resume_sections.setdefault("Experience", "")
                resume_sections["Experience"] += f"\n{exp.title}: {exp.description}"

        engine = SuggestionEngine(
            api_key=settings.openai_api_key or settings.llm_api_key,
            model=settings.llm_model,
            timeout_seconds=settings.llm_suggestion_timeout_seconds,
        )
        result = engine.generate_suggestions(session.gap_report, answers, resume_sections)
        return result.suggestions, result.llm_error

    with ThreadPoolExecutor(max_workers=1) as executor:
        suggestions, llm_error = await loop.run_in_executor(executor, _run)

    # Persist answers and suggestions in session
    session.answers = answers
    session.suggestions = suggestions
    set_session(session, ttl_seconds=settings.session_ttl_seconds)

    response_data = {
        "session_id": session_id,
        "suggestions": [dataclasses.asdict(s) for s in suggestions],
        "suggestion_count": len(suggestions),
        "is_partial": bool(llm_error),
        "llm_error": llm_error,
    }

    if llm_error:
        return JSONResponse(
            status_code=206,
            content={
                **response_data,
                "error_code": ErrorCode.LLM_UNAVAILABLE.value,
                "message": "LLM unavailable — fallback suggestions returned.",
            },
        )

    return JSONResponse(status_code=200, content=response_data)


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/suggestions/approve — approve/reject suggestions
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/suggestions/approve")
async def approve_suggestions(session_id: str, request: Request) -> JSONResponse:
    """
    Update each Suggestion.approved field per submitted decisions and persist.

    Request body: { "decisions": { "<suggestion_id>": true|false, ... } }
    Returns: { "status": "recorded" }
    """
    session = _load_session_or_404(session_id)

    body = await request.json()
    decisions: dict = body.get("decisions", {})

    if not isinstance(decisions, dict):
        raise AppError(
            ErrorCode.INTERNAL_ERROR,
            message="'decisions' must be an object mapping suggestion_id to boolean.",
            http_status=400,
            details={"field": "decisions"},
        )

    # Apply decisions
    for suggestion in session.suggestions:
        if suggestion.id in decisions:
            value = decisions[suggestion.id]
            if isinstance(value, bool):
                suggestion.approved = value

    set_session(session, ttl_seconds=settings.session_ttl_seconds)

    return JSONResponse(
        status_code=200,
        content={"status": "recorded", "session_id": session_id},
    )


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/generate — generate PDF resume
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/generate")
async def generate_resume(session_id: str, request: Request) -> JSONResponse:
    """
    Generate a PDF resume from the session's approved suggestions.

    Request body: { "template_id": "clean" | "modern" }
    Returns: { "download_url": "...", "expires_at": "..." }
    """
    session = _load_session_or_404(session_id)

    body = await request.json()
    template_id: str = str(body.get("template_id", "clean")).strip()

    if template_id not in ["clean", "modern", "executive", "compact"]:
        raise AppError(
            ErrorCode.INTERNAL_ERROR,
            message=f"Invalid template_id '{template_id}'. Must be one of: clean, modern.",
            http_status=400,
            details={"field": "template_id", "allowed": ["clean", "modern", "executive", "compact"]},
        )

    approved_suggestions = [s for s in session.suggestions if s.approved is True]

    loop = asyncio.get_event_loop()

    def _run() -> bytes:
        from app.components.resume_generator import ResumeGenerator
        generator = ResumeGenerator()
        return generator.generate(session.parsed_resume, approved_suggestions, template_id)

    with ThreadPoolExecutor(max_workers=1) as executor:
        pdf_bytes = await loop.run_in_executor(executor, _run)

    # Save PDF to file storage
    output_dir = settings.generated_files_dir
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, f"{session_id}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    # Build download URL (valid for 24 hours)
    download_url = f"{settings.download_base_url}/sessions/{session_id}/download"
    expires_at = _expires_iso(settings.session_ttl_seconds)

    # Persist download URL in session
    session.download_url = download_url
    set_session(session, ttl_seconds=settings.session_ttl_seconds)

    return JSONResponse(
        status_code=200,
        content={
            "session_id": session_id,
            "download_url": download_url,
            "expires_at": expires_at,
            "template_id": template_id,
            "approved_suggestions_count": len(approved_suggestions),
        },
    )


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}/download — redirect to PDF download
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/download")
async def download_resume(session_id: str, request: Request):
    """
    Serve the generated PDF for the given session.

    Returns the PDF file directly if it exists, or 404 if not generated yet.
    """
    from fastapi.responses import FileResponse

    session = _load_session_or_404(session_id)

    pdf_path = os.path.join(settings.generated_files_dir, f"{session_id}.pdf")
    if not os.path.exists(pdf_path):
        raise AppError(
            ErrorCode.SESSION_NOT_FOUND,
            message="Generated PDF not found. Please call the generate endpoint first.",
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"resume_{session_id}.pdf",
    )


# ---------------------------------------------------------------------------
# GET /sessions/{session_id} — fetch full session JSON (for inspector)
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, request: Request) -> JSONResponse:
    """
    Return the full session JSON for the Session Inspector panel.
    """
    session = _load_session_or_404(session_id)
    return JSONResponse(status_code=200, content=dataclasses.asdict(session))
