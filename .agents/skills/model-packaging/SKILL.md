---
name: model-packaging
description: Turn an experimental Wardrobe Intelligence model (from Colab) into a versioned, reproducible production artefact served by services/inference. Use when productionising a model, LoRA adapter, prompt or preprocessing change, creating or upgrading a model registry version, separating training from inference dependencies, or checking that the service reproduces notebook results.
---

# Model packaging

A **model release** is everything that determines the output, versioned together: base model
reference, adapter or merged weights, processor/tokenizer config, prompt template, preprocessing
code, decoding params, output schema, and the evaluation report that justified it.

## Conventions

- **Registry:** `gs://<project>-models/<model-name>/<version>/`. It holds weights or the adapter,
  `manifest.json` (see [manifest.md](manifest.md)) and `eval-report.md`. Versions (`v1.2.0`) are
  immutable: the bucket has object versioning and a retention policy.
- **Base models** are referenced by Hub commit SHA (`revision=`), never by `main`. Production
  mirrors the weights into the registry, so a cold start never depends on Hugging Face being up.
- **Selection:** `INFERENCE_MODEL_ID` and `INFERENCE_MODEL_REVISION` point to a registry version.
  Changing them is a reviewed PR.
- **Dependencies:** training libraries (peft for training, trl, bitsandbytes, datasets, accelerate,
  wandb) never go into `services/inference`. Whether to merge LoRA weights at packaging time or load
  adapters at runtime is decided in an ADR.
- **Code:** preprocessing, prompt rendering and output parsing are plain, unit-tested functions under
  `services/inference/app/`, copied out of the notebook. Never import notebook code or read Drive
  paths.
- **Security:** avoid `trust_remote_code=True`. If a model needs it, pin the revision and review the
  remote code, because it executes at load time.

## Workflow

1. **Gate:** an evaluation report exists and the candidate meets its thresholds (`model-evaluation`).
2. **Extract code** from the notebook into `services/inference`: preprocessing (EXIF orientation,
   RGB, resize), prompt template (versioned constant) and JSON output parsing with schema validation.
3. **Unit-test it** with tiny, deterministic, licence-clean fixture images (generate them in code,
   e.g. solid-colour PNGs, or use photos with consent). Test rotation, RGBA/greyscale input and
   malformed model output.
4. **Export artefacts,** compute the sha256 of every file and write `manifest.json`.
5. **Upload** to the registry. A human runs or approves this: it writes to the cloud.
6. **Reproducibility check:** run the packaged pipeline on the golden set (20–50 fixed examples) and
   compare with the notebook's saved predictions. With greedy decoding on the same hardware and
   precision, expect identical output. Otherwise require at least 99% field agreement and document
   the cause.
7. **Release** through a PR that updates the inference config, links the eval report and manifest,
   and records the change in an ADR or the inference README changelog.

## Required output

The manifest, the reproducibility check result (agreement %, mismatching ids) and the PR.

## Common mistakes

- Preprocessing parity bugs between the notebook and the service: resize interpolation, EXIF
  ignored, RGBA→RGB, different processor version. These are the most common cause of "worse in
  production".
- Evaluating in 4-bit and serving in bf16 (or the reverse) without re-evaluating.
- Installing the whole notebook environment into the inference image, which makes it slow to build
  and slow to cold-start.
- Baking multi-GB weights into the image without weighing it against fetching from GCS at startup.
  Decide by cold-start measurements and record the decision in an ADR.
- Mutable references (`latest`, `main`, `final_v2_fixed`).
