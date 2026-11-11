---
name: project-management
description: Plan Wardrobe Intelligence work for a two-developer team. Breaks features into small vertical tickets with testable acceptance criteria, dependencies, estimates and owners, separates research spikes from implementation, tracks technical debt, and keeps the roadmap and definition of done. Use when planning a feature or milestone, writing tickets or issues, estimating, prioritising, or deciding who does what.
---

# Project management

## Team

- **Developer A:** software and cloud (backend, infrastructure, CI/CD, frontend). Learning goal: ML
  infrastructure, model deployment, VLMs.
- **Developer B:** ML (datasets, experiments, evaluation, fine-tuning). Learning goal: Git, testing,
  software engineering, deployment.

Ownership plays to these strengths, but **the reviewer is always the other developer**. Each
milestone includes at least one ticket deliberately owned across domains, so both understand the
whole system.

## Ticket areas and types

Areas: `ml-research`, `backend`, `frontend`, `infrastructure`, `integration`, `testing`.
Types: **Research** (time-boxed; the output is a findings doc or decision, not production code),
**Implementation**, **Integration**, **Chore/Debt**.

Template: [ticket-template.md](ticket-template.md).
Sizes: **S** ≤ ½ day, **M** 1–2 days, **L** 3–5 days. Anything bigger gets split.

## Workflow

1. **Outcome:** state the user-visible result, e.g. "I upload a photo of a shirt and see its
   category and colour".
2. **Slice vertically:** a thin end-to-end path first (fake model → real API → UI), then deepen it.
   Avoid horizontal tickets like "build all endpoints".
3. **Research before implementation:** spikes for unknowns (dataset licence, model choice, GPU cold
   start), each with a time-box and a decision as output.
4. **Dependencies and critical path:** e.g. licence check → eval set v1 → baseline eval → inference
   contract → API endpoint → UI. Mark blocking links explicitly.
5. **Owner and reviewer** for every ticket, with a one-line "learning note" for the reviewer.
6. **Estimate and split** anything that is L or bigger.
7. **Order** by risk reduction, then value: tackle the unknown with the biggest blast radius first.

## Definition of done (every ticket)

- [ ] Merged through a reviewed PR; CI green; no direct commits to `main`
- [ ] Tests at the right level (see `testing-strategy`); results reported honestly
- [ ] Docs updated (README / service docs); ADR if a meaningful decision was made
- [ ] ML work: evaluation report against the baseline, with dataset and model versions recorded
- [ ] Infrastructure work: preview reviewed, cost noted, nothing applied to prod by Claude
- [ ] No new TODO without a linked issue

## Tracking

GitHub Issues with labels for area, type and `tech-debt`, plus a Project board (Backlog → Ready →
In progress → In review → Done) and one milestone per MVP increment. Tech-debt issues state their
cost of delay and are reviewed at each milestone. **Creating issues or PRs is outward-facing: only
do it with `gh` when the user asks.**

## Common mistakes

- Acceptance criteria that can't be tested ("works well", "is fast").
- ML tickets saying "improve accuracy" with no baseline, metric or threshold.
- Research tickets with no time-box, or code from a spike merged as production code.
- Hidden dependencies on data access, licences, GPU quota or billing setup.
- One person owning an area forever, so the other never learns it.
