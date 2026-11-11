# Lesson 4: Our technical stack

**Time:** about 1.5 hours, in three parts (A–C).

**By the end you can:**

- name every technology in our stack, what it does and why we chose it
- find the file that proves each one is used, and its exact version
- say which technologies exist in the repository today and which are planned
- explain how they work together during development, deployment and runtime
- list what any model has to satisfy to fit into our project (choosing it is up to you)

| You need now | You can learn later |
| --- | --- |
| what each tool is *for* and where it lives; development compared with deployment compared with runtime; which parts are planned | each tool in depth: React hooks, FastAPI dependency injection, Pulumi component resources, Cloud Run tuning, vLLM. Later lessons and real tasks will take you deeper as you need it |

---

## Part A: The stack, layer by layer (40 minutes)

A **stack** is the set of technologies a product is built from, usually described layer by layer:
what runs in the browser, on the servers, for the model, and around all of them.

```
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ FRONTEND        React + TypeScript, built by Vite                  apps/web   │
 ├───────────────────────────────────────────────────────────────────────────────┤
 │ BACKEND         Python + FastAPI (Pydantic, Uvicorn)            services/api  │
 ├───────────────────────────────────────────────────────────────────────────────┤
 │ MODEL           VLM inference service (FastAPI today;     services/inference  │
 │                 PyTorch + Hugging Face once the model is chosen)              │
 │                 Research: Colab + PyTorch + Hugging Face          experiments/│
 ├───────────────────────────────────────────────────────────────────────────────┤
 │ TOOLING         uv (Python), npm (JS), Makefile; Ruff, mypy, pytest,          │
 │                 oxlint, Prettier, Vitest; Claude Code or Codex                │
 ├───────────────────────────────────────────────────────────────────────────────┤
 │ DELIVERY        GitHub (+ Actions), Docker, Pulumi (Python),                  │
 │                 Google Cloud: Cloud Run, Cloud Storage, ...    infrastructure/│
 └───────────────────────────────────────────────────────────────────────────────┘
```

### Frontend

**React + TypeScript** (`apps/web`). **Present.**
React builds user interfaces from *components*: functions that turn data into what's on screen.
`ApiStatus.tsx` is one. **TypeScript** is JavaScript with types, checked before the code runs.
*Why:* React is the most widely used UI library, so help, libraries and hiring are easy.
TypeScript's types let the frontend use the API's generated contract (Lesson 3), so a mismatch is a
compile error instead of a bug in someone's browser. **Vite** is the development server (with the
`/api` proxy) and builds the final files the browser downloads ([ADR 0004](../../docs/decisions/0004-frontend-tooling.md)).

### Backend

**Python + FastAPI** (`services/api`). **Present** (only `/health` so far).
FastAPI is a web framework: you write Python functions, and it turns them into HTTP endpoints.
**Pydantic** models validate every request and response. **Uvicorn** is the server process that
runs it. *Why:* it's Python, the language we both know best and the one the ML ecosystem uses.
Pydantic validation is automatic, and FastAPI generates the OpenAPI document that our whole
contract chain is built on ([ADR 0003](../../docs/decisions/0003-api-contract-via-openapi.md)).

### Model

**PyTorch and Hugging Face** (`experiments/` today, `services/inference` later). **Planned.**
You know these better than any lesson could teach you. In our stack, PyTorch and Hugging Face
`transformers` are used in Colab for research, and the Hugging Face Hub hosts the open-weight
models we reference by exact revision. They are **not dependencies of any project yet**: the
`services/inference/pyproject.toml` says they arrive together with the ADR that chooses the serving
runtime.

**The VLM inference service** (`services/inference`). **Skeleton.**
A separate FastAPI service that owns everything model-specific: loading weights, preprocessing,
prompting and parsing the output into structured attributes. It's separate from the API because it
needs a GPU, costs far more, and changes on a different rhythm (Lesson 2). Today it only has
`/health`. **Which model it runs is your decision** (Part C).

### Tooling

**uv** (every Python project). **Present.**
Installs Python itself, creates each project's virtual environment, resolves dependencies and writes
`uv.lock`. *Why:* one fast tool instead of pyenv + venv + pip + pip-tools
([ADR 0002](../../docs/decisions/0002-python-tooling.md)).

**Turborepo.** **Not used.**
A task runner with caching for JavaScript monorepos. With one JavaScript project and four Python
ones, a root `Makefile` does the job (Lesson 2). It may come later, with an ADR, if the need appears.

**Quality tools.** **Present.** Ruff (Python formatting and linting), mypy (Python type checking,
strict), pytest (Python tests), oxlint and Prettier (TypeScript linting and formatting), Vitest
(frontend tests). `make check` runs them all.

### Delivery and infrastructure

**GitHub.** **Planned** (the repository goes up first; CI comes later).
Hosts the repository, pull requests and reviews (Lesson 1). **GitHub Actions** will run
`make check` and build container images on every PR, and authenticate to Google Cloud *without*
stored keys (Workload Identity Federation, Lesson 11).

**Docker** (`services/api/Dockerfile`, `services/inference/Dockerfile`). **Present, not yet used
in deployment.** Packages a service together with its exact Python and libraries into an *image*
that runs the same way on any machine. *Why:* Cloud Run runs containers, and "it works on my
laptop" becomes "it works everywhere" (Lesson 10).

**Pulumi with Python** (`infrastructure/`). **Skeleton: no resources defined, nothing deployed.**
*Infrastructure as code*: instead of clicking in the Google Cloud console, we describe buckets,
services and permissions in Python, review the changes in a PR, and apply them. *Why Python:* the
same language as everything else, and the pure parts can be unit-tested
(`infrastructure/tests/test_stack_config.py`). Only a human runs `pulumi up`, and the coding
agent isn't allowed to run Pulumi at all here.

**Google Cloud.** **Planned.**
Where the product will run. **Cloud Run** runs our containers and scales to zero when idle: CPU for
the API, an NVIDIA L4 GPU as the default candidate for inference. **Cloud Storage** holds uploaded
photos (private) and the versioned model registry. **Artifact Registry** stores our images,
**Secret Manager** holds secrets and **Cloud Logging** collects the JSON logs from Lesson 3. *Why:*
managed services with scale-to-zero keep costs near zero while nobody's using it, and Cloud Run
offers GPUs (Lesson 9).

### Exercise A1: find the evidence (15 minutes)

For each technology, find the file that proves we use it, and its exact version. From the
repository root:

```bash
cat .python-version
cat apps/web/.nvmrc
grep -A1 '^name = "fastapi"' services/api/uv.lock
grep -A1 '^name = "pydantic"' services/api/uv.lock
grep -A1 '^name = "pulumi"' infrastructure/uv.lock
(cd apps/web && npm ls react vite typescript --depth=0)
grep -n "^FROM\|uv:" services/api/Dockerfile
grep -rn "torch\|transformers" --include=pyproject.toml services packages infrastructure
```

Expected output (versions change over time):

```
3.12
26
name = "fastapi"
version = "0.162.4"
name = "pydantic"
version = "2.14.3"
name = "pulumi"
version = "3.274.1"
web@0.0.0 /Users/you/dev/wardrobe-intelligence/apps/web
├── react@19.3.1
├── typescript@7.0.2
└── vite@8.3.7
5:FROM python:3.12-slim AS build
6:COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /bin/uv
14:FROM python:3.12-slim AS runtime
services/inference/pyproject.toml:12:# ML runtime dependencies (torch, transformers or vLLM, ...) are added together with
```

Look at the last result closely: the *only* mention of PyTorch or Transformers in any project is a
comment saying they haven't been added yet.

**Question 1.** Why do you think the inference service doesn't depend on PyTorch yet, even though
everyone knows it will need it? What would adding it today cost?

---

## Part B: How it all works together (30 minutes)

### Development, deployment and runtime

The same technologies play different roles at different moments. Keep these three apart:

- **Development:** you, on your laptop or in Colab, writing and checking code.
- **Deployment:** turning a reviewed commit into something running in the cloud.
- **Runtime:** the live system, while a user is using it.

```
DEVELOPMENT  (your laptop, Colab)
  editor + coding agent ........ write code
  uv, npm ...................... install dependencies from the lockfiles
  Uvicorn, Vite dev server ..... run the services locally (Lesson 3)
  Ruff, mypy, pytest, Vitest ... check it (make check)
  Colab + PyTorch + HF ......... experiments, scored with packages/ai-evaluation
        │
        │  git push → pull request → review → merge
        ▼
DEPLOYMENT  (planned: nothing is deployed yet)
  GitHub Actions ............... run make check; docker build; push images to Artifact Registry
  Pulumi ....................... create or update Cloud Run services, buckets and permissions
        │
        ▼
RUNTIME  (Google Cloud, while users use it)
  browser: React app ──HTTP──▶ Cloud Run: services/api (CPU) ──HTTP──▶ Cloud Run: inference (GPU)
                                       │                                        │
                                       ▼                                        ▼
                             Cloud Storage: photos               Cloud Storage: model registry
```

Some tools appear in more than one stage, in different roles:

- **Uvicorn** runs the API on your laptop *and* inside the container on Cloud Run: it's the same
  command (`uvicorn app.main:app ...`) in both places.
- **uv** installs dependencies on your laptop *and* during `docker build` (look at the Dockerfile).
- **Vite** is a development server on your laptop, then a build tool at deployment. At runtime
  it's gone: the browser just downloads the static files Vite built.
- **TypeScript** only exists before runtime. Browsers run JavaScript. The types are checked, then
  stripped out during the build.

Where the frontend is hosted at runtime (Cloud Run, Firebase Hosting, or Cloud Storage with a CDN)
is still an open decision (`docs/architecture/overview.md`).

### Exercise B1: sort the stack (10 minutes)

Draw three columns, **Development**, **Deployment** and **Runtime**, and place each of these in
every column where it plays a role. Some belong in more than one.

`uv` · `npm` · `Vite` · `TypeScript` · `React` · `FastAPI` · `Uvicorn` · `Pydantic` · `pytest` ·
`Docker` · `Pulumi` · `GitHub Actions` · `Cloud Run` · `Cloud Storage` · `PyTorch` · `Claude Code` or `Codex`

**Question 2.** Which of these is still involved when a user opens our *deployed* web app?

- a) TypeScript's type checker, protecting the user from type errors
- b) The Vite dev server's `/api` proxy
- c) The JavaScript files that Vite built from our TypeScript
- d) uv, installing the frontend's dependencies

**Question 3.** In your own words, what's the difference between *deployment* and *runtime*? Give one
thing that can go wrong in each.

---

## Part C: Why these choices, and where your model fits (20 minutes)

### The principles behind the choices

You'll notice the same few ideas behind almost every choice:

1. **One language wherever possible.** Python for the API, the model, evaluation and
   infrastructure, so both of us can read and review everything. TypeScript only where it's
   unavoidable: the browser.
2. **Write it once, generate the rest.** The contract chain (Pydantic → OpenAPI → TypeScript) and
   lockfiles both exist so that nothing has to be kept in sync by hand.
3. **Managed services over running our own servers.** Cloud Run scales to zero and patches its
   machines for us. We pay for what we use and don't babysit servers (Lesson 9).
4. **Popular, well-documented tools.** Easier to learn, easier to get help with, and coding agents
   know them well.
5. **Add things only when they're needed.** Turborepo, Pillow, PyTorch and a database all come later,
   each with a reason, and often with an ADR.

Every choice has a cost. Two languages means two toolchains. Separate services means network calls,
which can fail (Lesson 3). Cloud Run GPUs scale to zero, but a cold start means loading the model
again. Knowing the trade-off is what lets you change a decision well later.

### Your model: what it has to fit

**Choosing the model is your call.** You lead ML, and you'll decide based on evaluation results.
The project only asks that whatever you choose fits its rules (from `services/inference/README.md`,
the `model-packaging` skill and `AGENTS.md`):

| Rule | Why |
| --- | --- |
| Its dependencies live **only** in `services/inference`, never in `services/api` | keeps the API small, cheap and fast to deploy |
| It's identified by `INFERENCE_MODEL_ID` plus an **immutable** `INFERENCE_MODEL_REVISION` (a Hub commit SHA or a registry version), never `main` | the same configuration always loads the same weights |
| Its **licence** allows our use, checked on the model card and recorded with the date | some open-weight licences forbid commercial use |
| It fits the **hardware**: your laptop for development, and the hosting target for production (an L4 GPU with 24 GB is the default candidate, still to be measured) | memory, latency and cold start decide what's feasible |
| Its output is parsed into **structured attributes** that `packages/ai-evaluation` can score, and it can abstain instead of inventing | we measure accuracy, coverage and unsupported claims |
| No `trust_remote_code=True` unless the revision is pinned and the code reviewed | remote code runs at load time |
| The choice is justified by an **evaluation against a baseline** on a versioned evaluation set, recorded in `docs/ml/evaluations/` and an ADR | decisions with evidence, not by eyeballing |

### Exercise C1: a fit card for a model you're considering (10 minutes)

Pick any VLM you'd consider (it's only an exercise, not a decision). Without downloading anything,
fill in a short card in your own notes, not in the repository:

- model id, and how you'd find the exact revision to pin
- licence, and whether it allows a product like ours
- parameter count, and rough memory at the precision you'd serve it in
- which Python packages `services/inference` would need
- how you'd get structured output (prompting for JSON, constrained decoding, ...)
- how you'd compare it with a baseline using `packages/ai-evaluation`

**Question 4.** Your teammate suggests running a small PyTorch garment classifier *inside*
`services/api` "to save a network hop". What would you say, and where would you put it instead?

---

## Wrap-up

**Question 5 (explain it back).** A new ML engineer joins. In five or six sentences, explain our
stack to them: for each layer, which technology, what it does and why we chose it. Mention one thing
that's planned rather than built.

### Cheat sheet

| Layer | Technology | Lives in | Status |
| --- | --- | --- | --- |
| Frontend | React, TypeScript, Vite | `apps/web` | present |
| Backend | Python, FastAPI, Pydantic, Uvicorn | `services/api` | present |
| Model service | FastAPI + (your model, PyTorch / HF) | `services/inference` | skeleton |
| Evaluation | plain Python | `packages/ai-evaluation` | present |
| Research | Colab, PyTorch, Hugging Face | `experiments/` | ready for notebooks |
| Python tooling | uv, Ruff, mypy, pytest | every Python project | present |
| Task runner | Makefile (not Turborepo) | repo root | present |
| Packaging | Docker | `services/*/Dockerfile` | present, not deployed |
| Infrastructure | Pulumi (Python), Google Cloud | `infrastructure/` | skeleton, nothing deployed |
| Collaboration | GitHub, GitHub Actions | `.github/` (planned) | planned |

### Done when

- [ ] Exercise A1: you found the evidence and version for each technology
- [ ] Exercise B1: your three columns are sorted
- [ ] Exercise C1: you've written a fit card
- [ ] You've written answers to Questions 1–5 and compared them with the
      [answer key](../answers/04-our-stack.md), or talked them through with the tutor
      (`/tutor` or `$tutor`)
- [ ] You can draw the development → deployment → runtime diagram without looking

Next: **Lesson 5, Working with a coding agent.** How to work with Claude Code or Codex in this
repository.
