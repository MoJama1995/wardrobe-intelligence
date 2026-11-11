# Wardrobe Intelligence

Understand your own wardrobe from photos. Upload pictures of your clothes. Open-weight
vision-language models extract structured attributes (category, colour, pattern, material, ...) so
the collection can be searched and compared, and so recommendations can be explained with visual
evidence.

> **Status:** project foundation only. The repository structure, tooling, CI and Claude Code
> environment are in place. No model has been selected, no product features exist yet, and
> **nothing has been deployed**.

## Repository layout

```
apps/web/                 React + TypeScript (Vite) frontend
services/api/             FastAPI public API: validation, orchestration, persistence
services/inference/       VLM inference service: model loading, preprocessing, prompting
packages/ai-evaluation/   Model-agnostic evaluation metrics (used by experiments and CI)
experiments/              Colab notebooks and experiment configs (research only)
infrastructure/           Pulumi (Python) program for Google Cloud
docs/                     Architecture, ADRs, ML records, development guides
learning/                 Hands-on engineering course built around this repository
.agents/skills/           Agent skills (Claude Code and Codex)
.claude/                  Claude Code settings; skills symlink to .agents/skills
```

Each project builds and tests independently. Dependencies only point one way (see
[docs/architecture/overview.md](docs/architecture/overview.md)).

## Quick start

Prerequisites: [uv](https://docs.astral.sh/uv/), Node.js ≥ 24 (`.nvmrc` pins 26), Git. Docker,
the Pulumi CLI and gcloud are only needed for container builds and cloud work. Full instructions are
in [docs/development/setup.md](docs/development/setup.md).

```bash
make setup                      # uv sync in every Python project + npm ci in apps/web
make check                      # format, lint, type-check and test everything

# Run locally (two terminals)
cd services/api && uv run uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev      # http://localhost:5173, proxies /api → :8000
```

API docs (OpenAPI/Swagger) are at <http://localhost:8000/docs> while the API runs.

## How we work

- [learning/README.md](learning/README.md): new to the stack? Start the hands-on course here
  (Lesson 1 first)
- [CONTRIBUTING.md](CONTRIBUTING.md): branches, commits, PRs, definition of done
- [docs/README.md](docs/README.md): where each kind of documentation lives
- [docs/development/claude-code.md](docs/development/claude-code.md): the Claude Code skills and
  guardrails, and how to work with them
