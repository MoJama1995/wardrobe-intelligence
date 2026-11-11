# EXP-YYYYMMDD-slug: <one-line title>

- **Owner:** <name> · **Date:** YYYY-MM-DD · **Status:** planned | running | done
- **Hypothesis:** <falsifiable sentence with metric and threshold>
- **Decision this informs:** <e.g. choose baseline model for MVP>

## Setup

| Item | Value |
| --- | --- |
| Repo commit | `<sha>` |
| Model | `<org/name>` @ revision `<sha>` (+ adapter `<registry path>`) |
| Prompt version | `<id>` (link) |
| Dataset | `<name>` `<version>`, split `<dev/test>`, n = <count> |
| Decoding | temperature 0, max_new_tokens <n>, ... |
| Hyperparameters | <lr, epochs, LoRA rank/alpha/targets, batch size> |
| Seed(s) | <list> |
| Hardware | <Colab GPU type>, precision <bf16/4-bit> |
| Config file | `experiments/configs/<exp-id>.yaml` |
| Raw predictions | `<gs:// or Drive path>` |

## Results (vs baseline)

| Field | Baseline acc | Candidate acc | Δ (95% CI) | Coverage | Unsupported rate |
| --- | --- | --- | --- | --- | --- |
| category | | | | | |
| colour | | | | | |
| material | | | | | |

Latency p50/p95: <ms> · Peak GPU memory: <GB> · JSON parse failures: <n>

## Failure analysis

Sample of <n> failures, categorised: taxonomy confusion / genuinely ambiguous / hallucination /
parse error / preprocessing bug / label error. Include 3–5 representative examples (ids only, no
personal images).

## Conclusion

Supported | not supported | inconclusive, because <evidence>. **Next step:** <...>
