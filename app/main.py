import logging
import time
import uuid
from contextvars import ContextVar

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_error_handlers

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------

class _JsonFormatter(logging.Formatter):
    """Emit log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        import json

        payload: dict = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Merge any extra fields attached to the record
        for key, value in record.__dict__.items():
            if key not in (
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "module", "msecs", "message", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName",
            ):
                payload[key] = value
        return json.dumps(payload, default=str)


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


_configure_logging()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Request-scoped context vars
# ---------------------------------------------------------------------------

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
session_id_var: ContextVar[str] = ContextVar("session_id", default="")

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request ID + structured logging middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    req_id = str(uuid.uuid4())
    request_id_var.set(req_id)

    # Make request_id available on the request state for use in handlers
    request.state.request_id = req_id

    start = time.monotonic()
    response: Response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000)

    status = "success" if response.status_code < 400 else "error"
    logger.info(
        "request completed",
        extra={
            "request_id": req_id,
            "session_id": session_id_var.get(""),
            "endpoint": str(request.url.path),
            "method": request.method,
            "duration_ms": duration_ms,
            "status_code": response.status_code,
            "status": status,
            "error_code": None,
        },
    )

    response.headers["X-Request-ID"] = req_id
    return response

# ---------------------------------------------------------------------------
# Exception handlers (AppError, RequestValidationError, unhandled Exception)
# ---------------------------------------------------------------------------

register_error_handlers(app)

# ---------------------------------------------------------------------------
# Pre-warm embedding model at startup (avoids cold-start on first request)
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def _warmup_embedding_model() -> None:
    """Load sentence-transformers model in background so first request is fast."""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    def _load():
        try:
            from app.components.embedding_engine import EmbeddingEngine
            engine = EmbeddingEngine()
            engine.embed("warmup")
            logger.info("Embedding model pre-warmed successfully")
        except Exception as exc:
            logger.warning("Embedding model warmup failed (non-fatal): %s", exc)

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        loop.run_in_executor(executor, _load)

# ---------------------------------------------------------------------------
# Session router (EPIC 9)
# ---------------------------------------------------------------------------

from app.routers.sessions import router as sessions_router
app.include_router(sessions_router, prefix=settings.api_prefix)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

import datetime


@app.get(f"{settings.api_prefix}/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}


@app.post(f"{settings.api_prefix}/dev/parse-resume", tags=["dev"])
async def dev_parse_resume(request: Request) -> dict:
    """Dev-only endpoint: parse an uploaded resume and return structured data."""
    import asyncio
    import dataclasses
    from concurrent.futures import ThreadPoolExecutor
    from fastapi import UploadFile
    from app.components.resume_parser import ResumeParser

    form = await request.form()
    file: UploadFile = form.get("resume_file")  # type: ignore[assignment]
    if file is None:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.PARSE_FAILURE, "No file uploaded")

    filename = file.filename or ""
    file_bytes = await file.read()

    if filename.lower().endswith(".pdf"):
        file_type = "pdf"
    elif filename.lower().endswith(".docx"):
        file_type = "docx"
    else:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.UNSUPPORTED_FORMAT)

    # Run the blocking parse (file I/O + LLM call) in a thread pool
    # so it doesn't block the async event loop
    loop = asyncio.get_event_loop()
    parser = ResumeParser()
    with ThreadPoolExecutor(max_workers=1) as executor:
        parsed = await loop.run_in_executor(
            executor, parser.parse, file_bytes, file_type
        )
    return dataclasses.asdict(parsed)


@app.post(f"{settings.api_prefix}/dev/parse-jd", tags=["dev"])
async def dev_parse_jd(request: Request) -> dict:
    """Dev-only endpoint: parse a job description and return structured data."""
    import dataclasses
    from app.components.jd_parser import JDParser

    body = await request.json()
    jd_text: str = body.get("jd_text", "")

    parser = JDParser()
    parsed = parser.parse(jd_text)
    return dataclasses.asdict(parsed)


@app.post(f"{settings.api_prefix}/dev/embed", tags=["dev"])
async def dev_embed(request: Request) -> dict:
    """Dev-only endpoint: embed two texts and return similarity + cache status."""
    import time
    from app.components.embedding_engine import EmbeddingEngine
    from app.cache import get_embedding

    body = await request.json()
    text_a: str = body.get("text_a", "")
    text_b: str = body.get("text_b", "")

    engine = EmbeddingEngine()

    def _embed_with_meta(text: str) -> dict:
        cache_key = engine._cache_key(text)
        cached_before = get_embedding(cache_key)
        t0 = time.monotonic()
        vec = engine.embed(text)
        latency_ms = round((time.monotonic() - t0) * 1000, 2)
        cache_hit = cached_before is not None
        return {
            "vector": vec.tolist(),
            "cache_hit": cache_hit,
            "latency_ms": latency_ms,
        }

    result_a = _embed_with_meta(text_a)
    result_b = _embed_with_meta(text_b)

    vec_a = engine.embed(text_a)
    vec_b = engine.embed(text_b)
    similarity = engine.cosine_similarity(vec_a, vec_b)
    self_similarity_a = engine.cosine_similarity(vec_a, vec_a)

    return {
        "similarity": similarity,
        "self_similarity_a": self_similarity_a,
        "self_similarity_pass": abs(self_similarity_a - 1.0) < 1e-5,
        "embedding_a": result_a,
        "embedding_b": result_b,
    }


@app.post(f"{settings.api_prefix}/dev/match", tags=["dev"])
async def dev_match(request: Request) -> dict:
    """Dev-only endpoint: compute match score from skill lists and optional texts."""
    import dataclasses
    from app.components.matching_engine import MatchingEngine
    from app.components.embedding_engine import EmbeddingEngine

    body = await request.json()
    resume_skills: list[str] = body.get("resume_skills", [])
    jd_required_skills: list[str] = body.get("jd_required_skills", [])
    resume_text: str = body.get("resume_text", " ".join(resume_skills) or "resume")
    jd_text: str = body.get("jd_text", " ".join(jd_required_skills) or "job description")

    engine = EmbeddingEngine()
    resume_emb = engine.embed(resume_text)
    jd_emb = engine.embed(jd_text)

    matcher = MatchingEngine()
    result = matcher.compute_match(resume_skills, jd_required_skills, resume_emb, jd_emb)

    # Compute matched / missing skill sets for the diff view
    resume_set = {s.lower().strip() for s in resume_skills}
    required_set = {s.lower().strip() for s in jd_required_skills}
    matched_skills = sorted(resume_set & required_set)
    missing_skills = sorted(required_set - resume_set)

    return {
        **dataclasses.asdict(result),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "keyword_weight": MatchingEngine.KEYWORD_WEIGHT,
        "semantic_weight": MatchingEngine.SEMANTIC_WEIGHT,
    }


@app.post(f"{settings.api_prefix}/analyze-jd", tags=["jd"])
async def analyze_jd(request: Request) -> dict:
    """
    Job description analysis endpoint — agent-only.

    Accepts plain text JD and returns structured extraction via GPT-4o-mini:
    job title, company, location, required/preferred skills, tools,
    experience, responsibilities, qualifications, keywords, salary, benefits.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from app.components.jd_agent import JDAgent

    body = await request.json()
    jd_text: str = body.get("jd_text", "").strip()

    if not jd_text:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.JD_TOO_SHORT, "No job description text provided")

    if len(jd_text) < 50:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.JD_TOO_SHORT, "Job description is too short (minimum 50 characters)")

    def _run() -> dict:
        agent = JDAgent(
            api_key=settings.openai_api_key,
            model=settings.parser_recovery_model,
            timeout=max(settings.parser_recovery_timeout_seconds, 30),
        )
        result = agent.extract(jd_text)
        return {
            "job_title": result.job_title,
            "company": result.company,
            "location": result.location,
            "job_type": result.job_type,
            "required_skills": result.required_skills,
            "preferred_skills": result.preferred_skills,
            "tools": result.tools,
            "experience_required": result.experience_required,
            "responsibilities": result.responsibilities,
            "qualifications": result.qualifications,
            "keywords": result.keywords,
            "salary_range": result.salary_range,
            "benefits": result.benefits,
            "extraction_source": result.extraction_source,
        }

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        return await loop.run_in_executor(executor, _run)


@app.post(f"{settings.api_prefix}/analyze-resume", tags=["resume"])
async def analyze_resume(request: Request) -> dict:
    """
    Resume analysis endpoint — agent-only, no rule-based fallback.

    Flow:
      1. Extract raw text from PDF/DOCX (text extraction only, no parsing)
      2. Pass raw text directly to ResumeAgent (GPT-4o-mini)
      3. Return structured JSON from the agent
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from fastapi import UploadFile
    from app.components.resume_agent import ResumeAgent

    form = await request.form()
    file: UploadFile = form.get("resume_file")  # type: ignore[assignment]
    if file is None:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.PARSE_FAILURE, "No file uploaded")

    filename = file.filename or ""
    file_bytes = await file.read()

    if filename.lower().endswith(".pdf"):
        file_type = "pdf"
    elif filename.lower().endswith(".docx"):
        file_type = "docx"
    else:
        from app.errors import AppError, ErrorCode
        raise AppError(ErrorCode.UNSUPPORTED_FORMAT)

    def _run() -> dict:
        # Step 1: Extract raw text only (no rule-based parsing)
        raw_text = _extract_raw_text(file_bytes, file_type)
        if not raw_text.strip():
            from app.errors import AppError, ErrorCode
            raise AppError(ErrorCode.PARSE_FAILURE, "Could not extract text from file")

        # Step 2: Run agent — always, no fallback
        agent = ResumeAgent(
            api_key=settings.openai_api_key,
            model=settings.parser_recovery_model,
            timeout=max(settings.parser_recovery_timeout_seconds, 45),
        )
        result = agent.extract(raw_text)

        return {
            "contact": {
                "name": result.contact.name,
                "email": result.contact.email,
                "phone": result.contact.phone,
                "linkedin": result.contact.linkedin,
                "location": result.contact.location,
            },
            "summary": result.summary,
            "skills": result.skills,
            "experience": [
                {
                    "title": e.title,
                    "company": e.company,
                    "start_date": e.start_date,
                    "end_date": e.end_date,
                    "description": e.description,
                }
                for e in result.experience
            ],
            "education": [
                {
                    "institution": e.institution,
                    "degree": e.degree,
                    "field": e.field,
                    "year": e.year,
                    "grade": e.grade,
                }
                for e in result.education
            ],
            "projects": [
                {
                    "name": p.name,
                    "description": p.description,
                    "technologies": p.technologies,
                }
                for p in result.projects
            ],
            "achievements": result.achievements,
            "certifications": result.certifications,
            "languages": result.languages,
            "total_experience_years": result.total_experience_years,
            "extraction_source": result.extraction_source,
            "raw_text": raw_text,
        }

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        return await loop.run_in_executor(executor, _run)


def _extract_raw_text(file_bytes: bytes, file_type: str) -> str:
    """Extract plain text from PDF or DOCX — no parsing, just text."""
    if file_type == "pdf":
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        raw = "\n".join(pages)
        # Basic cleanup: collapse excessive blank lines
        import re
        raw = re.sub(r'\n{3,}', '\n\n', raw)
        return raw.strip()
    else:
        import io
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs).strip()


@app.post(f"{settings.api_prefix}/dev/ats", tags=["dev"])
async def dev_ats(request: Request) -> dict:
    """Dev-only endpoint: compute ATS score from resume skills, sections, formatting issues,
    experience years, and JD required skills / experience range."""
    import dataclasses
    from app.components.ats_engine import ATSEngine
    from app.components.embedding_engine import EmbeddingEngine
    from app.models import (
        ContactInfo, ParsedResume, ParsedJD,
        ExperienceEntry, EducationEntry, ProjectEntry,
    )

    body = await request.json()

    # Build minimal ParsedResume from request body
    resume_skills: list[str] = body.get("resume_skills", [])
    detected_sections: list[str] = body.get("detected_sections", [])
    formatting_issues: list[str] = body.get("formatting_issues", [])
    total_experience_years: float = float(body.get("total_experience_years", 0.0))
    resume_text: str = body.get("resume_text", " ".join(resume_skills) or "resume")

    # Derive section content from detected_sections so the non-empty check
    # in _section_is_non_empty always agrees with what the UI toggled on.
    detected_lower = {s.lower() for s in detected_sections}
    summary: str | None = "Summary text" if "summary" in detected_lower else None
    experience_list = (
        [ExperienceEntry(company="Company", title="Role", start_date="2020", description="desc")]
        if "experience" in detected_lower else []
    )
    education_list = (
        [EducationEntry(institution="University", degree="B.Sc.", field="CS")]
        if "education" in detected_lower else []
    )
    projects_list = (
        [ProjectEntry(name="Project", description="desc")]
        if "projects" in detected_lower else []
    )
    # Skills list: use provided skills; if skills section is toggled but no
    # skills were entered, synthesise a placeholder so the check passes.
    effective_skills = resume_skills if resume_skills else (
        ["skill"] if "skills" in detected_lower else []
    )

    parsed_resume = ParsedResume(
        contact=ContactInfo(name=""),
        skills=effective_skills,
        experience=experience_list,
        education=education_list,
        projects=projects_list,
        raw_text=resume_text,
        total_experience_years=total_experience_years,
        summary=summary,
        detected_sections=detected_sections,
        formatting_issues=formatting_issues,
    )

    # Build minimal ParsedJD from request body
    jd_required_skills: list[str] = body.get("jd_required_skills", [])
    jd_preferred_skills: list[str] = body.get("jd_preferred_skills", [])
    min_exp = body.get("min_experience_years")
    max_exp = body.get("max_experience_years")
    jd_text: str = body.get("jd_text", " ".join(jd_required_skills) or "job description")

    parsed_jd = ParsedJD(
        required_skills=jd_required_skills,
        preferred_skills=jd_preferred_skills,
        keywords=jd_required_skills,
        raw_text=jd_text,
        min_experience_years=int(min_exp) if min_exp is not None else None,
        max_experience_years=int(max_exp) if max_exp is not None else None,
    )

    # Embeddings
    engine = EmbeddingEngine()
    resume_emb = engine.embed(resume_text)
    jd_emb = engine.embed(jd_text)

    ats = ATSEngine()
    result = ats.compute_ats(parsed_resume, parsed_jd, resume_emb, jd_emb)

    return dataclasses.asdict(result)


@app.post(f"{settings.api_prefix}/dev/gap", tags=["dev"])
async def dev_gap(request: Request) -> dict:
    """Dev-only endpoint: detect gaps between a resume and a JD.

    Accepts JSON with resume skills, sections, experience years, and JD skills/experience.
    Returns a GapReport as JSON.
    """
    import dataclasses
    from app.components.gap_detector import GapDetector
    from app.models import (
        ContactInfo, ParsedResume, ParsedJD,
        ExperienceEntry, EducationEntry, ProjectEntry,
    )

    body = await request.json()

    # --- Build ParsedResume from request body ---
    resume_skills: list[str] = body.get("resume_skills", [])
    detected_sections: list[str] = body.get("detected_sections", [])
    total_experience_years: float = float(body.get("total_experience_years", 0.0))
    summary_text: str = body.get("summary", "")
    experience_count: int = int(body.get("experience_count", 0))
    education_count: int = int(body.get("education_count", 0))
    projects_count: int = int(body.get("projects_count", 0))

    # Build minimal experience/education/projects lists from counts
    experience_list = [
        ExperienceEntry(company=f"Company {i+1}", title=f"Role {i+1}", start_date="2020")
        for i in range(experience_count)
    ]
    education_list = [
        EducationEntry(institution=f"University {i+1}", degree="B.Sc.", field="CS")
        for i in range(education_count)
    ]
    projects_list = [
        ProjectEntry(name=f"Project {i+1}", description="desc")
        for i in range(projects_count)
    ]

    parsed_resume = ParsedResume(
        contact=ContactInfo(name=""),
        skills=resume_skills,
        experience=experience_list,
        education=education_list,
        projects=projects_list,
        raw_text="",
        total_experience_years=total_experience_years,
        summary=summary_text or None,
        detected_sections=detected_sections,
        formatting_issues=[],
    )

    # --- Build ParsedJD from request body ---
    jd_required_skills: list[str] = body.get("jd_required_skills", [])
    jd_preferred_skills: list[str] = body.get("jd_preferred_skills", [])
    min_exp = body.get("min_experience_years")
    max_exp = body.get("max_experience_years")

    parsed_jd = ParsedJD(
        required_skills=jd_required_skills,
        preferred_skills=jd_preferred_skills,
        keywords=[],
        raw_text="",
        min_experience_years=int(min_exp) if min_exp is not None else None,
        max_experience_years=int(max_exp) if max_exp is not None else None,
    )

    detector = GapDetector()
    result = detector.detect(parsed_resume, parsed_jd)
    return dataclasses.asdict(result)


@app.post(f"{settings.api_prefix}/dev/questions", tags=["dev"])
async def dev_questions(request: Request) -> dict:
    """Dev-only endpoint: generate clarifying questions from a gap report.

    Accepts JSON with gap_report and optional resume_context.
    Returns a list of Question objects and a fallback_mode flag.
    """
    import asyncio
    import dataclasses
    from concurrent.futures import ThreadPoolExecutor
    from app.components.question_engine import QuestionEngine, ResumeContext
    from app.models import GapReport, GapItem, GapType, Severity

    body = await request.json()

    # --- Deserialise GapReport from request body ---
    raw_gaps = body.get("gaps", [])
    gaps: list[GapItem] = []
    for g in raw_gaps:
        try:
            gaps.append(
                GapItem(
                    gap_type=GapType(g["gap_type"]),
                    item=g["item"],
                    severity=Severity(g["severity"]),
                )
            )
        except (KeyError, ValueError):
            continue

    gap_report = GapReport(gaps=gaps, has_gaps=bool(gaps))

    # --- Build ResumeContext from request body ---
    ctx_raw = body.get("resume_context", {})
    resume_context = ResumeContext(
        candidate_name=ctx_raw.get("candidate_name", ""),
        total_experience_years=float(ctx_raw.get("total_experience_years", 0.0)),
        top_skills=ctx_raw.get("top_skills") or [],
        detected_sections=ctx_raw.get("detected_sections") or [],
        summary_snippet=ctx_raw.get("summary_snippet", ""),
    )

    def _run() -> dict:
        engine = QuestionEngine(
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            timeout_seconds=settings.llm_question_timeout_seconds,
        )
        questions = engine.generate_questions(gap_report, resume_context)
        fallback_mode = any(q.is_fallback for q in questions)
        return {
            "questions": [dataclasses.asdict(q) for q in questions],
            "fallback_mode": fallback_mode,
            "question_count": len(questions),
        }

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        return await loop.run_in_executor(executor, _run)


@app.post(f"{settings.api_prefix}/dev/suggestions", tags=["dev"])
async def dev_suggestions(request: Request) -> dict:
    """Dev-only endpoint: generate resume improvement suggestions.

    Accepts JSON with gap_report, answers, and resume_sections.
    Returns suggestions and an llm_error flag (HTTP 206 on LLM failure).
    """
    import asyncio
    import dataclasses
    from concurrent.futures import ThreadPoolExecutor
    from fastapi.responses import JSONResponse
    from app.components.suggestion_engine import SuggestionEngine
    from app.models import GapReport, GapItem, GapType, Severity, QuestionAnswer

    body = await request.json()

    # --- Deserialise GapReport ---
    raw_gaps = body.get("gaps", [])
    gaps: list[GapItem] = []
    for g in raw_gaps:
        try:
            gaps.append(
                GapItem(
                    gap_type=GapType(g["gap_type"]),
                    item=g["item"],
                    severity=Severity(g["severity"]),
                )
            )
        except (KeyError, ValueError):
            continue

    gap_report = GapReport(gaps=gaps, has_gaps=bool(gaps))

    # --- Deserialise answers ---
    raw_answers = body.get("answers", [])
    answers: list[QuestionAnswer] = [
        QuestionAnswer(
            question_id=str(a.get("question_id", "")),
            answer_text=str(a.get("answer_text", "")),
        )
        for a in raw_answers
        if isinstance(a, dict)
    ]

    # --- Resume sections ---
    resume_sections: dict[str, str] = body.get("resume_sections", {})
    if not isinstance(resume_sections, dict):
        resume_sections = {}

    def _run() -> dict:
        engine = SuggestionEngine(
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            timeout_seconds=settings.llm_suggestion_timeout_seconds,
        )
        result = engine.generate_suggestions(gap_report, answers, resume_sections)
        return {
            "suggestions": [dataclasses.asdict(s) for s in result.suggestions],
            "llm_error": result.llm_error,
            "is_partial": result.is_partial,
            "suggestion_count": len(result.suggestions),
        }

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        data = await loop.run_in_executor(executor, _run)

    # Return 206 Partial Content when LLM failed (Requirement 9.4)
    if data.get("is_partial"):
        return JSONResponse(content=data, status_code=206)
    return data


@app.get(f"{settings.api_prefix}/health/redis", tags=["meta"])
async def health_redis() -> dict:
    import time
    from app.cache import get_redis_client

    client = get_redis_client()
    start = time.monotonic()
    try:
        client.ping()
        latency_ms = round((time.monotonic() - start) * 1000, 2)
        return {"status": "connected", "latency_ms": latency_ms}
    except Exception:
        latency_ms = round((time.monotonic() - start) * 1000, 2)
        return {"status": "unreachable", "latency_ms": latency_ms}
