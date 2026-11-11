# Local development setup

## Prerequisites

| Tool | Why | Install (macOS) |
| --- | --- | --- |
| Git | version control | Xcode CLT |
| [uv](https://docs.astral.sh/uv/) | Python versions, environments, lockfiles | `brew install uv` |
| Node.js ≥ 24 (`apps/web/.nvmrc` pins 26) | frontend | `brew install node` or nvm/fnm |
| Docker *(optional)* | build service images locally | Docker Desktop / OrbStack |
| Pulumi CLI, gcloud *(cloud work only)* | infrastructure | `brew install pulumi`, Google Cloud SDK |

uv installs Python 3.12 for each project automatically (from `.python-version`).

## First-time setup

```bash
make setup        # uv sync in each Python project, npm ci in apps/web
make check        # should finish green
```

## Running locally

```bash
# Terminal 1: API on :8000 (docs at http://localhost:8000/docs)
cd services/api && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: frontend on :5173 (proxies /api/* to :8000)
cd apps/web && npm run dev
```

The inference service runs the same way on another port
(`cd services/inference && uv run uvicorn app.main:app --reload --port 8001`), but it serves no
model yet.

## Configuration

Each service reads environment variables with its own prefix (`API_`, `INFERENCE_`, `VITE_`). Copy
`.env.example` to `.env` (or `.env.local` for the web app). These files are gitignored and Claude is
denied access to them. Never commit real values.

## Colab

Notebooks live in `experiments/notebooks/`. Open them in Colab from GitHub, and install
`packages/ai-evaluation` at a **pinned commit** (see `experiments/README.md`). Anything production
needs is packaged into the model registry (`model-packaging` skill).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ModuleNotFoundError` when running a Python project | `cd <project> && uv sync` |
| `npm run ...` can't find `vite`, `tsc` or `vitest` | `cd apps/web && npm ci` |
| `test_committed_openapi_matches_code` fails | `uv run python -m app.contract` (services/api), then `npm run gen:api` (apps/web) |
| Frontend shows "API unavailable" | Start the API on :8000; check the terminal for errors |
| Docker image won't run on Cloud Run (exec format error) | Build with `--platform linux/amd64` on Apple Silicon |
| uv warns that `~/.local/bin` is not on PATH | Harmless for this repo (`uv run` finds Python itself) |
