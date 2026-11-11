# Lesson 11: How everything connects

**Time:** about 2.5 hours, in five parts (A–E). This is the most important lesson in the course:
it puts every earlier lesson on one map.

**By the end you can:**

- draw the whole Wardrobe Intelligence architecture from memory, and say what exists today and what
  is planned
- follow one photo through all seven steps, from the browser to the model and back
- say where Docker, Cloud Run, Cloud Storage, Pulumi and GitHub Actions fit
- tell **development**, **deployment** and **runtime** apart, and say which one a problem belongs to
- trace a request through the logs using its request ID
- reason about what happens when a part fails, and where to look first
- write a short, reviewable plan for a first deployment

| You need now | You can learn later |
| --- | --- |
| the component map; the seven-step request flow; development vs deployment vs runtime; request IDs and structured logs; timeouts, cold starts and pinned revisions; what CI and infrastructure as code do | asynchronous processing (Pub/Sub, Cloud Run Jobs), distributed tracing (OpenTelemetry), canary and blue-green releases, autoscaling tuning, service-level objectives, disaster recovery |

> **Where we are today:** the foundations are built, the product flow isn't. This table is your
> compass for the whole lesson.
>
> | Piece | Today |
> | --- | --- |
> | React frontend (`apps/web`) | runs locally; shows the API's health |
> | API (`services/api`) | runs locally; `/health`, request IDs, JSON logs, error envelope, Dockerfile |
> | Inference (`services/inference`) | runs locally; `/health` only. No model yet: choosing it is your call |
> | Photo upload, storage, inference call, result display | designed in `docs/architecture/overview.md`, **not built** (Lesson 12) |
> | Google Cloud resources (Pulumi) | skeleton only; **nothing deployed** |
> | CI (GitHub Actions) | **planned**: there's no `.github/workflows/` folder yet |

---

## Part A: The whole system on one page (25 minutes)

Here's the complete picture once the MVP is built. **Solid boxes exist in code today; dashed boxes
are planned.**

```
  USER'S BROWSER                                                    GitHub: repo, branches, PRs
  ┌──────────────────────────────┐                                            │
  │ React app  (apps/web)        │                                            ▼
  └──────────────────────────────┘                                  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
                │ HTTPS: JSON + photo                               ┊ GitHub Actions (CI) ┊
                ▼                                                   └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
  ┌────────────────────────────────┐                                          ┊ build, tag, push
  │ API  (services/api)            │                                          ▼
  │ Cloud Run · CPU · scales to 0  │                                ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
  └────────────────────────────────┘◀┄┄┄┄ Cloud Run pulls images ┄┄┄┤ Artifact Registry   ┊
         ┊ store photo    ┊ HTTPS + timeout                         ┊ container images    ┊
         ▼                ▼                                         └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  ┌──────────────────────────────────┐            ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
  ┊ GCS: uploads ┊  │ Inference  (services/inference)  │◀┄ weights ┄┤ GCS: model registry ┊
  ┊ (private)    ┊  │ Cloud Run · L4 GPU · scales to 0 │            ┊ (versioned)         ┊
  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘  └──────────────────────────────────┘            └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘

  ┌───────────────────────────┐
  │ Pulumi  (infrastructure/) │ ┄┄ creates and configures every Google Cloud resource above:
  └───────────────────────────┘    buckets, Cloud Run services, service accounts, permissions

  All services write JSON logs → Cloud Logging. Each service runs as its own service account.
```

Solid arrows work today; dashed arrows are planned. The code for the API and inference services
exists (solid boxes), but none of it runs in Google Cloud yet: "Cloud Run" in those boxes is where
they *will* run. GitHub Actions doesn't exist yet, and nothing is deployed.

Each part has one job, and just as important, things it never does:

| Component | Its job | Never does |
| --- | --- | --- |
| **React app** | show the UI, send the photo, render results | hold secrets; decide what's valid (the browser can't be trusted) |
| **API** | validate, store, orchestrate, return results | load a model or import ML libraries |
| **Inference** | load the model, preprocess, prompt, parse output | store data, know about users, write to a database |
| **GCS buckets** | keep photos and model weights | run code |
| **Pulumi** | create and configure cloud resources | handle requests or deploy every code change |
| **GitHub Actions** | check every PR, build and push images | hold long-lived keys |

### Exercise A1: check the map against the repository (10 minutes)

For each box, find the folder or file where it lives in our repository, or confirm it doesn't exist
yet. For example: is there a `.github/workflows/` folder? Does `infrastructure/__main__.py` create any
resources? Does `services/inference/pyproject.toml` list `torch`? Write down **one piece of
evidence** for each solid or dashed box.

**Question 1.** Why are the API and the inference service two separate services, instead of one
FastAPI app that does everything? Give at least two reasons. (Hint:
`docs/architecture/overview.md`.)

---

## Part B: One photo, seven steps (40 minutes)

Follow a single photo of a navy wool coat through the system.

```
  Browser (React)          API (FastAPI)                GCS uploads     Inference (VLM)
       │                        │                            │                 │
   1   │ user opens the app     │                            │                 │
   2   │── POST photo ─────────▶│                            │                 │
   3   │                        │ validate: type, size;      │                 │
       │                        │ strip EXIF (location)      │                 │
   4   │                        │── store photo ────────────▶│                 │
   5   │                        │── send work, with timeout ─┼────────────────▶│
   6   │                        │                            │   preprocess,   │
       │                        │                            │   prompt, VLM,  │
       │                        │                            │   parse to JSON │
       │                        │◀── attributes + model version ───────────────│
   7   │◀── JSON result ────────│                            │                 │
       │ show "coat · navy ·    │                            │                 │
       │   wool"                │                            │                 │
```

### Step 1: the user opens the React frontend

The browser downloads the app's HTML, JavaScript and CSS. Locally, Vite's dev server on `:5173`
serves them. In production they'll be the static files from `npm run build`; where those are hosted
is an open decision (Cloud Run, Firebase Hosting, or Cloud Storage with a CDN).
**Today:** the app loads and shows the API's health.

### Step 2: the frontend sends the image to FastAPI

The app sends an HTTP `POST` with the photo as `multipart/form-data` (Lesson 3) to the API. Locally
it calls `/api/...`, and the Vite proxy forwards it to `:8000`. A deployed build calls the address in
`VITE_API_BASE_URL`, which is baked in at build time. The request and response types come from the
API's OpenAPI contract (`openapi.json` → `schema.gen.ts`), so the two sides can't silently disagree.
**Today:** only `GET /health` exists.

### Step 3: the backend validates the request

Never trust anything from the browser. The API checks that the file really is an image (by looking
at its first bytes, not its name), that it isn't too large, and that it's a type we support. Bad
requests get a `4xx` response in our standard error envelope, with a request ID. Then it removes
**EXIF metadata**, which can include the GPS location where the photo was taken. Wardrobe photos are
personal data. **Today:** the error envelope and request IDs exist; the upload endpoint doesn't.

### Step 4: the image is stored in Google Cloud Storage

The API writes the cleaned photo to the private **uploads** bucket, under a random name rather than
the user's file name, using its service account's `objectCreator` role (Lesson 9). In dev, a
lifecycle rule deletes old photos after about 30 days. **Today:** not built, and no bucket exists.

### Step 5: the backend sends work to the inference service

The API calls inference over HTTPS, **with a timeout**, so a stuck model can't hang the API forever.
Only the API's service account may call inference (`run.invoker`). The API sends either the image
bytes or the photo's location in the bucket; Exercise C1 in Lesson 9 weighed that trade-off. To
start with this is **synchronous** (the API waits for the answer), because it's the simplest thing
that works. Switching to a queue only happens if measured latency demands it, and needs an ADR.
**Today:** not built.

### Step 6: the VLM processes the image

The inference service loaded the model **once, at start-up**: the model and the exact revision named
in its configuration (`INFERENCE_MODEL_ID`, `INFERENCE_MODEL_REVISION`), never a moving name such as
`main`. For each request it preprocesses the image (orientation, RGB, resize), renders the versioned
prompt, generates, and **parses the output into JSON validated against a schema**. It returns the
attributes plus the model version that produced them. **Which model is your decision**; the
`model-packaging` skill lists the rules it must fit. **Today:** `/health` only, with
`"model_loaded": false`.

### Step 7: the result is returned and displayed

The API returns the attributes to the browser as JSON. (Saving them for search later needs a database:
Firestore or Cloud SQL is an open decision.) The React app renders them, along with the loading and
error states a user sees while waiting. **Today:** not built.

### Exercise B1: run what exists today (20 minutes)

Use three terminals, from the repository root:

```bash
# Terminal 1: the API
cd services/api && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: the inference service
cd services/inference && uv run uvicorn app.main:app --reload --port 8001

# Terminal 3: the frontend
cd apps/web && npm run dev
```

1. Open <http://localhost:5173>. You should see **API ok · local · build local**.
2. Open your browser's developer tools (**View → Developer → Developer Tools** in Chrome; then the
   **Network** tab) and reload. Find the request to `/api/health`. Look at its **response headers**:
   there's an `x-request-id`. Note it down.
3. Check the inference service directly: `curl http://localhost:8001/health`.
4. On the seven-step diagram, mark the **only** arrow that works end to end today.

Keep all three running for Part D.

**Question 2.** In step 3, why does the API check the file's first bytes instead of trusting its file
name or the `Content-Type` header the browser sends?

**Question 3.** The design says the **API** strips EXIF before storing the photo. Why the API, and
not the browser or the inference service? And what must happen to the photo's **orientation**
information (also stored in EXIF) before it's stripped?

---

## Part C: Development, deployment and runtime (35 minutes)

The same tools come up in very different moments. Most confusion about "how it all fits" disappears
once you separate three phases:

```
   DEVELOPMENT                    DEPLOYMENT                          RUNTIME
   on your laptop                 from a reviewed commit to           real requests,
                                  running services                    all day
  ┌──────────────────────┐      ┌───────────────────────────────┐   ┌────────────────────────────┐
  │ edit code, notebooks │      │ PR → GitHub Actions:          │   │ Cloud Run instances start, │
  │ uv sync, npm ci      │ PR ─▶│   make check                  │──▶│ serve, scale to zero       │
  │ uvicorn --reload     │      │   docker build (amd64)        │   │ API ⇄ inference ⇄ GCS      │
  │ Vite proxy           │      │   docker push → Artifact Reg. │   │ JSON logs → Cloud Logging  │
  │ pytest, make check   │      │ Pulumi preview → review → up  │   │ IAM checks every call      │
  │ docker build / run   │      │   (a human runs it)           │   │                            │
  └──────────────────────┘      │ Cloud Run: new revision       │   └────────────────────────────┘
       minutes                  └───────────────────────────────┘          constantly
                                     a few times a week
```

| Tool | Development | Deployment | Runtime |
| --- | --- | --- | --- |
| **Git and GitHub** | branches, commits | PRs, review, and the trigger for CI | — |
| **uv, npm** | install, run, test | CI installs exactly the lockfiles | — (images already contain the environment) |
| **Docker** | build and run images locally (Lesson 10) | CI builds the image | Cloud Run runs the *image*; Docker itself isn't involved |
| **GitHub Actions** *(planned)* | — | checks every PR; builds, tags and pushes images | — |
| **Artifact Registry** *(planned)* | — | stores images, tagged with the commit SHA | Cloud Run pulls images from it |
| **Pulumi** | unit tests of the rules (`stack_config.py`) | creates or changes resources; a human runs `preview` and `up` | — (not involved in requests) |
| **Cloud Run** | — | receives a new **revision** for each new image | runs containers, scales them, sets `PORT` |
| **Cloud Storage** | — | buckets created by Pulumi | stores photos; serves model weights |

Three ideas carry most of the weight:

1. **Pulumi changes *what exists*** (buckets, services, permissions): rarely, reviewed, by a human.
   **CI ships *new code*** (new images): often, automatically after review. **Runtime handles
   *requests***: constantly, with no human involved.
2. **Nothing at runtime reads from GitHub or your laptop.** Cloud Run only knows the image it was
   given, and the configuration and permissions Pulumi set. To change behaviour, you deploy.
3. **Every artefact is pinned:** the image tag is a commit SHA; the model is a revision SHA; the
   dependencies are a lockfile. Anything running can be traced back to exactly what produced it.

### What CI might look like

There is no CI in our repository yet. This sketch shows the shape it will probably take. It is
**illustrative only, not a file in our repository**, and the action versions are examples:

```yaml
# ILLUSTRATIVE SKETCH: there is no .github/workflows/ folder in our repository yet.
name: ci
on:
  pull_request:          # every PR: prove the change is safe to merge
  push:
    branches: [main]     # every merge to main: build images

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: make setup
      - run: make check  # the same command you run on your laptop

  build-images:
    if: github.event_name == 'push'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # 1. Log in to Google Cloud with Workload Identity Federation (no key files).
      # 2. docker build --platform linux/amd64 --build-arg BUILD_SHA=${{ github.sha }} ...
      # 3. docker push <region>-docker.pkg.dev/<project>/<repo>/api:${{ github.sha }}
```

Notice that the `check` job runs `make check`, the command you already run locally. CI isn't
magic: it's your own checks, run on a clean machine for every PR, so nobody can forget them.

### Exercise C1: which phase? (10 minutes)

For each situation, name the phase (development, deployment or runtime) and where you'd look first:

1. `make check` fails on your laptop after you change `services/api/app/main.py`.
2. A PR shows a red ✗ next to the `check` job.
3. Users see "Something went wrong" when uploading a photo.
4. `pulumi preview` says the uploads bucket will be **replaced**.
5. The first photo after lunch takes 40 seconds; the next ones take 3 seconds.
6. CI fails at `docker push` with "permission denied".
7. The inference service returns different attributes this week, although nobody changed our code.

**Question 4.** You fix a typo in one of the API's error messages. What has to happen for users to
see the fix?

- a) someone runs `pulumi up`
- b) the change is merged; CI builds and pushes a new image; Cloud Run gets a new revision that uses it
- c) the uploads bucket is recreated
- d) nothing: Cloud Run reads the latest code from GitHub automatically

**Question 5.** In our plan, CI builds and pushes images automatically, but a human runs `pulumi up`,
and the coding agent isn't allowed to run Pulumi at all. Why treat infrastructure changes more carefully
than code changes?

---

## Part D: Following a request when things go wrong (30 minutes)

In production you can't attach a debugger or add a `print`. You have **logs**, and you need to find
the few lines about *one* user's request among thousands.

### Request IDs

Our API already does the groundwork (`services/api/app/core/middleware.py`):

- every request gets a **request ID**: either a sensible one the caller sent in the `X-Request-ID`
  header, or a new random one
- the ID is returned in the response's `X-Request-ID` header, and inside every error body
- every log line written while handling the request includes it, as structured JSON
  (`services/api/app/core/logging.py`)

On Cloud Run, those JSON lines go to Cloud Logging, where you can search for `request_id`. When the
API starts calling inference, it should pass the same ID along, so one ID follows a photo through
both services.

### Exercise D1: trace a request (15 minutes)

Stop the API from Part B (`Ctrl+C` in terminal 1), and restart it so its output is also saved to a
file you can search, like a tiny Cloud Logging:

```bash
cd services/api && uv run uvicorn app.main:app --reload --port 8000 2>&1 | tee ~/api.log
```

In another terminal, send a request with your own request ID:

```bash
curl -i -H "X-Request-ID: trace-me-123" http://localhost:8000/health
grep trace-me-123 ~/api.log
```

The response includes `x-request-id: trace-me-123`, and `grep` finds the matching log line:

```
{"severity": "INFO", "message": "request_completed", "logger": "app.request", "timestamp": "...",
 "request_id": "trace-me-123", "http_method": "GET", "path": "/health", "status_code": 200,
 "duration_ms": 0.47}
```

(It's one long line; it's wrapped here to fit.) Locally you'll also see uvicorn's plain-text line,
`INFO: 127.0.0.1:... - "GET /health HTTP/1.1" 200 OK`. Our Dockerfile turns that off, because the
JSON line already says everything.

Now make something fail, and follow it:

```bash
curl -i http://localhost:8000/does-not-exist
```

```
HTTP/1.1 404 Not Found
...
x-request-id: 927f770558e342b1834721b147f48193

{"error":{"code":"not_found","message":"Not Found","request_id":"927f770558e342b1834721b147f48193"}}
```

Your ID will be different. Copy it from the response and `grep` for it in `~/api.log`. Finally,
reload the frontend, copy the `x-request-id` from the browser's Network tab, and find that request in
the log too. **That's the whole support workflow:** the user's screen shows an ID, and the ID leads
you to the logs.

### What happens if…

| Situation | What the user sees | Where to look | What prevents or fixes it |
| --- | --- | --- | --- |
| **Inference is slow or stuck**, and the API's timeout fires | an error message instead of an endless spinner | API logs for that request ID: a timeout error | a timeout on every call; a clear error code; the frontend offers a retry |
| **Cold start**: inference scaled to zero and must load the model | the first photo after a quiet period is very slow | Cloud Run start-up logs; request durations | measure it; then choose: accept it, keep one instance warm (costs money, Lesson 9), a smaller model, or bake the weights into the image |
| **Wrong model revision**, a typo in `INFERENCE_MODEL_REVISION` | nothing, if caught: the new revision fails to start, so Cloud Run keeps serving the old one | the deployment's failure message and start-up logs | pinned revisions; `/health` reports `model_id` and `model_revision`; the manifest's file hashes |
| **A moving model reference** (`main` instead of a SHA) | answers quietly change from one week to the next | `/health` and the model's Hub history | never use `main`; pin the SHA and record it with every result |
| **The API's service account can't write to the bucket** | "An unexpected error occurred" (`500`, `internal_error`) | API logs: the full error, with the request ID | fix the IAM binding *in Pulumi*, not by clicking in the console |
| **The frontend can't reach the API** (wrong `VITE_API_BASE_URL`, or its origin missing from `API_CORS_ORIGINS`) | "API unavailable" | the browser's Console and Network tabs (a CORS error); the API may log nothing at all | correct configuration; the deployed frontend's origin listed in `API_CORS_ORIGINS` |

Notice the pattern: **the user should always get a clear error with a request ID, never a hang or a
stack trace**, and the details live in the logs. Our API's error envelope already does this for every
error it knows how to produce.

**Question 6.** A tester reports: "Uploading failed. The error said request ID
`9c1e…`." Describe, step by step, how you'd find out what happened, and how you'd tell whether the
problem was in the API, in inference, or in configuration.

**Question 7.** The inference service is deployed with `INFERENCE_MODEL_REVISION=main`. Everything
works today. What's the main risk?

- a) none: `main` is the most up-to-date version, which is what we want
- b) Cloud Run refuses to start containers with that setting
- c) the weights behind `main` can change at any time, so the same configuration may load a different
  model tomorrow, silently changing outputs and invalidating every evaluation
- d) requests become slower, because Hugging Face checks for updates on every request

---

## Part E: Draw it, then plan a deployment (25 minutes)

### Exercise E1: draw the architecture from memory (10 minutes)

On paper, on a whiteboard, or as ASCII in a text file, draw the whole system **without looking at
Part A**:

- boxes for the browser, frontend hosting, API, inference, both buckets, Artifact Registry, GitHub and
  Actions, Pulumi and Cloud Logging
- arrows **labelled with what flows**: JSON, photo bytes, weights, images, configuration, logs
- mark each box **exists** or **planned**
- colour or tag each arrow with its phase: development, deployment or runtime

Then compare with Part A. What did you leave out? Missing pieces show you what to revise.

### Exercise E2: a one-page deployment plan (15 minutes)

Write a plan for the **first deployment of the API alone to the dev project** (no inference, no
buckets). Use this template, and keep it to one page:

```
 Goal:                       what will be true afterwards, in one sentence
 Resources created:          each one, with its name from stack_config.resource_name()
 Cost estimate:              at idle, and at expected dev use (Lesson 9)
 Permissions:                which service account, which roles, on which resources
 Steps, and who runs each:   build, push, pulumi preview, review, pulumi up, check
 How we check it works:      the exact command and the expected response
 How we undo it:             what we remove, and what (if anything) is lost
 Open questions:             what you'd need to ask your teammate
```

This is a planning exercise. **Don't create anything in Google Cloud.** Share the plan with your
teammate and ask for feedback: it's exactly the conversation the optional deployment in Lesson 12
starts with.

---

## Wrap-up

**Question 8 (explain it back).** Without notes, walk through all seven steps of a photo's journey.
For each step, say where it runs, which file or service is responsible, and what exists today. Then
explain how a code change travels from your laptop to that running system, naming every tool from
this lesson in the order it's used.

### Cheat sheet

| Phase | Question it answers | Our tools |
| --- | --- | --- |
| Development | "Does my change work on my machine?" | Git, uv, npm, uvicorn, Vite, pytest, `make check`, Docker |
| Deployment | "How does a reviewed commit become a running service?" | GitHub PRs, GitHub Actions *(planned)*, Docker build and push, Artifact Registry, Pulumi (human-run), Cloud Run revisions |
| Runtime | "What happens when a user uploads a photo?" | Cloud Run, Cloud Storage, IAM, Cloud Logging, request IDs |

| Rule | Why |
| --- | --- |
| The API never loads a model; inference never stores data | each service scales, costs and fails on its own terms |
| Every call between services has a timeout | a stuck dependency mustn't hang everything |
| Every request has an ID that appears in logs and errors | one ID leads from a user's screen to the cause |
| Images are tagged with a commit SHA; models with a revision SHA | you always know exactly what's running |
| Infrastructure changes go through Pulumi, reviewed, run by a human | infrastructure mistakes cost money or data |

### Done when

- [ ] Exercises A1, B1, C1, D1, E1 and E2 are done
- [ ] You've written answers to Questions 1–8 and compared them with the
      [answer key](../answers/11-how-everything-connects.md), or talked them through with the tutor
      (`/tutor` or `$tutor`)
- [ ] You can draw the Part A diagram from memory and walk the seven steps without notes
- [ ] Your teammate has seen your deployment plan

Next: **Lesson 12, Final challenge.** You'll build the dashed boxes yourself: a small, working version
of the upload → model → result flow.
