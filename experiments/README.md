# Experiments (research only)

Google Colab is our research environment. Code here can be messy, but **results must be
reproducible**, and **nothing in production may import from this folder** or depend on a notebook,
its runtime state or anyone's Drive.

## Layout (create folders as you need them)

```
experiments/
├── notebooks/   NN-<slug>.ipynb, e.g. 01-baseline-qwen3-vl-2b.ipynb
├── configs/     <EXP-ID>.yaml: model + revision, prompt, dataset version, params, seed
├── data/        local dataset cache       (gitignored)
├── results/     raw predictions, metrics  (gitignored; upload what matters to GCS)
└── checkpoints/ training outputs          (gitignored)
```

## First cell of every notebook

```python
# Reproducibility header: fill in, then run before anything else.
EXPERIMENT_ID = "EXP-YYYYMMDD-slug"
REPO_COMMIT = "<git sha of this repo>"       # code and metrics version
DATASET = ("<name>", "<version>")
MODEL = ("<org/name>", "<hub commit sha>")   # never just "main"
SEED = 0

%pip install -q "transformers==<x.y.z>" "datasets==<x.y.z>" "peft==<x.y.z>" \
  "git+https://github.com/<org>/<repo>@{REPO_COMMIT}#subdirectory=packages/ai-evaluation"

import torch, random, numpy as np
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")
```

Then follow `.agents/skills/ml-experimentation/SKILL.md`: baseline first, change one thing, score
with `ai_evaluation`, and write the record in `docs/ml/experiments/`.

## Secrets in Colab

Use Colab's **Secrets** panel (`from google.colab import userdata`) for the HF token. Never paste
tokens into cells, which are saved in the notebook JSON.
