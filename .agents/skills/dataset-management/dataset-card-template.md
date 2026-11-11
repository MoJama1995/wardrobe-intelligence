# Dataset: <name> <version>

## Source and licence

| Item | Value |
| --- | --- |
| Source URL | <primary source> |
| Licence (images) | <exact name> (quote: "...") (link) |
| Licence (annotations) | <exact name> (quote: "...") (link) |
| Commercial use permitted? | yes / no / unclear (treat as no) |
| Redistribution / derivatives | <what the terms allow> |
| Access agreement signed? | <who, when> |
| Checked on | YYYY-MM-DD by <name> |

## Contents

- Examples: <n> images, <n> distinct items. Viewpoints: <flat-lay / on-body / ...>
- Attributes and vocabulary: link to the taxonomy and label-mapping table
- Contains people / faces: yes / no. Other personal data: <...>

## Version and storage

- Location: `<gs://... or hf://...>` · Manifest: `<path>` (sha256 per image)
- Derived from: <upstream version / revision SHA>
- Changes from the previous version: <...>

## Preprocessing

EXIF orientation → RGB → <resize policy>. Code: `<path>@<commit>`

## Splits

| Split | Items | Images | Notes |
| --- | --- | --- | --- |
| train | | | |
| dev | | | used for prompt/hyperparameter tuning |
| test | | | frozen; touched once per decision |

Leakage check: exact duplicates across splits = 0, near-duplicates (pHash ≤ <t>) = 0.

## Known issues

<label noise, imbalance, biases, rotated images, ...>
