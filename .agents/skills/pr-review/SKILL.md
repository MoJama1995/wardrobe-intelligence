---
name: pr-review
description: Review a branch, pull request or diff against Wardrobe Intelligence's own standards (correctness, security and privacy, error handling, tests, ML validity, infrastructure safety, unnecessary abstraction) and give actionable, prioritised feedback. Use for "review my changes", "review this PR", or a self-review before opening a pull request. For a deep automated bug hunt, the built-in /code-review (Claude Code) or /review (Codex) is also available.
---

# PR review

Named `pr-review` so it doesn't replace Claude Code's built-in `/code-review`; a project skill with
that name would override it. Use both: `/code-review` hunts for bugs, and this skill checks
project conventions. In Codex, the built-in `/review` plays the same role as `/code-review`.

## Workflow

1. **Collect the change:** `git diff main...HEAD --stat`, then the full diff. Use a PR via `gh` only
   if the user named one. List the affected projects.
2. **Understand the intent** from the PR description or ticket. If there is none, state the intent
   you assumed.
3. **Run the checks** for affected projects (`make check`, or per project). Don't hand-review what
   Ruff, mypy, oxlint and Prettier enforce. Record the exact commands and results.
4. **Read the surrounding code,** not only the diff: callers, tests and the schemas involved.
5. **Review in priority order,** using the checklist below.
6. **Write findings** in the output format.

## Checklist (priority order)

1. **Correctness:** edge cases (empty, `None`, huge or rotated images, unicode), metric
   denominators, blocking calls inside `async def`, missing timeouts, error paths.
2. **Security and privacy:** no secrets; uploads validated by magic bytes and size; EXIF stripped;
   no user-controlled GCS object paths; no personal data, tokens or images in logs; least-privilege
   IAM; new dependencies justified; `trust_remote_code` avoided or pinned.
3. **Contracts:** `openapi.json` and `schema.gen.ts` regenerated together; error codes stable;
   breaking changes flagged and versioned.
4. **ML validity:** model and dataset revisions pinned; results compared with a baseline on a
   versioned eval set; no test-set leakage; notebook and service preprocessing match.
5. **Infrastructure:** labels and names via `stack_config`; cost estimate present; preview output
   attached; nothing applied to prod; stateful resources not being replaced.
6. **Tests:** new behaviour and failure paths tested at the right level; deterministic; skipped tests
   justified.
7. **Simplicity:** every new abstraction has two or more real uses; no speculative configuration; no
   dead code.
8. **Docs:** README, ADR (for meaningful decisions), `.env.example` for new settings.

## Required output

```
## Review: <branch or PR>
Verdict: approve | approve with nits | request changes
Summary: <1–3 lines>

Blocking
- path/to/file.py:42: <problem>. Why: <impact>. Fix: <concrete suggestion>
Should fix
- ...
Nits
- ...

Checks run: <exact commands → result>
Not checked: <e.g. GPU evaluation, Docker build, deployed behaviour>
```

## Common mistakes

- Style nits that tooling already enforces.
- Vague feedback ("clean this up") with no location or fix.
- Approving claims like "the model is better" without an eval report.
- Saying checks pass without running them, or not listing what wasn't checked.
