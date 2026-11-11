# Lesson 2 answer key: Project structure and architecture

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: `packages/` compared with `services/`, and importing from `experiments/`

**A good answer includes:**

- `services/inference` is a **service**: a program that keeps running and answers requests over the
  network (the API calls it over HTTP).
- `packages/ai-evaluation` is a **library**: code that other things *import*. It never runs on its
  own. It's installable (it has a `[build-system]` in `pyproject.toml`), so Colab, CI and evaluation
  jobs can all `pip install` the same version and get comparable scores.
- If inference imported from `experiments/`, production would depend on research code: notebooks
  that change daily, may read Drive paths or Colab state, and aren't reviewed or tested like product
  code. A change made for an experiment could silently change what users get. The rule "nothing
  imports `experiments/`" keeps research free to be messy *and* production safe.

**Misconception:** *"`packages/` is for small things and `services/` for big things."* It's about
how the code is used (imported or running), not size.

---

### Question 2: why the lockfile has many more packages than the manifest

**A good answer includes:**

- The manifest lists **direct** dependencies: the libraries our code imports. Each of those has its
  own dependencies, and so on. These are **transitive** (indirect) dependencies. FastAPI, for
  example, pulls in Starlette, and Starlette pulls in AnyIO.
- `uv.lock` also includes the **dev** dependencies (pytest, mypy, Ruff) and *their* dependencies.
  At the time of writing, that's 38 packages in total.
- The lockfile pins **every** package to an exact version (with checksums), because any one of them
  can change behaviour. Without that, two people, or your laptop and the server, could install
  different versions of a transitive dependency and see different results.

**ML link:** it's the same reason you pin a model revision *and* the processor revision. Something
you didn't choose directly can still change your output.

---

### Question 3: "Turborepo can manage all our dependencies"

**Answer: b).** Turborepo orders tasks and caches their results across JavaScript/TypeScript
packages. Installing and resolving dependencies stays with npm (and, for us, uv), and Turborepo
doesn't manage Python environments or lockfiles at all.

**Why the others are wrong:** it's built *for* monorepos (c is backwards), and it has nothing to do
with Git (d).

**Worth adding to your answer:** with one JavaScript project and four Python projects, the root
`Makefile` already gives us "run every project's checks with one command". Turborepo would earn its
place if we had several JavaScript packages, or slow CI where caching pays off, and that change
would get its own ADR.

---

### Question 4: why the reading order starts with docs

**A good answer includes:**

- Code tells you *what* happens, line by line, but not *why*, or which parts matter. The README and
  architecture docs give you the map first, so you know which 5% of the code to read.
- ADRs tell you which decisions were deliberate, so you don't "fix" something that was chosen for a
  reason.
- Jump to the **tests** when you need precise behaviour: "what exactly happens if...?" Tests are
  executable examples. For instance, `services/api/tests/test_errors.py` shows the exact error JSON
  for an unknown URL. Tests are also the quickest way to check whether docs are out of date.

---

### Question 5: one repository, five projects

**A good answer includes:**

- **One repository:** two people, one place to clone, and one pull request when a change spans
  components. For example, a new API field, the regenerated `openapi.json` and the frontend types
  all land together (ADR 0003).
- **Separate projects:** each part has different dependencies, runtime and cost. The API must stay
  small and cheap (no PyTorch), while inference will need GPU-sized dependencies. Separate
  `pyproject.toml`, `uv.lock` and `.venv` per project keep them independent (ADR 0002).
- **Not five repositories:** for two developers, that's overhead for no benefit, and contract
  changes would need coordinated releases across repositories (ADR 0001, "Alternatives considered").

---

### Exercise C1: scavenger hunt

| # | Answer | Where |
| --- | --- | --- |
| 1 | `API_CORS_ORIGINS` (a JSON list) | `services/api/app/core/config.py` (`cors_origins`, with the `API_` prefix), documented in `services/api/.env.example`; used in `services/api/app/main.py` |
| 2 | `{"status":"ok","service":"api","environment":"local","build":"local"}` | shape: `services/api/app/schemas/health.py` (`HealthResponse`); route: `services/api/app/api/health.py` |
| 3 | `services/inference/pyproject.toml`, never `services/api` | the comment in that `pyproject.toml`, `services/inference/README.md` ("Open decisions"), ADR 0002 and the `model-packaging` skill |
| 4 | the `server.proxy` section | `apps/web/vite.config.ts` |
| 5 | `INFERENCE_MODEL_REVISION` (with `INFERENCE_MODEL_ID`) | `services/inference/app/config.py`, `services/inference/.env.example` |
| 6 | ADR 0001: types are generated from the OpenAPI document instead | `docs/decisions/0001-repository-structure.md` (links to ADR 0003) |

On 5: `main` is a *moving* name. Whoever publishes the model can update it at any time, so the same
configuration could load different weights tomorrow. Results would no longer be reproducible, and a
quality drop would have no explanation. A commit SHA always means the same weights.

---

### Challenge: where does it go?

| # | Folder | Why |
| --- | --- | --- |
| 1 | `packages/ai-evaluation` | a metric: a pure, reusable function, shared by Colab, CI and evaluation jobs |
| 2 | `experiments/notebooks/` (conclusions go in `docs/ml/experiments/`) | research; nothing else depends on it |
| 3 | `services/api` | product logic and persistence; no ML involved |
| 4 | `services/inference` | it determines what the model sees, so it belongs with the model (and must match the notebook exactly) |
| 5 | `infrastructure/` | cloud resources are defined in Pulumi, never created by hand |
| 6 | `apps/web` | it runs in the browser |
| 7 | `docs/decisions/` (an ADR), linking the evaluation report in `docs/ml/evaluations/` | decisions and their evidence are permanent records |

**Common slip on 4:** putting preprocessing in the API "because it receives the photo". The API
validates the *upload* (type, size, EXIF stripping for privacy). The *model's* preprocessing
(resize, colour mode, orientation as the model expects) belongs to inference, so it's versioned and
tested together with the model.
