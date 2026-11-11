---
name: model-evaluation
description: Evaluate VLM quality and performance for Wardrobe Intelligence. Covers task metrics for garment attribute extraction, retrieval and question answering, plus hallucination and unsupported claims, calibration, latency, memory and cost, failure analysis, and baseline vs candidate reports. Use when deciding whether a model, prompt or fine-tune is better or good enough to ship, building evaluation pipelines in packages/ai-evaluation, or writing an evaluation report.
---

# Model evaluation

An evaluation exists to support a decision. Write the decision and the acceptance thresholds down
**before** running anything.

## Pick metrics from product requirements, not from a menu

| Product capability | Metrics |
| --- | --- |
| Extract attributes from a garment photo | Per-field accuracy, coverage (abstentions), `unsupported_rate` (asserting what isn't visible), JSON parse-failure rate |
| "Find similar items" in my wardrobe | recall@k, MRR on human-judged pairs |
| Answer questions about an item | Exact or semantic correctness on a reviewed QA set; unsupported-claim rate |
| Explanations / recommendations | Human-reviewed groundedness: every visual claim must be checkable in the image |
| Confidence shown to users | Calibration (reliability buckets, ECE), accuracy at fixed coverage |
| Any production path | p50/p95 latency cold vs warm, peak GPU memory, $ per 1k images on target hardware |

Keep these separate. One blended score hides a broken field.

## Conventions

- Metrics live in `packages/ai-evaluation` as pure, unit-tested functions. Add new metrics there,
  not in notebooks.
- Every report records the eval dataset version, the model id plus revision, the prompt version,
  decoding params and hardware.
- Model output must be structured JSON validated against a schema. Invalid output counts as a
  failure and is reported separately.
- Reports go in `docs/ml/evaluations/<date>-<slug>.md`, from
  [eval-report-template.md](eval-report-template.md).
- CI runs only the metric unit tests. Model evaluations run in Colab or a GPU job, because CI has
  no GPU. Never mark a GPU evaluation as passed in CI.

## Workflow

1. **Decision and thresholds.** For example: "Ship candidate if material accuracy ≥ baseline + 5pp
   and unsupported_rate ≤ baseline, p95 latency ≤ 4 s warm on L4."
2. **Run baseline and candidate** on identical inputs and the same eval version, with greedy
   decoding.
3. **Score** with `ai_evaluation.score_attributes`, plus a paired bootstrap 95% CI per field.
4. **Slice** by category, viewpoint (flat-lay vs on-body), lighting and resolution.
5. **Failure analysis.** Look at at least 30 failures per key field and label each one: taxonomy
   confusion, genuinely ambiguous, hallucination, parse error, preprocessing bug or label error.
   Label errors are fixed in a *new* dataset version.
6. **Hallucination review.** Have a human check claims on a random sample of at least 50 outputs.
   Count claims that can't be verified from the image.
7. **Performance** on target hardware (Cloud Run L4), measured separately from Colab numbers.
8. **Report and recommend** against the thresholds from step 1.

## Common mistakes

- Dropping abstentions from the denominator, which inflates accuracy.
- Counting "navy" vs "blue" as wrong when the taxonomy never decided which is right.
- Using an LLM as judge without calibrating it against human labels first.
- Comparing latency measured on different GPUs, or reporting warm latency only.
- Evaluating on data the model was fine-tuned on (check the manifests).
- Trusting public leaderboard numbers for our task. Measure on our data.
