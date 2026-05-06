"""
Structured error handling for the AI Resume ATS Optimizer.

Defines the AppError exception class, the error code registry, and
FastAPI exception handlers that return a consistent JSON error envelope:

    {
        "error_code": "...",
        "message": "...",
        "request_id": "...",
        "details": {}
    }
"""
from __future__ import annotations

import uuid
from enum import Enum

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Error code registry
# ---------------------------------------------------------------------------

class ErrorCode(str, Enum):
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    FILE_TOO_LARGE     = "FILE_TOO_LARGE"
    JD_TOO_SHORT       = "JD_TOO_SHORT"
    PARSE_FAILURE      = "PARSE_FAILURE"
    SESSION_NOT_FOUND  = "SESSION_NOT_FOUND"
    LLM_UNAVAILABLE    = "LLM_UNAVAILABLE"
    INTERNAL_ERROR     = "INTERNAL_ERROR"


# Maps each error code to (http_status, default_message)
_ERROR_REGISTRY: dict[ErrorCode, tuple[int, str]] = {
    ErrorCode.UNSUPPORTED_FORMAT: (
        400,
        "The uploaded file format is not supported. Please upload a PDF or DOCX file.",
    ),
    ErrorCode.FILE_TOO_LARGE: (
        400,
        "The uploaded file exceeds the 5 MB size limit. Please upload a smaller file.",
    ),
    ErrorCode.JD_TOO_SHORT: (
        400,
        "The job description is too short. Please provide at least 50 characters.",
    ),
    ErrorCode.PARSE_FAILURE: (
        422,
        "Could not extract text from the uploaded file. Please upload a text-based PDF or DOCX.",
    ),
    ErrorCode.SESSION_NOT_FOUND: (
        404,
        "The requested session does not exist or has expired.",
    ),
    ErrorCode.LLM_UNAVAILABLE: (
        206,
        "The AI service is temporarily unavailable. A partial result has been returned.",
    ),
    ErrorCode.INTERNAL_ERROR: (
        500,
        "An unexpected error occurred. Please try again.",
    ),
}


def http_status_for(code: ErrorCode) -> int:
    """Return the HTTP status code associated with an error code."""
    return _ERROR_REGISTRY[code][0]


def default_message_for(code: ErrorCode) -> str:
    """Return the default human-readable message for an error code."""
    return _ERROR_REGISTRY[code][1]


# ---------------------------------------------------------------------------
# AppError exception
# ---------------------------------------------------------------------------

class AppError(Exception):
    """
    Domain exception raised by any application component.

    Attributes:
        error_code: One of the ErrorCode enum values.
        message:    Human-readable description (falls back to registry default).
        http_status: HTTP status code (falls back to registry default).
        details:    Optional dict with field-level or contextual information.
    """

    def __init__(
        self,
        error_code: ErrorCode,
        message: str | None = None,
        http_status: int | None = None,
        details: dict | None = None,
    ) -> None:
        self.error_code = error_code
        self.message = message or default_message_for(error_code)
        self.http_status = http_status or http_status_for(error_code)
        self.details = details or {}
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle AppError instances raised anywhere in the application."""
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "error_code": exc.error_code.value,
            "message": exc.message,
            "request_id": req_id,
            "details": exc.details,
        },
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle FastAPI/Pydantic RequestValidationError.

    Returns HTTP 400 with field-level details so callers know exactly
    which input fields failed validation (Requirement 12.4).
    """
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    field_errors = [
        {
            "field": ".".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content={
            "error_code": ErrorCode.INTERNAL_ERROR.value,
            "message": "Request validation failed.",
            "request_id": req_id,
            "details": {"validation_errors": field_errors},
        },
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Catch-all handler for any exception not explicitly handled elsewhere.

    Returns HTTP 500 with INTERNAL_ERROR (Requirement 12.1).
    """
    import logging
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logging.getLogger(__name__).exception(
        "unhandled exception",
        extra={"request_id": req_id, "error_code": ErrorCode.INTERNAL_ERROR.value},
    )
    return JSONResponse(
        status_code=500,
        content={
            "error_code": ErrorCode.INTERNAL_ERROR.value,
            "message": default_message_for(ErrorCode.INTERNAL_ERROR),
            "request_id": req_id,
            "details": {},
        },
    )


# ---------------------------------------------------------------------------
# Registration helper
# ---------------------------------------------------------------------------

def register_error_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the given FastAPI application."""
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
