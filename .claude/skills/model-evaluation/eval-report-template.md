# Evaluation: <candidate> vs <baseline>, YYYY-MM-DD

**Decision:** <what this report decides> · **Thresholds (set before running):** <...>
**Recommendation:** ship / don't ship / needs more data, because <one line>

## What was evaluated

| | Baseline | Candidate |
| --- | --- | --- |
| Model @ revision | | |
| Adapter / registry version | | |
| Prompt version | | |
| Precision / hardware | | |

Eval dataset `<name> <version>`, split `<test>`, n = <count>. Decoding: greedy, max_new_tokens <n>.

## Task quality (95% paired bootstrap CI)

| Field | Baseline | Candidate | Δ | Coverage (cand.) | Unsupported rate (cand.) |
| --- | --- | --- | --- | --- | --- |

JSON parse failures: baseline <n>, candidate <n>.

## Slices

| Slice | n | Baseline | Candidate |
| --- | --- | --- | --- |
| flat-lay | | | |
| on-body | | | |
| low light | | | |

## Grounding (human review of <n> outputs)

Unverifiable claims: baseline <x%>, candidate <y%>. Examples (ids): <...>

## Performance (Cloud Run L4 unless stated)

| | p50 warm | p95 warm | cold start | peak GPU mem | $/1k images |
| --- | --- | --- | --- | --- | --- |

## Failure analysis

<categories with counts, 3–5 representative example ids>

## Caveats

<sample size, label noise, anything not measured>
