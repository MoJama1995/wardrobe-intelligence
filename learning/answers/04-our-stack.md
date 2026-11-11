# Lesson 4 answer key: Our technical stack

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask the tutor why
> (`/tutor` or `$tutor`).

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: why inference doesn't depend on PyTorch yet

**A good answer includes:**

- The **serving runtime** hasn't been chosen (plain Transformers or vLLM, which precision, which
  quantisation), and neither has the **model**. Those choices decide *which* packages and versions
  are needed. vLLM, for example, pins its own PyTorch version, and the base image changes to a CUDA
  image. Adding PyTorch now would probably mean redoing it later.
- **Cost today:** gigabytes of downloads in every `uv sync`, a much larger lockfile and Docker image,
  and slower CI and builds, all for code that doesn't exist yet.
- It follows the project rule "add dependencies only for a demonstrated need" (`AGENTS.md`). The
  dependency arrives together with the ADR that justifies it.

---

### Question 2: what's still involved at runtime

**Answer: c).** At runtime the browser downloads and runs the JavaScript files Vite built from our
TypeScript. That's all that's left of the frontend toolchain.

**Why the others are wrong:**

- a) TypeScript's types are checked during development and the build, then removed. Browsers only
  run JavaScript, so there's no type checking in the user's browser. That's why the *API* still has
  to validate every request.
- b) The proxy only exists in the Vite **development** server on your laptop. Deployed, the
  frontend calls the API's real URL (`VITE_API_BASE_URL`), and CORS has to allow it.
- d) uv installs Python packages. It's not involved with the frontend at all, and it isn't even
  inside our runtime containers: look at the Dockerfile's `runtime` stage.

---

### Question 3: deployment compared with runtime

**A good answer includes:**

- **Deployment** is the *process* of turning a reviewed commit into a running new version: run the
  checks, build the image, push it, update the infrastructure, roll out the new version. It happens
  occasionally and is triggered by us.
- **Runtime** is the live system *while it's being used*. It runs all the time, reacts to users, and
  depends on everything around it.
- **Deployment failures** (examples): tests fail in CI; the image is built for the wrong CPU
  architecture (`exec format error`, from building on Apple Silicon without
  `--platform linux/amd64`); Pulumi lacks a permission; the new version crashes at startup. Cloud
  Run then keeps serving the old version.
- **Runtime failures** (examples): inference is cold and the API times out; the GPU runs out of
  memory on a large image; a bucket permission is wrong, so uploads fail; a traffic spike hits the
  maximum number of instances; a bug only shows with certain photos.

**Why the distinction matters:** a deployment failure is usually visible to *us* and safe for users
(the old version keeps running). A runtime failure is visible to *users*. You debug them in
different places: CI logs, compared with the service's logs and metrics.

---

### Question 4: a classifier inside `services/api`

**A good answer includes:**

- It breaks the project rule that **the API has no ML dependencies** (`services/api/pyproject.toml`,
  ADR 0001's alternatives). PyTorch adds gigabytes to the API's environment and image, so builds,
  deploys and cold starts get slower, for *every* API change.
- The API runs on **cheap CPU instances**. Model inference wants a GPU, and scales and costs
  differently.
- It couples **model releases** to API deploys and skips the model conventions (pinned revisions,
  manifest, evaluation report, reproducibility check) that live with `services/inference`.
- **Put it in `services/inference`**, behind an endpoint, alongside the VLM. The network hop costs a
  few milliseconds, which is negligible next to model inference.

**Misconception:** *"Fewer services is always simpler."* Fewer *moving parts per service* is often
simpler. The split is what keeps the API small, cheap and easy to change.

---

### Question 5: explaining the stack

**A good answer covers most of:**

- **Frontend:** React + TypeScript, built with Vite. Popular, and the types come from the API's
  contract, so mismatches are compile errors.
- **API:** Python + FastAPI + Pydantic. Our main language, with automatic validation and OpenAPI
  generation (the contract).
- **Inference:** a separate FastAPI service that owns the model. Separate because it needs a GPU,
  costs more and changes with the model. The model and runtime (PyTorch, Hugging Face, maybe vLLM)
  aren't chosen yet. **Planned.**
- **Evaluation and research:** `packages/ai-evaluation`, a plain Python library shared by Colab, CI
  and evaluation jobs; Colab for experiments.
- **Tooling:** uv per Python project, npm for the frontend, and a `Makefile` (not Turborepo) to run
  everything's checks.
- **Delivery:** Docker images, Pulumi (Python) to define Google Cloud resources, Cloud Run, Cloud
  Storage, and GitHub with GitHub Actions. **Planned:** nothing is deployed and CI isn't set up yet.

---

### Exercise B1: sort the stack

| Technology | Development | Deployment | Runtime |
| --- | :---: | :---: | :---: |
| uv | ✓ installs environments | ✓ inside `docker build` | |
| npm | ✓ | ✓ installs and builds in CI | |
| Vite | ✓ dev server and proxy | ✓ `vite build` | |
| TypeScript | ✓ editor and `typecheck` | ✓ checked in the build, then stripped | |
| React | ✓ | | ✓ in the user's browser |
| FastAPI | ✓ | | ✓ |
| Uvicorn | ✓ `uv run uvicorn ...` | | ✓ the container's `CMD` |
| Pydantic | ✓ generates the contract | | ✓ validates every request |
| pytest | ✓ | ✓ in CI | |
| Docker | ✓ optional local builds | ✓ builds the images | ✓ Cloud Run runs the image (with its own container runtime, not Docker itself) |
| Pulumi | ✓ you write it | ✓ creates and updates resources | |
| GitHub Actions | | ✓ | |
| Cloud Run | | ✓ the deployment target | ✓ |
| Cloud Storage | | ✓ model releases are uploaded to the registry | ✓ photos, model weights at startup |
| PyTorch | ✓ Colab | | ✓ in inference, once added |
| Claude Code or Codex | ✓ | | |

Small differences are fine (for example, whether contract generation counts as development or the
build). What matters is noticing that the **runtime** column is short: most of our tools exist only
to *produce* the running system.

---

### Exercise C1: a fit card

There's no single right card. A complete one has:

- a model id and an **exact revision** (a commit SHA from the Hub's "Files and versions" page, or
  `huggingface_hub` / `git ls-remote`), not just the model name
- the **licence**, quoted from the model card with the date you checked it, and whether it allows
  commercial use
- **size and memory:** parameters × bytes per parameter at the serving precision (about 2 bytes
  each in bf16), plus headroom for activations and the image tokens
- the **packages** `services/inference` would need, and whether it needs `trust_remote_code`
- a plan for **structured output** that the service can validate, including how the model abstains
- an **evaluation plan:** the same evaluation set, a baseline, and `ai_evaluation.score_attributes`
  for per-field accuracy, coverage and unsupported claims

If you couldn't fill in a line, that's the first thing to find out before choosing.
