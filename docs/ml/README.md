# ML records

Permanent, reviewable records of ML work. Notebooks are where the work happens; this folder is where
the conclusions live.

| Folder | Contents | Template |
| --- | --- | --- |
| `datasets/` | one dataset card per dataset version: licence (quoted, dated), provenance, splits, leakage checks | `.claude/skills/dataset-management/dataset-card-template.md` |
| `experiments/` | one record per experiment (`EXP-YYYYMMDD-slug.md`), including negative results | `.claude/skills/ml-experimentation/experiment-record-template.md` |
| `evaluations/` | baseline vs candidate reports that justify model decisions | `.claude/skills/model-evaluation/eval-report-template.md` |

Create each folder with its first record.

**Never stored here:** datasets, images, model weights or raw predictions. Those live in GCS or the
Hugging Face Hub and are referenced by version.
