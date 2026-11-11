# Lesson 12: Final challenge: a small, working Wardrobe Intelligence

**Time:** about 3.5 hours, in eight milestones (0–7). Plus an optional deployment extension
(1–2 hours, only together with your teammate).

You'll build the smallest real version of our product: a person picks a photo of a garment in the
browser, and a moment later sees its attributes and the model that produced them. Every piece you
need has appeared in an earlier lesson. This lesson is about putting them together.

**By the end you can:**

- clone the repository, branch, and run all three services on your laptop
- design an HTTP contract before writing code
- add an image endpoint to the inference service, behind an interface that hides the model
- add an upload endpoint to the API that validates, strips metadata, stores the photo and calls
  inference with a timeout
- connect the React frontend through the generated, typed client
- plug in a real vision-language model of **your** choice
- build and run a service as a container
- explain, with a diagram, how the app would be deployed to Google Cloud

| You need now | You can learn later |
| --- | --- |
| everything from Lessons 1–11; `UploadFile`, Pillow basics, `FormData`, `docker run` with environment variables | GCS signed URLs, asynchronous processing (Pub/Sub, Cloud Run Jobs), authentication, a real CI pipeline, GPU serving runtimes (vLLM), load testing |

---

## How this challenge works (5 minutes)

This is a challenge, not a copy-along tutorial. Each milestone gives you a **goal**, **acceptance
criteria** (how you know you're done) and **hints**, hidden until you open them. Open one hint at a
time, and only when you're stuck.

The [answer key](../answers/12-final-challenge.md) has a complete reference implementation, which
has been built and tested. Use it to compare **after** you finish a milestone, or when you're still
stuck after all the hints. Your solution doesn't have to match it: different names and structures are
fine if the acceptance criteria hold.

**Working with Claude Code:** for this challenge, ask Claude to explain, review or unblock you
(`/tutor` works too), but write the code yourself. It's how this lesson turns into skill.
Claude can't commit or run Pulumi in this repository: you do those.

**Your branch:** work on `learning/final-challenge`. If your teammate wants to keep the result as the
real first version of the upload flow, agree that up front. Use a `feat/` branch instead and open one
pull request per milestone, following `CONTRIBUTING.md`.

The goal, end to end:

```
  browser: apps/web on :5173
      │  POST /api/analyses           multipart form with the photo
      ▼
  Vite dev proxy  ─────────────────▶  services/api on :8000
                                         │ 1. validate (type, size)
                                         │ 2. strip EXIF (GPS!)
                                         │ 3. store under a random id ──▶ local-uploads/ (later GCS)
                                         │ 4. POST /predict, with a timeout
                                         ▼
                                      services/inference on :8001
                                         │ preprocess → Predictor (fake first, then your model)
                                         ▼
  browser shows:  category · colour · pattern · material · model id · model revision
```

---

## Milestone 0: Run what exists (15 minutes)

**Goal:** a clean, green starting point.

1. If you haven't already, clone the repository (Lesson 1). Then update `main` and create your
   branch.
2. Install everything and check it: `make setup`, then `make check`.
3. Start the three services, each in its own terminal tab: the API on port 8000, inference on 8001,
   and the frontend with `npm run dev`. The commands are in `README.md` and
   `docs/development/setup.md`.

**Acceptance criteria:**

- [ ] `make check` passes before you change anything
- [ ] `http://localhost:8000/health` and `http://localhost:8001/health` both answer
- [ ] `http://localhost:5173` shows the API status line
- [ ] `http://localhost:8000/docs` lists the API's endpoints

**Question 1.** When the browser loads `http://localhost:5173/api/health`, which process receives the
request first, and which one actually answers it? Why don't you need any CORS settings locally?

---

## Milestone 1: Design the contract first (10 minutes)

**Goal:** decide what goes over the wire before you write any code.

Write a short note (in a draft PR description, or in `learning/notes/final-challenge.md` on your
branch) that answers:

- **`POST /analyses` on the API:** what does the request contain? What does a successful response
  look like? Name the fields.
- **`POST /predict` on inference:** what goes in, and what comes out? Should it be the same shape as
  the API's response, or not?
- **Errors:** for each way the request can fail, give the HTTP status and a stable `code`. Think
  about: no file; an empty file; a file that's too big; a PDF renamed to `.png`; a corrupt image;
  inference down; inference too slow; inference returning nonsense.

**Acceptance criteria:**

- [ ] both endpoints have their request and response written down, with field names
- [ ] the attribute names match what `packages/ai-evaluation` will score (look at its README)
- [ ] the response says **which model and revision** produced the attributes
- [ ] every failure has a status and a `code`, and none of them is a bare 500

<details>
<summary>Hint 1</summary>

The project README lists the attributes we care about. `services/api/app/schemas/errors.py` shows
the error envelope every failure must use, and `tests/test_errors.py` shows how codes are tested.
</details>

<details>
<summary>Hint 2</summary>

HTTP already has status codes for "too big", "wrong type", "the server I depend on is down" and "the
server I depend on was too slow". Look them up before inventing your own.
</details>

**Question 2.** Why is it worth fixing the contract before writing code? What would it cost to rename
`colour` to `color` after the frontend and the evaluation scripts already use it?

---

## Milestone 2: Inference returns attributes, with a fake model (30 minutes)

**Goal:** `services/inference` gets `POST /predict`. It takes an image and returns structured
attributes plus the model id and revision. There's no real model yet: a **fake predictor** stands in
behind the same interface your real model will use later.

Build it in three small, testable pieces:

1. **Preprocessing:** a pure function that decodes the bytes, applies EXIF orientation, converts to
   RGB and shrinks the longest side to a sensible maximum.
2. **The model boundary:** a `Predictor` interface (it has a `model_id`, a `model_revision` and a
   `predict(image)` method) and a `FakePredictor` that implements it. Make the fake **look at the
   pixels**, for example by naming the average colour, so you can prove the image really arrived.
3. **The endpoint:** `POST /predict` with a file upload. An image the service can't decode returns 422.

**Acceptance criteria:**

- [ ] `curl -F "file=@red.png" http://localhost:8001/predict` returns JSON with the attributes,
      `model_id` and `model_revision` (make a test image with Pillow: a solid red PNG is enough)
- [ ] uploading a text file returns 422, not 500
- [ ] unit tests for preprocessing (an RGBA or very large image) and for the fake predictor, plus an
      endpoint test, all with images **generated in the test code**
- [ ] `uv run pytest`, `uv run ruff check .` and `uv run mypy` pass in `services/inference`

<details>
<summary>Hint 1</summary>

FastAPI receives files with `UploadFile` and `File(...)`. Multipart form parsing needs an extra
package, and FastAPI's error message names it. Add dependencies with `uv add <package>` inside
`services/inference`, never with `pip`. You'll also need Pillow.
</details>

<details>
<summary>Hint 2</summary>

Pillow has what you need: `Image.open(BytesIO(data))`, `ImageOps.exif_transpose(...)`,
`.convert("RGB")` and `.thumbnail((max, max))`. A 1×1 resize gives you the average colour.
</details>

<details>
<summary>Hint 3</summary>

`typing.Protocol` describes "anything with these attributes and methods" without inheritance. Provide
the predictor through a dependency (`Depends(get_predictor)`) that's cached with `functools.lru_cache`,
so a real model would load once per process. Tests then swap it with `app.dependency_overrides`.
</details>

**Question 3.** You're about to plug in a real model anyway. Give two reasons the `FakePredictor` is
still worth having, now and after your model works.

---

## Milestone 3: The API accepts a photo and calls inference (45 minutes)

**Goal:** `services/api` gets `POST /analyses`. It validates the upload, removes its metadata,
stores it under a random id, asks inference for the attributes (with a timeout), and returns the
response you designed in Milestone 1. Follow the layers in `.agents/skills/api-development/SKILL.md`:
the route only wires things together, the business logic lives in a service function, and the
outside world (disk, inference) sits behind small interfaces you can fake in tests.

**Acceptance criteria:**

- [ ] `curl -F "file=@red.png" http://localhost:8000/analyses` returns 200 with an image id, the
      attributes and the model identity
- [ ] a PDF or text file renamed to `.png` gets 415 in the standard error envelope, and inference is
      **not** called
- [ ] with the inference service stopped, the API answers 503 with a stable code, not 500
- [ ] the stored file is named by a random id (never the user's filename) and has no EXIF data
- [ ] uploaded photos never show up in `git status`
- [ ] the inference URL, timeout, maximum size and upload folder come from `Settings` (with the
      `API_` prefix) and are documented in `.env.example`
- [ ] tests cover success and **every** error code, using fakes, with no network and no disk
- [ ] the contract is regenerated (`uv run python -m app.contract`) and `app.__version__` is bumped
- [ ] `make check` passes

<details>
<summary>Hint 1: dependencies</summary>

You need multipart parsing, Pillow, and an HTTP client to call inference. The project's tests already
use `httpx2` (Starlette's `TestClient` is built on it), but only as a *dev* dependency. Your code now
needs it at runtime too, so add it as a normal dependency and remove the dev-only entry.
</details>

<details>
<summary>Hint 2: validation</summary>

File names and `Content-Type` headers are chosen by the client, so they can lie. The first bytes of a
file can't: JPEG starts with `FF D8 FF`, PNG with `89 50 4E 47 0D 0A 1A 0A`, and WebP with `RIFF`,
four more bytes, then `WEBP`. Read at most *limit + 1* bytes, so an oversized upload is never read in
full.
</details>

<details>
<summary>Hint 3: removing metadata</summary>

Decode with Pillow, apply the orientation from EXIF *first* (otherwise photos end up sideways), then
save into a new buffer without passing any `exif=`. JPEG can't store transparency, so convert first
if needed.
</details>

<details>
<summary>Hint 4: calling inference</summary>

Give the client an explicit `timeout`. A timeout exception is a special kind of transport error, so
catch the more specific one first. Treat a non-200 status, or JSON that doesn't match what you expect,
as a failure too. Validating the reply with a Pydantic model is the api↔inference contract in code.
</details>

<details>
<summary>Hint 5: testing without a network</summary>

Make the store and the inference client dependencies (`Depends(get_image_store)`,
`Depends(get_inference_client)`), and override them in tests with tiny in-memory fakes. To test the
real HTTP client's error handling, `httpx2.MockTransport` lets you script responses and exceptions.
</details>

**Question 4.** The inference service is down when a user uploads a photo. What should the API answer?

- a) 500 `internal_error`, because something unexpected happened
- b) 503 `inference_unavailable`, in the standard error envelope
- c) 200 with every attribute set to `null`
- d) 404 `not_found`, because the model couldn't be found

**Question 5.** Why do we check the type by magic bytes rather than by file extension or
`Content-Type`? And why strip EXIF *before* storing the photo, rather than when we later display it?

---

## Milestone 4: The frontend uploads and shows the result (35 minutes)

**Goal:** in the browser, choose a photo, press **Analyse** and see the attributes, with a sensible
message for every state.

Follow `.agents/skills/frontend-development/SKILL.md` and copy the pattern of
`src/features/system-status/`: a typed client function, a hook that returns explicit states, a
component that renders each state, and tests.

**Acceptance criteria:**

- [ ] the TypeScript types come from the regenerated contract (`npm run gen:api`). Nothing is
      hand-written
- [ ] the file input has a label, accepts only JPEG, PNG and WebP, and rejects other types and files
      over the limit **before** uploading
- [ ] a preview of the chosen photo is shown, and its object URL is revoked when it's replaced
- [ ] the button is disabled while uploading, so there are no double submits
- [ ] success shows each attribute (a `null` shows as "not visible") and the model id and revision
- [ ] a failure shows the API's message **and the request id**
- [ ] tests for success, an API error and a rejected file; `npm run lint`, `npm run typecheck` and
      `npm test` pass
- [ ] it works in the real browser, against your running API and inference

<details>
<summary>Hint 1</summary>

Send the file in a `FormData`. Don't set `Content-Type` yourself: the browser adds
`multipart/form-data` with the boundary it needs.
</details>

<details>
<summary>Hint 2</summary>

The frontend skill asks for `@testing-library/user-event` with the first interactive feature:
`npm install -D @testing-library/user-event`. `user.upload(input, file)` simulates choosing a file.
jsdom has no `URL.createObjectURL`, so stub it in the test. To test that a text file is rejected, set
up user-event with `{ applyAccept: false }`. Otherwise it quietly drops files that don't match
`accept`.
</details>

<details>
<summary>Hint 3: if the linter complains</summary>

`react(set-state-in-effect)`: create the preview URL when the file is chosen (in the event handler),
and use an effect only to *revoke* it. `vitest(require-mock-type-parameters)`: give mocks a type, for
example `vi.fn<typeof fetch>()`.
</details>

---

## Milestone 5: Your model (40 minutes)

**Goal:** replace the fake with a real open-weight vision-language model. **You choose the model.**
This is your area. The only requirement is that it fits the project's rules:

| Rule | Where it comes from |
| --- | --- |
| Identified by an **immutable revision** (a Hub commit SHA, never `main`), set through `INFERENCE_MODEL_ID` and `INFERENCE_MODEL_REVISION` in `services/inference/.env` | `services/inference/app/config.py` |
| A **licence** that allows our use. Check the model card, and look at the table in the cost reference | `.agents/skills/gcp-infrastructure/cost-reference.md` |
| ML dependencies only in `services/inference`, added with `uv add`. The API stays ML-free | ADR 0001, `docs/architecture/overview.md` |
| No `trust_remote_code=True` (if a model needs it, pin the revision and review that code first) | `.agents/skills/model-packaging/SKILL.md` |
| Preprocessing and output parsing are plain, unit-tested functions. A malformed reply makes the model abstain (`null`); it doesn't crash | model-packaging skill |
| Tests that load real weights are marked `@pytest.mark.model`, so `make test` skips them | `pyproject.toml` markers |
| Weights never enter Git. They live in the Hugging Face cache on your laptop for now | `.gitignore`, `docs/ml/README.md` |
| Small enough to run on your laptop for this challenge | your judgement |

This is **not** the production baseline decision. That one is made from Colab results on our
evaluation set, recorded in an experiment report and an ADR. Here you only need a model that works
end to end.

**Acceptance criteria:**

- [ ] with no model configured, the service still uses `FakePredictor`, so `make test` and CI never
      need weights
- [ ] with your model configured, `curl` on `/predict` (and the browser, through the API) shows real
      attributes, and the response names your model and its revision
- [ ] the prompt is a versioned constant in code, not a string scattered through the function
- [ ] output parsing has unit tests that include malformed replies
- [ ] at least one `@pytest.mark.model` test, runnable on purpose with `uv run pytest -m model`
- [ ] *Stretch:* run 5–10 photos (your own, with permission) through the service and score them with
      `score_attributes` from `packages/ai-evaluation`. The script goes in `experiments/`
      (research only), and the photos stay out of Git.

<details>
<summary>Hint 1</summary>

Load the model **once per process**, not once per request: the cached `get_predictor` from
Milestone 2 is the natural place. Choose between your model and the fake there, based on settings.
</details>

<details>
<summary>Hint 2</summary>

Ask the model for JSON with exactly our four fields, and say "use null if you can't see it". Then
parse defensively: find the JSON in the reply, normalise the values, and turn anything unusable into
`None`. The answer key has a tested, model-agnostic parser if you want to compare.
</details>

<details>
<summary>Hint 3</summary>

The API waits 60 seconds for inference by default (`API_INFERENCE_TIMEOUT_SECONDS`). Time your first
and second requests. If mypy objects to an ML library's types, keep those calls inside one small
module rather than scattering `# type: ignore` through the code. Ask your teammate how strict to be.
</details>

**Question 6.** Your model takes 90 seconds to answer the *first* request on your laptop, and 4
seconds after that. What does the user see in the browser, and why? Name two different ways to fix
it, and say which one you'd choose for Cloud Run.

> If this work becomes a real pull request, ML dependencies are added *together with* an ADR on the
> serving runtime (`services/inference/README.md`, "Open decisions"). Talk to your teammate first.

---

## Milestone 6: Put inference in a container (20 minutes)

> Needs Docker Desktop (Lesson 10). These container steps match our Dockerfiles but couldn't be
> tested while this course was written, so tell your teammate if something doesn't behave as described.

**Goal:** run the inference service from its image, and have the API (running normally on your
laptop) call it.

**Acceptance criteria:**

- [ ] `docker build` of `services/inference` succeeds, and you can say which of your milestone
      changes ended up in the image and why (look at what the Dockerfile copies)
- [ ] the container answers `/health` and `/predict` on a port of your laptop
- [ ] the API on your laptop analyses a photo through the containerised inference service
- [ ] you can explain why the image contains no model weights, and where they'd come from in the
      cloud
- [ ] *Stretch:* run the API in a container too, so the two containers talk to each other

<details>
<summary>Hint 1</summary>

The commands from Lesson 10 work here too. Inside the container the service listens on port 8080, so
map it to the port the API expects on your laptop.
</details>

<details>
<summary>Hint 2</summary>

Which `API_...` setting tells the API where inference is? For the stretch goal: inside a container,
`localhost` means *that container*. Create a Docker network, and containers on it can reach each
other by name.
</details>

**Question 7.** Where should the inference container get its model weights when it starts on Cloud
Run?

- a) from Git, committed next to the code
- b) baked into the image, or downloaded from our versioned model registry, decided by cold-start
  measurements and recorded in an ADR
- c) from the Hugging Face Hub at `main`, so it's always the newest version
- d) from the developer's laptop through a mounted folder

---

## Milestone 7: Explain how it would be deployed (15 minutes)

**Goal:** a one-page deployment plan, with a diagram, that your teammate could check. **You don't
deploy anything.**

Your plan answers:

1. **What runs where?** Each service on Cloud Run (which needs a GPU, and which doesn't?), the photos
   in a private Cloud Storage bucket, model weights in the model registry bucket, and images in
   Artifact Registry.
2. **How does code get there?** What GitHub Actions does on a pull request, and what it does on merge.
   Why images are built for `linux/amd64`, and how a running service shows which commit it is
   (`BUILD_SHA`).
3. **Who creates the infrastructure?** Which tool defines it, and **who** runs it (hint: never
   Claude, and never without a preview and a cost estimate).
4. **What changes between your laptop and the cloud?** List the settings (for example where the API
   finds inference, and where photos are stored) and what replaces `local-uploads/`.
5. **Permissions:** one service account per service. What does each one need, and nothing more?
6. **Cost:** what costs money while nobody is using the app? Use the cost reference.
7. **Development, deployment, runtime:** for one change to the prompt, say what happens in each phase.

**Acceptance criteria:**

- [ ] an ASCII diagram showing GitHub, Artifact Registry, both Cloud Run services, both buckets and
      the browser, with arrows labelled by what flows along them
- [ ] all seven questions answered in plain English
- [ ] your teammate (the software and cloud lead) has read it and agrees, or you've noted what you
      disagree on

<details>
<summary>Hint</summary>

Reread `docs/architecture/overview.md`, `.agents/skills/gcp-infrastructure/SKILL.md` and its
`cost-reference.md`, and Lesson 11's diagrams. Pay attention to "scale to zero" and to what "minimum
instances" costs for a GPU.
</details>

**Question 8.** Describe what happens during development, deployment and runtime when you improve
the prompt your model uses.

---

## Optional extension: deploy a minimal version (1–2 hours, with your teammate)

**Not required to finish the course.** It costs money, and it uses shared Google Cloud resources, so
do it only together with your teammate, in the `dev` project, after a written cost estimate.

An outline to plan from:

1. Agree on the scope. The cheapest version runs **both services on CPU with the `FakePredictor`**
   (no GPU), which proves the deployment path without GPU costs.
2. Write the cost estimate at idle (scale to zero) and for a day of testing. Agree on a budget alert.
3. Your teammate adds the resources in Pulumi (Artifact Registry, two Cloud Run services, a private
   uploads bucket, service accounts) following `.agents/skills/gcp-infrastructure/SKILL.md`. Photos
   go to the bucket: Cloud Run's local disk disappears with the instance.
4. A **human** runs `pulumi preview`, reads it together with the other developer, then `pulumi up -s dev`.
   Claude is denied every Pulumi command in this repository.
5. Smoke test: `/health` on both services, then one upload.
6. Write down how to remove everything, and do it when you're finished, unless you've agreed to keep
   it.

---

## Wrap-up

**Question 9 (explain it back).** Walk your teammate through one photo's whole journey: the browser,
the proxy, the API, storage, inference, the model and back. For each component, say what it checks
or adds, and what would go wrong if it skipped that step.

### Done when

- [ ] Milestones 0–4 work end to end with the `FakePredictor`, and `make check` passes
- [ ] Milestone 5: your model answers through the browser, and its revision is pinned
- [ ] Milestone 6: inference runs in a container (or you've noted what blocked you)
- [ ] Milestone 7: your deployment plan is written and discussed with your teammate
- [ ] Questions 1–9 answered and compared with the [answer key](../answers/12-final-challenge.md)
- [ ] You've agreed with your teammate whether your branch becomes a real pull request

Next: **Lesson 13, Revision.** A short review of the whole course.
