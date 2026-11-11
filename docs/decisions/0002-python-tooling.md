# 0002: Python tooling: uv projects per service, Ruff, mypy strict, Python 3.12

- **Status:** accepted
- **Date:** 2026-11-10

## Context

Four Python projects with very different dependency weights. Inference will need torch and model
runtimes (GBs); the API must stay small. Developer B is new to Python packaging and testing.

## Decision

- **uv** manages Python versions, environments and lockfiles. Each project (`services/api`,
  `services/inference`, `packages/ai-evaluation`, `infrastructure`) is an **independent uv
  project** with its own `uv.lock` and `.venv`. We deliberately do *not* use a uv workspace.
- Applications set `[tool.uv] package = false`; `ai-evaluation` is a real library (`uv_build`) so
  Colab can `pip install` it from Git at a pinned commit.
- **Python 3.12** (`.python-version` at the root).
- **Ruff** for formatting and linting, configured once in the root `ruff.toml` (rules include
  bandit security checks and a ban on `print`).
- **mypy `strict = true`** with the Pydantic plugin; tests are type-checked too.
- **pytest** with `--strict-markers`; markers `slow`, `integration`, `gpu`, `model` are registered in
  every project.
- Starlette's test client uses `httpx2` (Starlette deprecated `httpx` for it).

## Alternatives considered

| Option | Why not |
| --- | --- |
| uv workspace (one lock) | Docker builds need the whole workspace; the API lock would carry inference's dependency resolution |
| Poetry / pip-tools | Slower; separate tool for Python installs; uv is the current standard |
| Pyright | Fast, but mypy's Pydantic plugin and familiarity won for now |

## Consequences

- Dev tools are declared per project (some duplication), but every project builds alone.
- Dependency upgrades are per project: `uv lock --upgrade` in each.
