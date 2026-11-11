"""Request context middleware: request IDs, access logging, last-resort error handling."""

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

from app.core.errors import error_response
from app.core.logging import request_id_var

REQUEST_ID_HEADER = "X-Request-ID"
_MAX_INBOUND_REQUEST_ID_LENGTH = 128

logger = logging.getLogger("app.request")


def _request_id_from(request: Request) -> str:
    inbound = request.headers.get(REQUEST_ID_HEADER, "")
    # Accept a caller-supplied ID (e.g. from the frontend) only if it is sane.
    if inbound and len(inbound) <= _MAX_INBOUND_REQUEST_ID_LENGTH and inbound.isprintable():
        return inbound
    return uuid.uuid4().hex


async def request_context(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = _request_id_from(request)
    token = request_id_var.set(request_id)
    started = time.perf_counter()
    try:
        try:
            response = await call_next(request)
        except Exception:
            # Unexpected bug. Log the traceback server-side; never leak it to the client.
            logger.exception("unhandled_exception")
            response = error_response(500, "internal_error", "An unexpected error occurred.")
        response.headers[REQUEST_ID_HEADER] = request_id
        logger.info(
            "request_completed",
            extra={
                "http_method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        )
        return response
    finally:
        request_id_var.reset(token)
