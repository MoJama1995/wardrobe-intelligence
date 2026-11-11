---
name: architecture-review
description: Review a proposed design, new component, service boundary, dependency, data flow or cloud resource for Wardrobe Intelligence. Use before adding a service/package, introducing async processing (Pub/Sub, jobs), changing what talks to what, adding runtime dependencies, or when asked "is this the right architecture?". Flags unnecessary complexity, coupling, cost and privacy risks, and decides whether an ADR is needed.
---

# Architecture review

Scope: structure, boundaries, data flow, operational and financial impact.
Line-level code quality belongs to `pr-review`.

## Project boundaries (the rules you are enforcing)

```
apps/web ──HTTP (openapi.json)──▶ services/api ──HTTP──▶ services/inference
                                       │                       │
                                       ▼                       ▼
                               Cloud Storage / DB      model registry (GCS)
experiments/ ──imports──▶ packages/ai-evaluation ◀── (CI, eval jobs)
infrastructure/  (Pulumi only, imports nothing from the apps)
```

- `apps/web` talks only to `services/api`, using types generated from `services/api/openapi.json`.
- `services/api` owns validation, persistence, auth and orchestration. **No ML dependencies**
  (no torch/transformers/Pillow-based model code). It calls inference over HTTP.
- `services/inference` owns model loading, preprocessing, prompting and output parsing.
  It is stateless: no database writes, no user logic.
- `packages/ai-evaluation` never imports from `services/*` or any specific model.
- Nothing imports from `experiments/`. Experiments may import `packages/*`.
- Each Python project is an independent uv project. There are no path dependencies between services.
- Personal wardrobe photos are personal data. EXIF can carry GPS location, and photos can contain faces.

## Workflow

1. **Name the requirement.** Write one sentence on the user-facing need this design serves. If you
   can't name one, stop and say so.
2. **Map it.** List the affected components and draw the new dependency arrows. Reject any arrow
   that violates the boundaries above, or any cycle.
3. **Challenge the complexity.** Can an existing component do it? What is the simplest version
   that works for the MVP? Defaults: synchronous before async; one region; no queue until a
   measured latency or timeout problem requires one; no shared "common" package until two
   services need identical code *and* duplication has caused a bug.
4. **Cost and operations.** Ask what runs while idle (min instances, GPUs), what grows (storage,
   logs) and what crosses regions (egress). Estimate the monthly cost at dev usage and at idle;
   see `.agents/skills/gcp-infrastructure/cost-reference.md`.
5. **Failure modes.** Cover inference that is cold, slow or down; timeouts, retries and idempotency;
   what the user sees in each case.
6. **Privacy.** Where photos are stored, who can read them, retention and deletion, whether EXIF is
   stripped, and whether user data could reach training or evaluation sets (it must not without
   consent).
7. **Reversibility.** Two-way doors can be decided in the PR. One-way doors need an ADR.
8. **Verdict.**

## Required output

```
## Architecture review: <change>
Verdict: approve | approve with changes | reject
Requirement served: <one sentence>
Findings:
  - [high|medium|low] <issue> → <recommendation>
Cost / ops impact: <idle $/month, usage $/month, new on-call surface>
Privacy impact: <none | details>
ADR needed: yes (<proposed title>) | no (<why>)
Open questions: <list>
```

Write ADRs with `docs/decisions/0000-template.md` and give them the next free number.

**An ADR is required for:** a new service, package or top-level directory; any cloud resource with
recurring cost; a new runtime dependency on the request path; a model or serving-runtime choice;
moving from sync to async; changes to data storage, retention or contracts.

## Common mistakes

- Designing for scale nobody has: queues, microservices or Kubernetes for two developers and no users.
- Letting `services/api` import torch "just for preprocessing". Preprocessing belongs to inference.
- Leaving a GPU service with `min_instances=1` in dev. That's roughly $770/month for one idle L4.
- Hand-copying schemas between services instead of generating them from OpenAPI.
- ADRs written after the fact, with no alternatives considered.
- Forgetting that a frontend on another origin needs CORS (`API_CORS_ORIGINS`).
