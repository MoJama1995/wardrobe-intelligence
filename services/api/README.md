# services/api

Public HTTP API for Wardrobe Intelligence: validation, orchestration, persistence. **No ML
dependencies.** Model work happens in `services/inference`.

## Run and test

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000   # docs at http://localhost:8000/docs
uv run pytest                                      # unit + API + contract tests
uv run ruff check . && uv run ruff format --check . && uv run mypy
```

## Structure

| Path | Purpose |
| --- | --- |
| `app/main.py` | `create_app()`: middleware, error handlers, routers |
| `app/api/` | thin route handlers |
| `app/schemas/` | Pydantic models, the HTTP contract |
| `app/core/config.py` | `Settings` from `API_*` environment variables |
| `app/core/errors.py` | `AppError` and the single `ErrorResponse` envelope |
| `app/core/middleware.py` | request IDs (`X-Request-ID`), JSON access logs, last-resort 500 handling |
| `app/core/logging.py` | structured JSON logs for Cloud Logging |
| `app/contract.py` | writes `openapi.json`, the contract for `apps/web` |

Conventions: `.claude/skills/api-development/SKILL.md`.

## Configuration

See `.env.example`. Every variable has the `API_` prefix.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness, environment and build SHA |

After changing routes or schemas: `uv run python -m app.contract`, then `npm run gen:api` in
`apps/web`.

## Container

```bash
docker build --platform linux/amd64 --build-arg BUILD_SHA=$(git rev-parse --short HEAD) -t api .
docker run -p 8080:8080 -e API_ENVIRONMENT=local api
```
