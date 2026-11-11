---
name: api-development
description: Build or change the FastAPI service in services/api for Wardrobe Intelligence, covering endpoints, Pydantic schemas, business logic, image uploads, errors, logging, configuration and API tests. Use for any work under services/api, including adding a route, changing the HTTP contract (openapi.json), handling wardrobe photo uploads, or calling the inference service.
---

# API development (services/api)

## Layout

| Path | Contains | Must not contain |
| --- | --- | --- |
| `app/api/<resource>.py` | `APIRouter` handlers: validate, call one service function, return a schema | business logic, storage calls, `try/except` for flow control |
| `app/schemas/<resource>.py` | Pydantic request/response models: the contract | logic |
| `app/services/<domain>.py` | business logic; raises `AppError` | FastAPI imports, `HTTPException` |
| `app/repositories/` | persistence (GCS, DB). Create it when first needed | business rules |
| `app/core/` | config, logging, errors, middleware | feature code |

Read `app/core/errors.py`, `app/core/middleware.py` and `tests/test_errors.py` before changing error
handling. Every non-2xx response uses the `ErrorResponse` envelope with a `request_id`.

## Rules

- **Configuration** comes only through `Depends(get_settings)`, never from `os.environ`. New settings
  go in `Settings` with the `API_` prefix and are documented in `.env.example`.
- **Every route** declares its return type (the response model), a `summary` and a docstring,
  because they become the OpenAPI docs.
- **Expected failures** use `raise AppError(status, "stable_code", "user-safe message")`. Codes are
  part of the contract: never rename one silently.
- **Sync vs async:** use `def` for blocking work (FastAPI runs it in a threadpool). Use `async def`
  only when every call inside is awaited I/O.
- **Outbound calls** (inference, GCS) have explicit timeouts. Map their failures to 503/504 with
  codes such as `inference_unavailable`.
- **Logging:** `logger.info("snake_case_event", extra={...})`. Never log secrets, tokens, image
  bytes, full bodies or EXIF. Log ids, not personal data.
- **Contract changes:** run `uv run python -m app.contract`, then `npm run gen:api` in `apps/web`,
  and commit both in the same PR. Bump `app.__version__` (minor for additive changes, major for
  breaking ones).

## Wardrobe photo uploads (when built)

- Validate the type by **magic bytes** (JPEG/PNG/WebP), not by filename or `Content-Type`. Enforce a
  maximum size (e.g. 10 MB) before reading everything into memory.
- Decode with Pillow, keeping `Image.MAX_IMAGE_PIXELS` set to guard against decompression bombs.
  Apply EXIF orientation, then **strip all EXIF**, because it can contain GPS location.
- Store under server-generated random ids in a private bucket, never under the user's filename.
  Serve images to the browser through short-lived signed URLs.
- Add Pillow as a dependency only when this endpoint is built.

## Workflow

1. Schema → 2. service function and unit tests → 3. route and TestClient tests for success and
each error code → 4. regenerate the contract → 5. update the README if setup or behaviour changed.

## Required output

Code, tests (service unit tests and route tests including failure paths), the regenerated
`openapi.json` and frontend types, and passing `uv run pytest`, `ruff` and `mypy`.

## Common mistakes

- Raising `HTTPException` from services, which couples domain logic to HTTP.
- Echoing request input in error messages. Validation errors intentionally omit `input`.
- Forgetting to regenerate `openapi.json`. `tests/test_contract.py` will fail.
- Calling inference without a timeout. A cold GPU can take a minute or more.
- Returning raw dicts instead of response models, which leaves the contract undocumented.
