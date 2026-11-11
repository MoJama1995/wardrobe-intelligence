---
name: dataset-management
description: Select, license-check, version, split, annotate and preprocess datasets for Wardrobe Intelligence (garment images and attribute labels). Use when evaluating whether a dataset can be used, building or changing the evaluation set, writing annotation guidelines or a garment taxonomy, creating train/dev/test splits, or checking for leakage between training and evaluation data.
---

# Dataset management

## Non-negotiables

- **Never assume a licence.** Read it at the primary source (the dataset's own site, LICENSE or
  terms page), quote the relevant sentence, link it and record the date you checked it. Several
  widely used fashion datasets are research-only, non-commercial or behind an access agreement.
  Check each one. If anything is unclear, record it as *research-only* and flag it to the user.
- **The image licence can differ from the annotation licence.** Web-scraped images often carry
  their own terms.
- **User-uploaded wardrobe photos never enter training or evaluation data** without explicit,
  recorded consent.
- **Datasets never go into Git.** Store them in a private Hugging Face dataset repo or
  `gs://<project>-datasets/<name>/<version>/`, and always reference them by version.

## Conventions

- **Dataset card** per dataset in `docs/ml/datasets/<name>.md`, from
  [dataset-card-template.md](dataset-card-template.md).
- **Versions** `v<major>.<minor>` are immutable once any reported result uses them. Fixing labels
  means a new version.
- **Manifest** per version: every example id with the sha256 of its image bytes, its split and its
  labels. It is what makes a version reproducible.
- **Taxonomy:** a controlled vocabulary with definitions for category, colour, pattern and material
  (and season/formality if in scope), stored with the dataset. `None` means *not determinable from
  the image*, which is the convention `packages/ai-evaluation` scores against.
- **Preprocessing** is documented and deterministic: apply EXIF orientation, convert to RGB, and
  specify any resizing. The same code path must be used in experiments and in `services/inference`.

## Workflow

1. **Fit:** does it contain the garments, viewpoints (flat-lay, on-body, hanger) and attributes the
   product needs? Count the examples per class.
2. **Licence and provenance:** fill in the card's licence section before downloading at scale.
3. **Quality audit** on a random sample of at least 100: label accuracy, vocabulary consistency
   ("navy" vs "dark blue"), duplicates, corrupt or rotated images, people's faces.
4. **Normalise labels** to the taxonomy with an explicit mapping table, committed with the card.
5. **Split by item, not by image.** All photos of one garment, outfit or product stay in one split.
   Remove near-duplicates across splits with a perceptual hash (pHash or dHash).
6. **Annotation (if labelling).** Write the guidelines first. Double-annotate at least 10% and
   compute per-field agreement (Cohen's kappa). Fields with low agreement need clearer guidelines or
   should be dropped. Human-review any model-assisted labels before they enter an eval set.
7. **Freeze:** write the manifest, upload it, record the version on the card, and never edit it in
   place.

## Required output

A dataset card, a manifest, and a split report: counts per class per split, the leakage check
result (exact and near-duplicate matches across splits must be 0), and label agreement if
annotated.

## Common mistakes

- Random image-level splits that put the same shirt in both train and test.
- Using a model's own predictions as ground truth.
- Ignoring EXIF orientation, so a "rotated" garment looks like a labelling failure.
- Class imbalance hidden by aggregate accuracy (thousands of t-shirts, twelve coats).
- Loading `load_dataset("org/name")` without `revision=`.
- Quietly dropping hard examples, which inflates metrics.
