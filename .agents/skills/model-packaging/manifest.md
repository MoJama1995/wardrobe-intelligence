# Model release manifest (`manifest.json`)

Every registry version contains this file. Fields are required unless marked optional.

```json
{
  "name": "garment-attributes",
  "version": "1.0.0",
  "created_at": "2026-11-20T10:00:00Z",
  "created_by": "<name>",
  "base_model": { "id": "<org/name>", "revision": "<hub commit sha>", "license": "<spdx id>" },
  "adapter": { "type": "lora", "path": "adapter/", "merged": false },
  "precision": "bf16",
  "processor": { "revision": "<hub commit sha>" },
  "prompt": { "version": "attributes-v3", "path": "prompt.txt" },
  "preprocessing": { "code": "services/inference/app/preprocessing@<git sha>", "max_side_px": 1024 },
  "decoding": { "temperature": 0, "max_new_tokens": 256 },
  "output_schema": "schema.json",
  "training": {
    "dataset": "<name> <version>",
    "experiment": "EXP-YYYYMMDD-slug",
    "code": "experiments/notebooks/NN-slug.ipynb@<git sha>"
  },
  "evaluation": { "report": "eval-report.md", "dataset": "<name> <version>" },
  "files": { "adapter/adapter_model.safetensors": "sha256:<...>", "prompt.txt": "sha256:<...>" }
}
```

Rules: `base_model.license` is checked against the product's needs before release. `files` lists
every artefact with its hash, and services/inference verifies the hashes when it loads them.
