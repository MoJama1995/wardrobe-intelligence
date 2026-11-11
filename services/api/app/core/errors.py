"""Error handling: every error leaves the API in the same ``ErrorResponse`` envelope.

Business logic raises ``AppError`` (or a subclass) and never builds HTTP responses
itself. Handlers here translate exceptions into responses at the transport edge.
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_var
from app.schemas.errors import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """An expected failure with a stable code, e.g. an unsupported image type."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(
    status_code: int, code: str, message: str, details: list[dict[str, Any]] | None = None
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(
            code=code, message=message, request_id=request_id_var.get(), details=details
        )
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(exclude_none=True))


def _status_code_slug(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase.lower().replace(" ", "_").replace("-", "_")
    except ValueError:
        return "http_error"


# Starlette types every handler as (Request, Exception); the isinstance guards narrow
# the type for mypy. Registration below guarantees they never fail at runtime.


async def _handle_app_error(_: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):  # pragma: no cover
        raise exc
    logger.info("app_error", extra={"error_code": exc.code, "status_code": exc.status_code})
    return error_response(exc.status_code, exc.code, exc.message)


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):  # pragma: no cover
        raise exc
    return error_response(exc.status_code, _status_code_slug(exc.status_code), str(exc.detail))


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):  # pragma: no cover
        raise exc
    # Deliberately drop `input`/`ctx`: echoing request values back can leak secrets
    # and bloats responses for large payloads.
    details = [
        {"loc": list(err.get("loc", ())), "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return error_response(422, "validation_error", "Request validation failed.", details)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
