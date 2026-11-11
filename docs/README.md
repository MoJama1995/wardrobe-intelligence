# Documentation map

Keep each kind of knowledge in its place, so readers know how much to trust it.

| Kind | Where | Lifetime |
| --- | --- | --- |
| **Architectural decisions** | `docs/decisions/NNNN-*.md` (ADRs) | permanent; superseded, never edited away |
| **Architecture overview** | `docs/architecture/` | kept current |
| **Research findings** (dataset licences, model comparisons, cost research) | `docs/ml/`, `.claude/skills/gcp-infrastructure/cost-reference.md` | dated; re-verify before relying on them |
| **Experiment records and evaluation reports** | `docs/ml/experiments/`, `docs/ml/evaluations/` | permanent, immutable once written |
| **Implementation docs** (how to run or change a component) | the component's own `README.md` | kept current with the code |
| **Development guides** | `docs/development/` | kept current |
| **Temporary experimental notes** | notebooks and personal scratch space, **not** `docs/` | disposable |

## Index

- [architecture/overview.md](architecture/overview.md): components, boundaries, open decisions
- [decisions/](decisions/): ADRs ([template](decisions/0000-template.md))
- [ml/README.md](ml/README.md): datasets, experiments and evaluations
- [development/setup.md](development/setup.md): local environment, running and troubleshooting
- [development/claude-code.md](development/claude-code.md): skills and guardrails
- [../learning/](../learning/README.md): hands-on engineering course built around this repository (kept outside `docs/`)
