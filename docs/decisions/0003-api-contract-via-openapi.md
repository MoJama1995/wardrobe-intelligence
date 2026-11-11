# 0003: The API contract is the generated OpenAPI document

- **Status:** accepted
- **Date:** 2026-11-10

## Context

The frontend (TypeScript) and API (Python/Pydantic) must agree on request, response and error
shapes. Hand-copying types drifts silently.

## Decision

- Pydantic schemas in `services/api/app/schemas/` are the single source of truth.
- `services/api/openapi.json` is generated (`uv run python -m app.contract`) and **committed**.
  `tests/test_contract.py` fails when it is stale.
- `apps/web/src/lib/api/schema.gen.ts` is generated from it (`npm run gen:api`) with
  `openapi-typescript@7.13.0`. CI fails if the generated file is stale.
- `openapi-typescript` declares a TypeScript 5 peer dependency, while the app uses TypeScript 7, so
  it runs through a pinned `npx` (its own isolated TypeScript) instead of being a dev dependency.
- Every error uses one envelope: `{"error": {"code", "message", "request_id", "details?"}}`.
  Error codes are part of the contract.

## Consequences

- Contract changes are visible in PR diffs (`openapi.json`, `schema.gen.ts`).
- The generator isn't in `package-lock.json`, so its version is pinned in the npm script instead.
- When the API starts calling inference, apply the same pattern to that boundary.
