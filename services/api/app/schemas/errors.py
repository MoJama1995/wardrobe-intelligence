from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(description="Stable, machine-readable error code, e.g. `validation_error`.")
    message: str = Field(description="Human-readable explanation. Safe to show to end users.")
    request_id: str | None = Field(
        default=None, description="Correlates the error with server logs."
    )
    details: list[dict[str, Any]] | None = Field(
        default=None, description="Optional structured context, e.g. per-field validation errors."
    )


class ErrorResponse(BaseModel):
    """The single error envelope returned by every non-2xx response."""

    error: ErrorDetail
