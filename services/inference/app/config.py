"""Runtime configuration, read from environment variables prefixed with ``INFERENCE_``.

The model is identified by an immutable reference (a Hugging Face revision SHA or
a versioned GCS path), never by a mutable name such as ``main`` or ``latest``:
the same configuration must always load the same weights.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="INFERENCE_", env_file=".env", extra="ignore")

    environment: Literal["local", "test", "dev", "prod"] = "local"
    # e.g. "Qwen/Qwen3-VL-2B-Instruct". Unset until a model is selected (see README).
    model_id: str | None = None
    # Immutable revision: a commit SHA on the Hub or a version in the model registry bucket.
    model_revision: str | None = None
    build_sha: str = "local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
