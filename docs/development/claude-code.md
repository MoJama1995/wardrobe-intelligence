# Coding agent environment (Claude Code and Codex)

The repository works with both Claude Code and Codex. Everything below is committed and applies to
everyone who opens the repository.

| What | Real file | Claude Code reads | Codex reads |
| --- | --- | --- | --- |
| Project notes and rules | `AGENTS.md` | `CLAUDE.md` (symlink to `AGENTS.md`) | `AGENTS.md` |
| Skills | `.agents/skills/` | `.claude/skills` (symlink to `.agents/skills`) | `.agents/skills/` |
| Permission guardrails | `.claude/settings.json` | yes | **no** (see below) |

Edit the real files, not the symlinks. Personal Claude Code overrides go in
`.claude/settings.local.json` (gitignored).

## Skills (`.agents/skills/<name>/SKILL.md`)

The skills follow the open Agent Skills format: a folder with a `SKILL.md` file whose frontmatter
holds `name` and `description`. The agent loads a skill when a task matches its description, or
you can invoke one directly: `/<name>` in Claude Code, `$<name>` (or `/skills`) in Codex.

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
| `pr-review` | reviewing a branch against project standards (built-in `/code-review` in Claude Code, `/review` in Codex, still work) |
| `tutor` | the engineering course in `learning/`: lessons, quizzes and progress |

## Guardrails (`.claude/settings.json`)

Deliberately simple: a few permission rules and no hook scripts.

| Rule | Covers |
| --- | --- |
| **Never allowed** | `git commit` (you commit; Claude suggests the message) and **every** `pulumi` command, including `preview` (also via `uv run`); `gcloud projects delete`; reading `.env` files, private keys, service-account keys and gcloud / Pulumi credentials |
| **Ask every time** | `git push`, `gcloud run deploy`, `gcloud builds submit`, `docker push` |
| **No prompt** | tests, linters and type checks (`uv run pytest` / `ruff` / `mypy`, `npm run ...`, `make check`) |

Nothing runs automatically after the agent edits a file. Instead, `AGENTS.md` asks the agent to
run the checks for every project it changed before it says it's done.

The rules match the start of a command, so treat them as a safety net, not a sandbox. Read what
the agent proposes before you approve a commit or a deploy.

**Codex doesn't read `.claude/settings.json`.** In Codex these limits are only instructions in
`AGENTS.md` and the `gcp-infrastructure` skill, not enforced rules. Keep Codex's approval mode on
(the default asks before commands that leave the sandbox), and read each command before you approve
it, especially `git commit`, `pulumi` and `gcloud`.
