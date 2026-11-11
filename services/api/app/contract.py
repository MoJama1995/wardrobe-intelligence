"""The OpenAPI document is the contract between this API and apps/web.

``openapi.json`` is committed. apps/web generates its TypeScript types from it
(``npm run gen:api``), and ``tests/test_contract.py`` fails if the committed file
no longer matches the code. See docs/decisions/0003-api-contract-via-openapi.md.

Regenerate after changing routes or schemas:

    uv run python -m app.contract
"""

import json
from pathlib import Path

from app.core.config import Settings
from app.main import create_app

OPENAPI_PATH = Path(__file__).resolve().parents[1] / "openapi.json"


def render_openapi() -> str:
    schema = create_app(Settings(environment="test")).openapi()
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


if __name__ == "__main__":
    OPENAPI_PATH.write_text(render_openapi())
