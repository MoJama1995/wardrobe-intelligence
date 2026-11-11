# Claude Code environment

Everything lives in `.claude/`, is committed, and applies to everyone who opens the repository in
Claude Code. Personal overrides go in `.claude/settings.local.json` (gitignored).

## Skills (`.claude/skills/<name>/SKILL.md`)

Claude loads a skill when a task matches its description, or you can invoke one directly with
`/<name>`.

| Skill | Use it for |
| --- | --- |
| `architecture-review` | new components, boundaries, dependencies, cloud resources; deciding on ADRs |
| `ml-experimentation` | designing and recording experiments (Colab), baselines, honest comparisons |
| `dataset-management` | licences, provenance, splits and leakage, annotation, versioning |
| `model-evaluation` | metrics, hallucination checks, latency and cost, evaluation reports |
| `model-packaging` | notebook → versioned model release → services/inference |
| `api-development` | FastAPI work in services/api, including uploads |
| `frontend-development` | React/TS work in apps/web |
| `gcp-infrastructure` | Pulumi, IAM, Cloud Run/GPU, cost estimates |
| `testing-strategy` | choosing test levels; keeping the four quality dimensions separate |
| `project-management` | tickets, acceptance criteria, dependencies, ownership |
| `pr-review` | reviewing a branch against project standards (built-in `/code-review` still works) |
| `tutor` | the engineering course in `learning/`: lessons, quizzes and progress |

## Guardrails (`.claude/settings.json`)

Deliberately simple: a few permission rules and no hook scripts.

| Rule | Covers |
| --- | --- |
| **Never allowed** | `git commit` (you commit; Claude suggests the message) and **every** `pulumi` command, including `preview` (also via `uv run`); `gcloud projects delete`; reading `.env` files, private keys, service-account keys and gcloud / Pulumi credentials |
| **Ask every time** | `git push`, `gcloud run deploy`, `gcloud builds submit`, `docker push` |
| **No prompt** | tests, linters and type checks (`uv run pytest` / `ruff` / `mypy`, `npm run ...`, `make check`) |

Nothing runs automatically after Claude edits a file. Instead, CLAUDE.md asks Claude to run the
checks for every project it changed before it says it's done.

The rules match the start of a command, so treat them as a safety net, not a sandbox. Read what
Claude proposes before you approve a commit or a deploy.
