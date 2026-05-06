"""
Redis client initialization and cache helpers for sessions and embeddings.
"""
from __future__ import annotations

import dataclasses
import json
import logging
from typing import Any, Optional

import numpy as np
import redis

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis client (lazy singleton)
# ---------------------------------------------------------------------------

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """Return a shared Redis client, creating it on first call."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=False,  # raw bytes — needed for numpy serialisation
            socket_connect_timeout=1,
            socket_timeout=1,
        )
    return _redis_client


# ---------------------------------------------------------------------------
# JSON serialisation helpers for nested dataclasses
# ---------------------------------------------------------------------------

def _dataclass_to_dict(obj: Any) -> Any:
    """Recursively convert dataclasses (and enums) to plain dicts/lists."""
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {k: _dataclass_to_dict(v) for k, v in dataclasses.asdict(obj).items()}
    if isinstance(obj, list):
        return [_dataclass_to_dict(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _dataclass_to_dict(v) for k, v in obj.items()}
    # Enums are already handled by dataclasses.asdict (converted to .value)
    return obj


def _reconstruct_session(data: dict) -> "Session":  # noqa: F821
    """Reconstruct a Session dataclass from a plain dict (from JSON)."""
    # Import here to avoid circular imports at module level
    from app.models import (
        ATSResult,
        ATSSubScore,
        ATSSubScore,
        ContactInfo,
        EducationEntry,
        ExperienceEntry,
        GapItem,
        GapReport,
        GapType,
        MatchResult,
        ParsedJD,
        ParsedResume,
        ProjectEntry,
        Question,
        QuestionAnswer,
        Session,
        Severity,
        Suggestion,
    )

    def _contact(d: dict) -> ContactInfo:
        return ContactInfo(**d)

    def _experience(d: dict) -> ExperienceEntry:
        return ExperienceEntry(**d)

    def _education(d: dict) -> EducationEntry:
        return EducationEntry(**d)

    def _project(d: dict) -> ProjectEntry:
        return ProjectEntry(**d)

    def _parsed_resume(d: dict) -> ParsedResume:
        return ParsedResume(
            contact=_contact(d["contact"]),
            skills=d["skills"],
            experience=[_experience(e) for e in d["experience"]],
            education=[_education(e) for e in d["education"]],
            projects=[_project(p) for p in d["projects"]],
            raw_text=d["raw_text"],
            total_experience_years=d.get("total_experience_years", 0.0),
            summary=d.get("summary"),
            detected_sections=d.get("detected_sections", []),
            formatting_issues=d.get("formatting_issues", []),
        )

    def _parsed_jd(d: dict) -> ParsedJD:
        return ParsedJD(**d)

    def _match_result(d: dict) -> MatchResult:
        return MatchResult(**d)

    def _ats_sub_score(d: dict) -> ATSSubScore:
        return ATSSubScore(**d)

    def _ats_result(d: dict) -> ATSResult:
        return ATSResult(
            overall_score=d["overall_score"],
            sub_scores=[_ats_sub_score(s) for s in d["sub_scores"]],
        )

    def _gap_item(d: dict) -> GapItem:
        return GapItem(
            gap_type=GapType(d["gap_type"]),
            item=d["item"],
            severity=Severity(d["severity"]),
        )

    def _gap_report(d: dict) -> GapReport:
        return GapReport(
            gaps=[_gap_item(g) for g in d["gaps"]],
            has_gaps=d["has_gaps"],
        )

    def _question(d: dict) -> Question:
        return Question(**d)

    def _answer(d: dict) -> QuestionAnswer:
        return QuestionAnswer(**d)

    def _suggestion(d: dict) -> Suggestion:
        return Suggestion(**d)

    return Session(
        session_id=data["session_id"],
        parsed_resume=_parsed_resume(data["parsed_resume"]),
        parsed_jd=_parsed_jd(data["parsed_jd"]),
        match_result=_match_result(data["match_result"]),
        ats_result=_ats_result(data["ats_result"]),
        gap_report=_gap_report(data["gap_report"]),
        questions=[_question(q) for q in data.get("questions", [])],
        answers=[_answer(a) for a in data.get("answers", [])],
        suggestions=[_suggestion(s) for s in data.get("suggestions", [])],
        download_url=data.get("download_url"),
        created_at=data.get("created_at", ""),
        expires_at=data.get("expires_at", ""),
    )


# ---------------------------------------------------------------------------
# Session cache helpers
# ---------------------------------------------------------------------------

_SESSION_PREFIX = "session:"


def _session_key(session_id: str) -> str:
    return f"{_SESSION_PREFIX}{session_id}"


def get_session(session_id: str) -> Optional["Session"]:  # noqa: F821
    """Retrieve a Session from Redis. Returns None if not found or expired."""
    client = get_redis_client()
    try:
        raw = client.get(_session_key(session_id))
        if raw is None:
            return None
        data = json.loads(raw)
        return _reconstruct_session(data)
    except Exception:
        logger.exception("Failed to retrieve session %s from Redis", session_id)
        return None


def set_session(session: "Session", ttl_seconds: int = 86400) -> None:  # noqa: F821
    """Persist a Session to Redis with the given TTL (default 24 h)."""
    client = get_redis_client()
    try:
        payload = json.dumps(_dataclass_to_dict(session))
        client.setex(_session_key(session.session_id), ttl_seconds, payload)
    except Exception:
        logger.exception("Failed to store session %s in Redis", session.session_id)
        raise


def delete_session(session_id: str) -> bool:
    """Delete a session from Redis. Returns True if the key existed."""
    client = get_redis_client()
    try:
        deleted = client.delete(_session_key(session_id))
        return bool(deleted)
    except Exception:
        logger.exception("Failed to delete session %s from Redis", session_id)
        return False


# ---------------------------------------------------------------------------
# Embedding cache helpers
# ---------------------------------------------------------------------------

_EMBEDDING_PREFIX = "embedding:"


def _embedding_key(cache_key: str) -> str:
    return f"{_EMBEDDING_PREFIX}{cache_key}"


def get_embedding(cache_key: str) -> Optional[np.ndarray]:
    """Retrieve a cached embedding vector. Returns None on miss or error."""
    client = get_redis_client()
    try:
        raw = client.get(_embedding_key(cache_key))
        if raw is None:
            return None
        return np.frombuffer(raw, dtype=np.float32).copy()
    except Exception:
        logger.exception("Failed to retrieve embedding %s from Redis", cache_key)
        return None


def set_embedding(
    cache_key: str,
    embedding: np.ndarray,
    ttl_seconds: int = 86400,
) -> None:
    """Store an embedding vector in Redis with the given TTL (default 24 h)."""
    client = get_redis_client()
    try:
        data = embedding.astype(np.float32).tobytes()
        client.setex(_embedding_key(cache_key), ttl_seconds, data)
    except Exception:
        logger.exception("Failed to store embedding %s in Redis", cache_key)
        raise
