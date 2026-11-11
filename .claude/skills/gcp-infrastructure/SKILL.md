---
name: gcp-infrastructure
description: Define and change Google Cloud infrastructure for Wardrobe Intelligence with Pulumi (Python) in infrastructure/, covering Cloud Run services and jobs, Cloud Storage buckets, IAM, Secret Manager, Artifact Registry, GPUs, environments and cost. Use for any work under infrastructure/, when adding a cloud resource, choosing a region or GPU, writing deployment config, or answering "how much will this cost?".
---

# GCP infrastructure (Pulumi, Python)

## Hard rules

- All resources are defined in Pulumi. No console changes. Ask the user before any `gcloud`
  command that creates, changes or deploys something.
- **Claude never runs any `pulumi` command**, not even `preview` (denied in
  `.claude/settings.json`). The user runs Pulumi. Claude never creates service-account keys.
- Never add a resource without a cost estimate. **Recurring cost above about $10/month needs an ADR
  and explicit approval.**

## Conventions

- **Stacks:** `dev` and `prod`. The stack name must equal the `environment` config (checked in
  `stack_config.load()`). Use `pulumi config set` for values and `pulumi config set --secret` for
  secrets. Stack files are committed and never contain plaintext secrets.
- **Names and labels:** `cfg.resource_name(component)` and `cfg.labels(component)` on every
  resource, so billing reports group by app, environment and component.
- **Modules:** one per concern (`storage.py`, `services.py`, `iam.py`, `registry.py`), created when
  first needed. Extract a `ComponentResource` only once a pattern repeats.
- **IAM:** one service account per service. Grant roles on the resource (e.g. the bucket), not on
  the project. Never use Owner or Editor. GitHub Actions authenticate with Workload Identity
  Federation; humans use ADC (`gcloud auth application-default login`).
- **Secrets:** Secret Manager, mounted into Cloud Run by version reference.
- **Buckets:** uniform bucket-level access and public access prevention enforced. The uploads bucket
  gets a dev lifecycle rule (e.g. delete after 30 days). The model registry bucket gets versioning
  and retention. Set `protect=True` on prod data.
- **Region:** one region, chosen with GPU availability in mind (see
  [cost-reference.md](cost-reference.md)). Keep data and compute together to avoid egress.
- **Cloud Run:** `min_instances=0` in dev, `max_instances` always capped, explicit request timeouts,
  and concurrency set deliberately (low for GPU inference).
- **Testing:** keep logic in pure functions with unit tests (`tests/`). Use Pulumi mocks
  (`pulumi.runtime.set_mocks`) for resource wiring once resources exist. CI runs `pulumi preview`
  once credentials are configured.

## Workflow

1. A new kind of resource gets an `architecture-review` first.
2. **Estimate the cost** at idle and at expected dev usage. Write it in the PR.
3. Write code and unit tests (`uv run pytest` in `infrastructure/`).
4. **Ask the user to run** `pulumi preview -s dev` and paste the output. Review it with them:
   creates, updates, deletes and replaces, with deletes and replaces highlighted, plus the cost
   estimate.
5. The user runs `pulumi up -s dev` themselves. Prod is applied by a human after review.

## Required output

The preview summary, the cost estimate, the IAM changes listed explicitly, and the teardown story
(how the resource is removed and what data is lost).

## Common mistakes

- Project-level IAM grants "to make it work".
- A GPU service with `min_instances >= 1`, which bills 24/7. Instance-based billing also charges
  for the idle time before scale-down.
- Hard-coded project IDs, regions or bucket names in code.
- Replacing a stateful resource (bucket, database) because of a rename. Check the preview for
  `replace`.
- Forgetting a billing budget and alerts. Set one up before the first GPU deploy.
