# Lesson 9 answer key: Understanding cloud computing

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask the tutor why
> (`/tutor` or `$tutor`).

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: why not run inference in Colab?

**A good answer includes at least two of these:**

- **It isn't always on.** A Colab runtime disconnects when idle or after a time limit. Users need
  the service whether or not someone has a notebook open.
- **It isn't reachable as a service.** Our API needs a stable, secure HTTPS address to call. A
  notebook has none.
- **It isn't reproducible.** The runtime's packages and GPU type change, and notebook state (cells
  run out of order) isn't versioned. Production must be rebuilt identically from Git and a pinned
  model revision.
- **It isn't secured or accountable.** No service account with least privilege, no logs we control,
  personal photos passing through someone's personal account and Drive.
- **It doesn't scale.** One runtime, one user, no automatic copies under load.

**Misconception:** *"Colab is just for small models."* Size isn't the issue: reliability, security
and reproducibility are. Colab remains the right place for experiments (`experiments/README.md`).

---

### Question 2: the best home for inference

**Answer: c).** Cloud Run runs our existing container image, supports an L4 GPU, and scales to zero,
so we pay nothing while idle. That matters a lot at about $1.05/hour per GPU instance.

- a) Cloud Functions are designed for small event-driven functions, not a GPU service with a
  carefully built environment, and they don't give us control over the container.
- b) An always-on GPU VM avoids cold starts but costs roughly $770/month even when nobody uses it,
  and we'd have to manage the machine ourselves.
- d) Cloud Storage holds the weights, but it can't run code.

Note that inference on Cloud Run GPU is the **default candidate**, not a final decision. The
inference README lists hosting as an open decision, to be settled with cold-start measurements.

---

### Question 3: cold starts

**A good answer includes:**

- A cold start is the extra delay on a request when no instance is running (for example after
  scaling to zero), so the platform has to start a new one first.
- For the API, starting means launching a small Python process: quick.
- For inference, starting also means **downloading the model weights (gigabytes) and loading them
  onto the GPU**. Our research notes say the GPU instance itself starts in about 5 seconds, but model
  loading usually dominates and has to be measured. So the first photo after an idle period could
  wait tens of seconds or more.
- It's the price of scaling to zero. The options to reduce it (a minimum of one instance, baking
  weights into the image, a smaller model) all have costs. That's why hosting and weights are open
  decisions that need measurements.

---

### Question 4: bucket in `europe-west2`, inference in `europe-west4`

**A good answer includes:**

- **Data and compute are split.** Each photo travels between regions: slower requests, and Google
  charges for data transferred between regions.
- **The API's region also matters.** If the API runs next to inference, it writes every photo
  across regions. If it runs next to the bucket, every call to inference crosses regions.
- **Personal data location.** Photos would sit in one place and be processed in another, which
  complicates any statement about where users' data lives.
- **The fix:** choose one region that has L4 GPUs (our notes say `europe-west2` doesn't) and put
  everything there, via the `gcp:region` stack setting rather than per-resource choices.

---

### Question 5: a $20 budget alert and an always-on GPU

**A good answer includes:**

- You get an **email** when spending passes $20 (and at any other thresholds you set). **Spending
  doesn't stop.** Budgets alert, they don't cap.
- With one L4 instance always on at about $1.05/hour, the bill grows by about $25 a day until a
  human notices and fixes the configuration (`min_instances=0`).
- So: alerts must go to someone who reads them, and the real protection is reviewing configuration
  (`min_instances`, `max_instances`) in the Pulumi preview before anything is deployed.

**Misconception:** *"A budget is a spending limit."* It isn't. Automatically stopping services when a
budget is hit is possible, but it has to be built separately, and nobody has built it for us.

---

### Question 6: why infrastructure as code?

**At least three of these:**

- **Reviewable:** infrastructure changes go through pull requests like code, so your teammate sees
  them before they exist.
- **Reproducible:** `dev` and `prod` come from the same code with different settings. A lost project
  can be recreated.
- **Recorded:** Git history shows who changed what and why. Console clicks leave no such record.
- **Previewable:** `pulumi preview` shows exactly what will be created, changed or deleted before
  anything happens.
- **Testable:** rules such as naming and labelling are plain Python with unit tests.
- **Consistent:** every resource gets the same labels and naming, so costs can be grouped.

---

### Question 7: `~ update` compared with `+- replace`

**A good answer includes:**

- **The replace worries you more.** A *replace* means Pulumi will **delete the bucket and create a
  new one**, and a deleted bucket's contents are gone: users' photos, in this case. An update to a
  Cloud Run service usually just deploys a new revision.
- Before running `pulumi up`: find out *why* it's a replace (usually a renamed resource or a setting
  that can't be changed in place, such as the location), change the code so it becomes an update
  or nothing at all, and ask your teammate.
- For production data, Pulumi's `protect=True` option makes Pulumi refuse to delete the resource. Our
  GCP skill requires it on prod data.

**Misconception:** *"Replace means it's updated more thoroughly."* It means delete and recreate.

---

### Question 8: explain it back

**A good answer covers:**

- **Compute:** both services run as containers on Cloud Run: the API on CPU, inference with an L4
  GPU (candidate). Both scale to zero, so idle costs almost nothing, and the price is cold starts,
  which are long for the VLM.
- **Storage:** photos in a private uploads bucket; weights in a versioned model-registry bucket;
  images in Artifact Registry; secrets in Secret Manager.
- **Identity:** each service runs as its own service account with least-privilege roles granted on
  specific resources. No key files.
- **Region:** one region with L4 GPUs, with data and compute together. The choice is still open.
- **Pulumi:** all of this is described in Python under `infrastructure/`, reviewed in a PR, previewed,
  and applied by a human. Nothing is deployed yet.
- **Billing:** a cost estimate for every resource, and budget alerts (which warn but don't stop
  spending).

---

### Exercise A1: classify our system

1. compute · 2. storage · 3. networking · 4. compute (on a GPU) · 5. storage · 6. storage (in
Artifact Registry; it becomes compute when Cloud Run runs it) · 7. networking (between two compute
services)

### Exercise B1: pick the service

1. **Cloud Run.** A full FastAPI app in a container, scaling to zero when idle.
2. **Cloud Function** triggered by the bucket upload event: a small piece of glue reacting to an event.
   (Cloud Run can do this too.)
3. **Cloud Storage.** Durable, cheap file storage, with no code to run.
4. **A VM with GPUs** (or a managed training service). A long batch job that needs specific
   hardware isn't a request-response service. Remember to switch it off.
5. **Cloud Run with a GPU, scaling to zero.** Bursty use, and the container we already have.

### Exercise C1: permissions for our services

One good design, where the API sends the **image bytes** to inference:

```
 Account     Role                          On resource              Why
 ─────────   ───────────────────────────   ──────────────────────   ──────────────────────────
 api         roles/storage.objectCreator   uploads bucket           store new photos
 api         roles/storage.objectViewer    uploads bucket           only if it reads them back
 api         roles/run.invoker             inference service        call inference
 inference   roles/storage.objectViewer    model-registry bucket    load weights

 api must NOT:        read or change the model registry; delete photos it doesn't need to delete;
                      administer anything (no Owner/Editor).
 inference must NOT:  read users' photos in the bucket (it gets bytes from the API); write anywhere;
                      be callable by the public (only the api account can invoke it).
```

If the API sends the **file's location** instead, inference also needs `roles/storage.objectViewer`
on the uploads bucket. That's simpler for large files, but it gives the GPU service read access to
every user's photos. Both are defensible. What matters is noticing the trade-off and choosing on
purpose.

Things a strong answer also mentions: roles are granted on the **resource**, not the project; each
service has its **own** service account; secrets go through `roles/secretmanager.secretAccessor` on
individual secrets, if any are needed.

### Exercise D1: predictions

```
wardrobe-intelligence-dev-models
{'app': 'wardrobe-intelligence', 'environment': 'dev', 'component': 'inference', 'managed-by': 'pulumi', 'gpu': 'l4'}
```

`cfg.labels('Inference')` raises `ValueError: invalid GCP label value 'Inference' for key
'component'`: Google only accepts lowercase label values. Failing in a unit test takes milliseconds
and happens on your laptop. Failing during `pulumi up` happens halfway through a deployment.

### Exercise D2: cost estimates

Using about $1.05/hour for the smallest L4 instance (research figures, re-verify before deciding):

1. **Always on:** 730 h × $1.05 ≈ **$767/month** (our notes round it to about $770).
2. **Dev testing:** 20 days × (2 h + 0.25 h idle) = 45 h → 45 × $1.05 ≈ **$47/month**.
3. **Forgotten:** 10 days always on = 240 h × $1.05 ≈ $252, plus the testing earlier in the month
   (around 13 testing days ≈ 29 h ≈ $31): **about $280/month**, roughly six times the plan. Your
   exact number depends on your assumptions; what matters is that one setting dominated the bill.

For the PR: situation 2 with its assumptions written down, plus a note that it is above the project's
**$10/month threshold**, so it needs an ADR and explicit approval. Insist on `min_instances=0` in
dev, a capped `max_instances`, and a budget alert set up **before** the first GPU deploy.
