# services/inference

The VLM inference service. It owns model loading, preprocessing, prompting and output parsing, and
nothing else: it is stateless and has no user logic or database writes.

**Status:** skeleton. It exposes `/health` with the configured model identity, and no model is
loaded yet.

## Open decisions (each needs an ADR before code)

1. **Baseline model:** chosen from Colab results on our eval set. Licence-checked candidates are
   listed in `.agents/skills/gcp-infrastructure/cost-reference.md`.
2. **Serving runtime:** plain Transformers vs vLLM; precision and quantisation.
3. **Hosting:** Cloud Run with an L4 GPU is the default candidate. Measure cold start (container
   start + weight download + load) before committing.
4. **Weights:** fetched from the versioned GCS model registry at startup, or baked into the image.
   Decide using cold-start measurements.

The ML runtime dependencies (torch, transformers or vLLM) and the CUDA base image are added
**together with** that ADR. Adding them now would only slow down CI.

## Run and test

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8001
uv run pytest
```

Tests that need real weights or a GPU use `@pytest.mark.model` / `@pytest.mark.gpu`. They never
run in CI or in `make test`.

## Configuration

`INFERENCE_MODEL_ID` and `INFERENCE_MODEL_REVISION` (an immutable revision, never `main`). See
`.env.example`.

Conventions: `.agents/skills/model-packaging/SKILL.md`.
