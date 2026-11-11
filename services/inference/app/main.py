from typing import Annotated, Literal

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from app.config import Settings, get_settings


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["inference"]
    model_id: str | None
    model_revision: str | None
    model_loaded: bool
    build: str


def create_app() -> FastAPI:
    app = FastAPI(title="Wardrobe Intelligence Inference", version="0.1.0")

    @app.get("/health", tags=["system"])
    def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
        # model_loaded becomes real once model loading exists; until then it is honest.
        return HealthResponse(
            status="ok",
            service="inference",
            model_id=settings.model_id,
            model_revision=settings.model_revision,
            model_loaded=False,
            build=settings.build_sha,
        )

    return app


app = create_app()
