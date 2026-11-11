"""Runtime configuration, read from environment variables prefixed with ``API_``.

Every environment-specific value lives here. Code elsewhere receives ``Settings``
through the ``get_settings`` dependency instead of reading ``os.environ`` itself,
which keeps configuration discoverable and easy to override in tests.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_", env_file=".env", extra="ignore")

    environment: Literal["local", "test", "dev", "prod"] = "local"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    # JSON list, e.g. API_CORS_ORIGINS='["https://app.example.com"]'. Empty disables CORS.
    cors_origins: list[str] = Field(default_factory=list)
    # Set at image build time (git SHA) so logs and /health identify the running code.
    build_sha: str = "local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
