"""Contract test: the committed openapi.json must match the running code.

If this fails you changed a route or schema. Regenerate the contract and the
frontend types, then commit all three together:

    uv run python -m app.contract          # in services/api
    npm run gen:api                         # in apps/web
"""

from app.contract import OPENAPI_PATH, render_openapi


def test_committed_openapi_matches_code() -> None:
    assert OPENAPI_PATH.exists(), "openapi.json missing: run `uv run python -m app.contract`"
    assert OPENAPI_PATH.read_text() == render_openapi(), (
        "openapi.json is stale: run `uv run python -m app.contract` and `npm run gen:api`"
    )
