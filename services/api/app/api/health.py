from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", summary="Liveness check")
def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    """Returns 200 while the process can serve requests. Does not check dependencies."""
    return HealthResponse(
        status="ok", service="api", environment=settings.environment, build=settings.build_sha
    )
