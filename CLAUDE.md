# Wardrobe Intelligence: notes for Claude

A personal wardrobe intelligence product. People photograph their clothes. Open-weight
vision-language models (VLMs) extract structured garment attributes, then search, compare and
recommend over the user's own collection. Two developers are learning the full lifecycle together,
so explain non-obvious decisions briefly and prefer the simplest design that works.

## Map

| Path | What | Skill to load |
| --- | --- | --- |
| `apps/web` | React 19 + TS 7 + Vite frontend | `frontend-development` |
| `services/api` | FastAPI public API, no ML dependencies | `api-development` |
| `services/inference` | VLM inference service (runtime not chosen yet) | `model-packaging` |
| `packages/ai-evaluation` | model-agnostic metrics and evaluators | `model-evaluation` |
| `experiments/` | Colab notebooks, configs. Research only; nothing imports it | `ml-experimentation`, `dataset-management` |
| `infrastructure/` | Pulumi (Python) for Google Cloud | `gcp-infrastructure` |
| `docs/decisions/` | ADRs; read before re-litigating a decision | `architecture-review` |
| `learning/` | engineering course: lessons, answer keys, progress, web viewer | `tutor` |

Planning: `project-management`. Testing choices: `testing-strategy`. Reviews: `pr-review`.

## Commands (run inside each project)

- Python projects: `uv sync`, `uv run pytest`, `uv run ruff check .`, `uv run ruff format .`, `uv run mypy`
- Web: `npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`
- Everything: `make check` from the repo root
- API contract changed: `uv run python -m app.contract` (services/api), then `npm run gen:api` (apps/web)

## Rules

- Work on a feature branch; never commit to or push `main`. PRs for every change (CONTRIBUTING.md).
- Never claim tests or checks passed unless you ran them in this session. Report skipped and
  not-run checks explicitly.
- Never run Pulumi or create cloud resources. Write the infrastructure code and a cost estimate;
  the user runs `pulumi preview` and `pulumi up` themselves.
- Never commit. Leave changes in the working tree and suggest a commit message; the user commits.
- No secrets, `.env` files, credentials, datasets or model weights in Git.
- Pin model and dataset revisions (commit SHAs). Production never depends on Colab or Drive.
- Model changes are judged against a baseline on a versioned evaluation set, never by eyeballing.
- Wardrobe photos are personal data: strip EXIF (GPS) and never log images or personal data.
- Add dependencies and abstractions only for a demonstrated need, and record meaningful decisions
  as ADRs.

## Guardrails (see docs/development/claude-code.md)

`git commit` and every `pulumi` command are denied. `git push` and deploy commands always ask the
user first. Destructive cloud commands and reads of secret files are denied. Nothing checks your work automatically, so
run the checks for every project you changed (`make check`, or the project's own commands)
before saying you're done.
