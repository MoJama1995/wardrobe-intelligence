# 0001: Modular monorepo with independent projects

- **Status:** accepted
- **Date:** 2026-11-10
- **Deciders:** Developer A, Developer B

## Context

Two developers are building a VLM product end to end. The proposed structure separated frontend,
API, inference, evaluation, experiments and infrastructure. We want that separation without
building enterprise structure before it is needed.

## Decision

One repository with independently buildable projects: `apps/web`, `services/api`,
`services/inference`, `packages/ai-evaluation`, `infrastructure`. `experiments/` holds research.
Dependencies point one way (see `docs/architecture/overview.md`).

Changes from the originally proposed structure:

| Proposed | Decision | Why |
| --- | --- | --- |
| `packages/shared-types` | removed | Types are generated from the API's OpenAPI document ([0003](0003-api-contract-via-openapi.md)); a hand-maintained package would duplicate schemas |
| `packages/config` | removed | One root `ruff.toml` is inherited by every Python project; the frontend has its own config |
| `experiments/datasets/` | removed | Data never lives in Git; datasets are versioned in GCS or the HF Hub (`dataset-management` skill) |
| Empty folders (`components/`, `hooks/`, `services/`, `types/`, `repositories/`, `networking.py`, `events.py`, ...) | created when first needed | Empty structure suggests decisions that haven't been made |
| `apps/web/Dockerfile` | deferred | Frontend hosting is still open (Cloud Run vs Firebase Hosting vs GCS + CDN) |
| `code-review` skill | named `pr-review` | A project skill named `code-review` would replace Claude Code's built-in `/code-review` |

## Alternatives considered

| Option | Why not |
| --- | --- |
| Separate repositories per service | Too much overhead for two people; contract changes would span repos |
| One Python project for API and inference | Couples a cheap CPU service to GPU-sized dependencies and images |

## Consequences

- Each project has its own lockfile, environment and CI job, so the projects never block each other.
- New components must be added to `PY_PROJECTS` in the `Makefile` (Python projects) and to the CI
  matrix.
