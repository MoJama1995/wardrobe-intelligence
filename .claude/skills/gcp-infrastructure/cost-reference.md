# Cloud Run GPU reference (research notes)

**Checked on 2026-11-10. Prices and availability change: re-verify against the official pages before
any decision.** These are research notes, not decisions. Decisions go in `docs/decisions/`.

## Availability and limits

Source: <https://docs.cloud.google.com/run/docs/configuring/services/gpu>

- GPU types: **NVIDIA L4 (24 GB VRAM)** and **NVIDIA RTX PRO 6000 Blackwell (96 GB VRAM)**. One GPU
  per instance.
- L4 regions: asia-southeast1, asia-south1 (invitation only), **europe-west1**, **europe-west4**,
  us-central1, us-east4.
- RTX PRO 6000 regions: asia-southeast1, asia-south2, europe-west4, us-central1.
- europe-west2 (London) was **not** listed for either GPU.
- Minimum resources: L4 needs 4 vCPU / 16 GiB (8 vCPU / 32 GiB recommended). RTX PRO 6000 needs
  20 vCPU / 80 GiB.
- Scale to zero is supported. **Instance-based billing is required for GPUs**: you pay for the whole
  instance lifetime, including idle time before scale-down, and minimum instances are billed at the
  full rate even when idle.
- Quota: new projects get 3 GPUs per region (with zonal redundancy off), granted at first deploy.
  Increases are "more likely to be granted" with zonal redundancy off.
- Zonal redundancy on (the default) reserves failover capacity at a higher price per GPU-second.
  Off is cheaper, with best-effort failover.
- An instance with pre-installed drivers starts in about 5 s. **Model loading comes on top of that
  and usually dominates for VLMs**: measure it.

## Prices (secondary sources: verify on the official page)

The official pricing page (<https://cloud.google.com/run/pricing>) could not be read in full during
research. These figures come from search results quoting it:

| Item | Price |
| --- | --- |
| L4, no zonal redundancy | $0.0001867 / GPU-second (≈ $0.67 / hour) |
| L4, with zonal redundancy | $0.0002909 / GPU-second |
| Minimum L4 instance (4 vCPU, 16 GiB, GPU), no zonal redundancy | ≈ $1.05 / hour |

That puts an always-on minimum L4 instance at **about $770/month**. Scale to zero is the only
sensible dev setting.

## Model licences checked (Hugging Face model cards, 2026-11-10)

| Model | Licence | Note |
| --- | --- | --- |
| Qwen/Qwen3-VL-2B-Instruct | apache-2.0 | |
| Qwen/Qwen3-VL-4B-Instruct | apache-2.0 | |
| Qwen/Qwen3-VL-Embedding-2B | apache-2.0 | multimodal embeddings (64–2048 dims): candidate for "find similar" |
| HuggingFaceTB/SmolVLM2-2.2B-Instruct | apache-2.0 | also 500M and 256M sizes |
| Qwen/Qwen2.5-VL-3B-Instruct | **Qwen Research License** | **commercial use requires a separate licence**. Avoid for the product |
