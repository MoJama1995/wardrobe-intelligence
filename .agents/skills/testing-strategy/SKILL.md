---
name: testing-strategy
description: Decide what to test and at which level for Wardrobe Intelligence (unit, API integration, contract, frontend, end-to-end, ML preprocessing and inference contracts, infrastructure), and keep software correctness, model quality, model performance and infrastructure reliability separate. Use when planning tests for a feature, adding a component, fixing flaky or failing tests, or asking "is this tested enough?".
---

# Testing strategy

## Four dimensions: never conflate them

| Dimension | Question | Tool / location | Runs |
| --- | --- | --- | --- |
| Software correctness | Does the code do what it claims? | pytest, Vitest, contract tests | before the agent finishes a task, every PR (CI) |
| Model quality | Are predictions good enough? | `packages/ai-evaluation` + eval reports | per experiment / model release (Colab, GPU job). **Not CI** |
| Model performance | Latency, memory, cost | benchmark on target hardware (L4) | per model release |
| Infrastructure reliability | Does the deployed system work? | infra unit tests, `pulumi preview`, post-deploy `/health` smoke test | PR + every deploy |

A green CI says nothing about model quality, and a good eval report says nothing about API
correctness.

## Levels: pick the cheapest one that would catch the bug

- **Unit:** pure functions such as metrics, preprocessing, output parsing, label validation, services
  and stack config. No network, filesystem only via `tmp_path`.
- **API integration:** `TestClient(create_app(settings))` with `dependency_overrides`. Fake external
  systems at the client boundary (a fake inference client), never by patching internals.
- **Contract:** `services/api/tests/test_contract.py` keeps `openapi.json` honest, and the web types
  are generated from it. Add an api↔inference contract test when the API starts calling inference.
- **Frontend:** Testing Library tests per feature state, with `fetch` stubbed.
- **End-to-end** (when the first real journey exists, e.g. upload → see attributes): Playwright,
  1–3 critical journeys only, against a local stack or dev.
- **ML preprocessing:** tiny deterministic fixtures generated in code (solid-colour PNG, an image
  with an EXIF orientation tag, RGBA and greyscale inputs) checked for exact outputs.
- **Inference without a GPU:** test the pipeline with a fake model object behind the same
  interface. Tests that load real weights are marked `@pytest.mark.model` and/or `gpu`.

## Markers (registered in every Python project; `--strict-markers` is on)

`slow`, `integration`, `gpu`, `model`. `make test` runs `-m "not slow and not gpu and not model"`.
CI runs the same set. GPU and model tests run deliberately, never by accident.

## Workflow

1. Name the **risk** (what could break and who notices).
2. Choose the **cheapest level** that catches it.
3. Write the test so it **fails first** and fails for the right reason.
4. Implement, then run the project's tests.
5. Report exactly what ran, what was skipped (and why) and what was not run. Never say tests pass
   unless you ran them in this session.

## Rules

- Tests are deterministic: fixed seeds, no wall-clock or ordering dependence, no `sleep`, no real
  network or cloud.
- One behaviour per test. Names describe behaviour (`test_validation_error_lists_fields_without_echoing_input`).
- Shared fixtures go in `conftest.py`. Fixture images are generated or licence-clean, and never
  user photos.
- Coverage is a smell detector, not a target. There is no percentage gate.

## Common mistakes

- Asserting exact model text in unit tests, which is brittle. Model behaviour belongs in evaluation.
- Mocking what you own, so tests pass even when the code is deleted.
- Skipping a failing test without a linked issue, or marking it `slow` to hide it.
- Asserting on log message text instead of behaviour.
- E2E tests for things a unit test could catch.
