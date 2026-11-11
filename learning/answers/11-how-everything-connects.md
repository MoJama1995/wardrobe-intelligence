# Lesson 11 answer key: How everything connects

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: why are the API and inference separate services?

**A good answer includes at least two of these:**

- **They scale and cost differently.** The API is cheap CPU Cloud Run that scales to zero. Inference
  needs a GPU, about $1.05/hour while running, with its own quotas and long cold starts.
- **The API stays small and fast to deploy.** `services/api` has no ML dependencies. If it lived with
  PyTorch, every small API fix would rebuild and redeploy a multi-gigabyte GPU image.
- **Independent change.** Swapping the model or the serving runtime touches only inference, and API
  changes never risk breaking model loading.
- **Failure isolation and security.** A crashing or slow model doesn't take down validation, error
  handling or the health check. Inference can stay private, callable only by the API's service
  account.

**Misconception:** *"Microservices are always better."* We split exactly once, where the hardware
and costs genuinely differ. ADR 0001 keeps everything else in one repository, built simply.

---

### Question 2: why check the file's bytes?

**A good answer includes:**

- The file name and the `Content-Type` header are **chosen by the client**. Anyone can rename
  `virus.exe` to `coat.jpg`, or send any header they like.
- Not every request comes from our React app. Anyone can call the API directly with `curl` and skip
  any checks the frontend makes. **The server is the only place a rule can be enforced.**
- Real image formats start with recognisable bytes (often called *magic bytes*). Checking them
  rejects non-images before they reach image-decoding libraries, which are a classic target for
  malicious files.

---

### Question 3: who strips EXIF, and what about orientation?

**A good answer includes:**

- **Not the browser:** the browser can't be trusted. A modified client, or a `curl` call, would skip
  it. Privacy rules must be enforced on the server.
- **Not inference:** by the time inference sees the photo, it has already been stored. Stripping
  there would leave GPS data in the bucket. Inference is also meant to be a stateless model service,
  not a privacy gatekeeper.
- **The API, before storing:** so location data never reaches the bucket, logs or any other service.
- **Orientation:** phones often store a photo sideways and record "rotate 90°" in EXIF. If you strip
  EXIF without first **applying the rotation to the pixels**, the photo (and what the model sees) ends
  up sideways. Apply the orientation, then strip. The `model-packaging` and `testing-strategy` skills
  call this out, with a test image that has an EXIF orientation tag.

---

### Question 4: getting a typo fix to users

**Answer: b).** It's a code change: merge the PR, then CI builds and pushes a new image tagged with
the commit SHA, and Cloud Run deploys a new revision using it. No infrastructure changes, so no
`pulumi up` (a). The bucket has nothing to do with it (c). And Cloud Run never reads from GitHub; it
only runs the image it was given (d).

---

### Question 5: why treat infrastructure changes more carefully than code changes?

**A good answer includes:**

- **Infrastructure mistakes can destroy data or cost money.** A `replace` on the uploads bucket
  deletes users' photos. A GPU service with `min_instances=1` costs about $770/month. A loose IAM
  binding can expose data. Most of these can't be undone.
- **Code changes are easy to roll back.** Each image is immutable and tagged, and Cloud Run keeps
  previous revisions, so a bad deploy can be reverted to the last good revision.
- **`pulumi preview` needs a human judgement:** checking deletes and replaces, IAM changes and the
  cost estimate is a review, not a test that passes or fails.
- **Claude can't run Pulumi in this repository** (`.claude/settings.json`). It's a deliberate project
  rule: an agent can prepare the code and explain the preview, but a person makes the change.

---

### Question 6: following up on request ID `9c1e…`

**A good answer covers:**

1. **Search the logs for the ID** (Cloud Logging in production; `grep` on a saved log locally). Find
   the API's `request_completed` line: the path, the status code and the duration.
2. **Look for error lines with the same ID:** an `unhandled_exception` with a traceback, or an
   `app_error` with a stable code.
3. **Decide where the problem was:**
   - a `4xx` with a validation code → the input (wrong type, too large): a user or frontend problem
   - an exception mentioning Cloud Storage and `403` → **configuration/IAM**: the service account
     lacks a role
   - a timeout calling inference, or a long duration → **inference**: slow, cold, or crashed. Search
     the inference logs for the same ID (once the API passes it along), and check inference's
     `/health` for `model_loaded`, `model_id`, `model_revision` and `build`.
4. **Check what was running:** which revision and build SHA served the request, and whether anything
   was deployed just before.
5. Fix, add a test that would have caught it, and reply to the tester.

**Worth noticing:** we never log images or personal data, so the logs show *what happened*, not the
photo itself. To reproduce with the actual photo, you'd need the user's permission.

---

### Question 7: `INFERENCE_MODEL_REVISION=main`

**Answer: c).** `main` is a **moving** reference. Whoever publishes the model can push new weights to
it at any time. The same configuration could load a different model after the next cold start:
outputs change without a code change, a deploy or a review, and every evaluation we ran no longer
describes what's running. That's why the project pins an immutable revision SHA (or a registry
version), and why `/health` reports it. a) treats "newest" as "best", which is the very assumption
that pinning protects against. b) and d) aren't how either works.

---

### Question 8: explain it back

**A good answer covers both journeys.**

The photo's journey:

1. React app (`apps/web`, served by Vite locally or static hosting in production): loaded; shows
   health today.
2. `POST` with the photo to the API, typed from `openapi.json`: not built.
3. The API validates type, size and bytes, and strips EXIF after applying orientation: the error
   envelope and request IDs exist; the endpoint doesn't.
4. The photo is stored in the private uploads bucket via the API's service account: not built.
5. The API calls inference with a timeout, as the only caller allowed: not built.
6. Inference (pinned model and revision, loaded at start-up) preprocesses, prompts, generates, and
   parses to validated JSON with the model version: `/health` only. The model is your choice.
7. The API returns JSON (persisting it is an open decision) and React renders it: not built.

The code's journey: branch and commit (Git) → `make check` locally (uv, npm, pytest) → push and open
a PR (GitHub) → CI runs `make check`, then after merge builds an `amd64` image tagged with the SHA
and pushes it to Artifact Registry (planned) → Cloud Run deploys a new revision → requests are served
and logged to Cloud Logging. Infrastructure the code relies on (buckets, service accounts,
permissions, the services themselves) is defined in Pulumi, previewed and applied by a human.

---

### Exercise A1: evidence for each box

Examples of good evidence:

- **React app:** `apps/web/src/App.tsx` exists and renders `ApiStatus`.
- **API:** `services/api/app/main.py`; the only route is `/health` (`app/api/health.py`).
- **Inference:** `services/inference/app/main.py` has only `/health`, with `model_loaded=False`;
  `pyproject.toml` has no `torch` ("ML runtime dependencies … are added together with the ADR").
- **Pulumi:** `infrastructure/__main__.py` only exports three values; `pulumi-gcp` isn't even a
  dependency yet.
- **GitHub Actions:** no `.github/` folder.
- **Buckets, Artifact Registry:** nothing in `infrastructure/` creates them.

### Exercise C1: which phase?

1. **Development:** read the failing check's output on your laptop.
2. **Deployment (CI):** open the failed job's log on the PR. Usually it's the same failure you'd get
   from `make check` locally.
3. **Runtime:** the error's request ID → Cloud Logging.
4. **Deployment (infrastructure):** the preview. Find out why it's a replace before anyone runs
   `pulumi up` (Lesson 9, Question 7).
5. **Runtime:** a cold start after scaling to zero. Measure it, then decide (Lesson 9).
6. **Deployment:** CI's identity lacks permission to write to Artifact Registry: an IAM binding in
   Pulumi.
7. **Runtime, caused by configuration:** check `/health`'s `model_revision`. A moving reference such
   as `main` is the likely culprit (Question 7).

### Exercise E2: what a good first-deployment plan includes

```
 Goal:              the API answers /health at a Cloud Run URL in the dev project
 Resources created: an Artifact Registry repository; the service account
                    wardrobe-intelligence-dev-api; the Cloud Run service
                    wardrobe-intelligence-dev-api (min_instances=0, max_instances capped, e.g. 2);
                    all labelled with cfg.labels()
 Cost estimate:     ~$0 at idle (scales to zero); small at dev use; image storage in
                    Artifact Registry.
                    State assumptions and check the official pricing pages; flag anything above
                    the $10/month ADR threshold
 Permissions:       the api service account needs no roles yet (no bucket, no inference);
                    who may deploy (humans, later CI via Workload Identity Federation)
 Steps:             build --platform linux/amd64 with BUILD_SHA → push (teammate, or together) →
                    pulumi preview (human) → review together → pulumi up (human) → check
 Check:             curl https://<service-url>/health →
                    {"status":"ok","service":"api","environment":"dev","build":"<sha>"}
 Undo:              remove the resources from the Pulumi program and apply (a human runs it).
                    Nothing is lost: the API is stateless
 Open questions:    which region? Is the API public (anyone can call it) or authenticated?
                    Which frontend origin goes in API_CORS_ORIGINS? Is a billing budget and alert
                    already set up?
```

Strong plans also set `API_ENVIRONMENT=dev` on the service, note that Cloud Run sets `PORT`, and say
explicitly that `prod` is untouched.
