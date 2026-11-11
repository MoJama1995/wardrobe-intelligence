---
name: ml-experimentation
description: Design, run and record ML experiments for Wardrobe Intelligence, such as comparing VLMs, prompts, LoRA/QLoRA fine-tunes or hyperparameters, usually in Google Colab. Use when planning an experiment, writing or reviewing a notebook, asking "is model/prompt B better than A?", or turning results into a conclusion. Enforces baselines, fixed evaluation data, pinned versions and honest statistics.
---

# ML experimentation

Colab is the research environment. Nothing in production may depend on a notebook, its runtime
state or anyone's Google Drive (see `model-packaging`).

## Conventions

- **ID:** `EXP-YYYYMMDD-<slug>`, e.g. `EXP-20261115-qwen3vl-2b-baseline`.
- **Notebook:** `experiments/notebooks/NN-<slug>.ipynb`. The first cell installs pinned versions,
  sets seeds, prints the GPU type, the repo commit SHA and the dataset version.
- **Config:** `experiments/configs/<exp-id>.yaml` records the model id **plus revision SHA**, prompt
  version, dataset name and version, decoding params, hyperparameters and seed. Commit it
  **before** running.
- **Raw predictions:** save them as JSONL, one line per example id, to GCS or Drive. They are not
  committed (`experiments/results/` is gitignored). Keep them: failure analysis and re-scoring need
  them.
- **Metrics:** always use `packages/ai-evaluation`, installed at a pinned commit. Never compute
  metrics ad hoc in a cell.
- **Record:** `docs/ml/experiments/<exp-id>.md` from
  [experiment-record-template.md](experiment-record-template.md). Negative results get recorded too.

## Workflow

1. **Hypothesis.** One falsifiable sentence with the metric and threshold, e.g. "LoRA on 2k
   labelled garments raises material accuracy by at least 5pp over the baseline without raising
   `unsupported_rate`."
2. **Baseline first.** A pretrained model plus a prompt, on the same evaluation split. No baseline
   means no experiment.
3. **Change one thing.** Keep the same eval dataset version, preprocessing, decoding params
   (temperature 0 for extraction) and seed. Only the variable under test changes.
4. **Splits.** Tune prompts and hyperparameters on the `dev` split. Touch `test` once per decision.
5. **Run,** saving raw predictions and logging GPU type, peak memory and latency.
6. **Evaluate** per field (accuracy, coverage, unsupported rate). Slice by garment category,
   flat-lay vs on-body, and lighting.
7. **Is the difference real?** Use a paired bootstrap 95% CI over examples and report `n`. With
   fewer than about 200 examples, don't claim gains under about 5pp. Report the mean and spread over
   at least 3 seeds for fine-tunes.
8. **Write the record,** with the conclusion stated as supported, not supported or inconclusive.

## Required output

An experiment record (template linked above) with config, metrics vs baseline with CIs, a failure
analysis sample, cost and runtime, and a conclusion with a next step.

## Common mistakes

- Tuning the prompt while looking at test-set errors. That leaks the test set.
- Comparing runs that used different dataset versions or preprocessing.
- `from_pretrained("org/model")` without `revision=`. The Hub copy can change under you.
- Reporting the best seed or best checkpoint instead of the planned one.
- Using sampling (temperature > 0) for attribute extraction, then calling the noise an improvement.
- Comparing latency across different Colab GPUs (T4 vs L4 vs A100).
- QLoRA 4-bit in Colab vs bf16 in production: re-evaluate in the production precision.
- Leaving results only in notebook output cells. They are lost when the runtime resets.
