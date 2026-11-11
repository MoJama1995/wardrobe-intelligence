# ai-evaluation

Model-agnostic evaluation code for Wardrobe Intelligence. The same functions score
a Colab experiment, a CI regression check and a sample of production traffic, so
results are comparable.

**Rules**

- No dependency on `services/*` or on any specific model. Evaluators take
  predictions and references; producing predictions is the caller's job.
- Metrics are pure functions with unit tests. A metric change is a breaking
  change for historical comparisons: record it in the evaluation report.
- Evaluation *data* never lives here. Datasets are versioned outside Git (see
  `docs/ml/README.md`); this package only reads them.

## What exists

| Module | Purpose |
| --- | --- |
| `attributes.py` | Per-field scoring for structured garment attributes: accuracy, coverage (abstentions) and unsupported claims (asserting something not visible). |

Planned, added only when needed: `retrieval.py` (recall@k / MRR for
"find similar items"), `reporting.py` (baseline vs candidate comparison tables)
and a dataset loader for the versioned evaluation set.

## Use

```python
from ai_evaluation import score_attributes

scores = score_attributes(predictions, references, fields=["category", "colour", "material"])
scores["material"].unsupported_rate  # how often the model invented a fabric
```

From Colab, install a pinned commit so results are reproducible:

```bash
pip install "git+https://github.com/<org>/<repo>@<commit-sha>#subdirectory=packages/ai-evaluation"
```

## Develop

```bash
uv sync
uv run pytest
uv run ruff check . && uv run ruff format --check . && uv run mypy
```
