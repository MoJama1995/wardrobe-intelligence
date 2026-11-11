# Contributing

## Git workflow

1. Branch from an up-to-date `main`: `git switch -c <type>/<short-topic>`, where `<type>` is one of
   `feat`, `fix`, `ml`, `infra`, `docs`, `chore`, `test`.
2. Make small, focused commits with descriptive messages:
   ```
   feat(api): validate uploaded image type by magic bytes

   Content-Type headers are client-controlled; checking the first bytes
   rejects renamed non-images before they reach Pillow.
   ```
   Use an imperative subject (≤ 72 characters) with a scope (`api`, `web`, `inference`, `eval`,
   `infra`, `ml`, `claude`). The body explains *why*.
3. Push the branch and open a pull request. **Nothing goes directly to `main`.** The other developer
   reviews (see `.agents/skills/pr-review/`).
4. Merge when CI is green and the review is approved. Prefer squash merges for small PRs.

Never commit secrets, `.env` files, credentials, datasets or model weights. `.gitignore` catches the
common cases, and the CI secret scan (gitleaks) catches the rest. If a
secret is ever committed, **rotate it immediately**: removing it from history isn't enough.

## Definition of done

- [ ] Reviewed PR; CI green
- [ ] Tests at the right level (`.agents/skills/testing-strategy/`), including failure paths
- [ ] README or service docs updated; ADR in `docs/decisions/` for meaningful decisions
- [ ] API contract regenerated if routes or schemas changed (`openapi.json` + `schema.gen.ts`)
- [ ] ML changes: evaluation report against the baseline, with dataset and model revisions recorded
- [ ] Infrastructure changes: `pulumi preview` output and cost estimate in the PR
- [ ] No TODO without a linked issue

## Ownership

Developer A leads software and cloud work (backend, infrastructure, CI, frontend). Developer B leads
ML work (datasets, experiments, evaluation, fine-tuning). The **reviewer is always the other
developer**, so both of you learn the whole system.
