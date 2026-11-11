# Lesson 2: Project structure and architecture

**Time:** about 2 hours, in three parts (A–C) plus a short challenge.

**By the end you can:**

- name the parts every software project has, and find them in our repository
- explain the difference between a folder, a module, a package, a project and a service
- explain why our frontend, API, inference, evaluation, experiments and infrastructure live apart
- say what a monorepo is, what Turborepo does and doesn't do, and why we don't use it (yet)
- explain why Python and JavaScript dependencies are managed by different tools
- set up the whole repository and check it with two commands
- find your way around a repository you've never seen before

| You need now | You can learn later |
| --- | --- |
| the top-level folders and what each one is for; `pyproject.toml` / `uv.lock` / `package.json` / `package-lock.json`; `make setup` and `make check`; what an ADR is; a reading order for new repositories | uv workspaces, npm workspaces, Turborepo and Nx in depth, build caching, publishing packages to PyPI or npm |

---

## Before you start (10 minutes)

You need the repository on your laptop (Lesson 1, Exercise D1), plus two tools:

```bash
brew install uv node
uv --version
node --version     # 24 or newer
```

**uv** manages Python versions, virtual environments and dependencies. **Node.js** runs the
JavaScript tooling for the frontend. You'll see why there are two separate tools in Part B.

Open the repository in your editor:

```bash
cd ~/dev/wardrobe-intelligence
code .
```

---

## Part A: What a software project is made of (25 minutes)

### More than code

A notebook mixes code, results and notes in one file, and it runs in one environment you set up by
hand. A software product splits those concerns into separate, named places, so that another person
(or a server) can rebuild and run it without you:

| Part | What it is | Where it lives in our repository |
| --- | --- | --- |
| **Source code** | the program itself | `app/` in each service, `src/` in the frontend and evaluation package |
| **Dependency manifest** | the libraries the code needs, with version *ranges* | `pyproject.toml`, `package.json` |
| **Lockfile** | the *exact* version of every library actually installed, including indirect ones | `uv.lock`, `package-lock.json` |
| **Configuration** | settings that change between laptop, dev and prod, read from environment variables | `app/core/config.py`, `.env.example` |
| **Tests** | code that checks the code | `tests/` in each Python project, `*.test.tsx` in the frontend |
| **Tooling config** | formatter, linter and type-checker rules | `ruff.toml`, `.oxlintrc.json`, `tsconfig.json` |
| **Packaging** | how to turn the code into something that runs on a server | `Dockerfile` (Lesson 10) |
| **Infrastructure** | the cloud resources the code runs on, written as code | `infrastructure/` (Lessons 9 and 11) |
| **Documentation** | how to run it, how it's designed and why | `README.md` files, `docs/` |

You already know the lockfile idea from ML: it's the dependency equivalent of pinning a model to an
exact revision instead of `main`. The same lockfile always installs the same libraries, so "works on
my machine" becomes "works on every machine".

### Five words people mix up

| Word | Meaning | Example in our repository |
| --- | --- | --- |
| **Folder** (directory) | just a place on disk | `docs/` |
| **Module** | one file of code you can import | `services/api/app/core/config.py` is the Python module `app.core.config` |
| **Package** | (1) in Python, a folder of modules you import together; (2) something you can *install* with `pip`, `uv` or `npm` | (1) `app.core`; (2) `ai-evaluation`, `fastapi`, `react` |
| **Project** | a unit with its own dependency manifest, lockfile, environment and tests, which builds on its own | `services/api` (we have five projects) |
| **Service** | a program that keeps running and answers requests from other programs over the network | `services/api`, `services/inference` |

So `services/api` is a folder, a project *and* a service. `packages/ai-evaluation` is a folder, a
project and an installable package, but not a service: nothing runs it on its own, it gets imported.

### Exercise A1: a tour of the top level (15 minutes)

From the repository root:

```bash
ls
cat README.md
```

You should see these folders:

```
apps/web/                 React + TypeScript (Vite) frontend
services/api/             FastAPI public API: validation, orchestration, persistence
services/inference/       VLM inference service: model loading, preprocessing, prompting
packages/ai-evaluation/   Model-agnostic evaluation metrics (used by experiments and CI)
experiments/              Colab notebooks and experiment configs (research only)
infrastructure/           Pulumi (Python) program for Google Cloud
docs/                     Architecture, ADRs, ML records, development guides
learning/                 Hands-on engineering course built around this repository
```

Now look inside one service and match what you see to the table above:

```bash
ls -a services/api
ls services/api/app services/api/tests
```

For each item you see (`pyproject.toml`, `uv.lock`, `app/`, `tests/`, `Dockerfile`, `.env.example`,
`openapi.json`, `.venv/`), say which row of the "More than code" table it belongs to. `.venv/` is
the project's virtual environment: installed libraries, rebuilt from the lockfile, and ignored by
Git.

**Question 1.** `packages/ai-evaluation` and `services/inference` are both Python projects. Why is
one under `packages/` and the other under `services/`? What would go wrong if the inference service
imported code from `experiments/`?

---

## Part B: Why we split things up, and what a monorepo is (35 minutes)

### Why not one big folder?

Each part of our product has different needs:

| Part | Language | Runs where | Costs | Changes when |
| --- | --- | --- | --- | --- |
| `apps/web` | TypeScript | the user's browser | almost nothing | the UI changes |
| `services/api` | Python | a cheap CPU server that scales to zero | cents | product logic changes |
| `services/inference` | Python + PyTorch (later) | a GPU server | dollars per hour while running | the model, prompt or preprocessing changes |
| `packages/ai-evaluation` | Python | Colab, CI, evaluation jobs | nothing | metrics change |
| `experiments/` | notebooks | Colab | Colab compute | every day; it's research |
| `infrastructure/` | Python (Pulumi) | your laptop or CI, when changing the cloud | whatever it creates | the cloud setup changes |

Keeping them apart means:

- **Small, fast services.** The API doesn't install PyTorch (gigabytes) just because inference
  needs it, so its container builds and starts in seconds.
- **Independent scaling and cost.** A GPU is only running when inference is needed.
- **A smaller blast radius.** A broken notebook can't break the product, because nothing imports
  `experiments/`.
- **Clear ownership and review.** A PR that touches `services/inference` is obviously ML work.

The arrows below show who is allowed to depend on whom. **Dependencies only point one way.**

```
 apps/web ──HTTP──▶ services/api ──HTTP──▶ services/inference
                         │                        │
                         ▼                        ▼
                 Cloud Storage (uploads)   model registry (versioned weights)

 experiments/ ──imports──▶ packages/ai-evaluation ◀──imports── CI / evaluation jobs

 infrastructure/ ┄┄creates┄┄▶ the cloud resources the services run on
```

Notice that `services/api` talks to `services/inference` **over HTTP** (Lesson 3), not by
importing its Python code. They're separate programs, possibly on separate machines.

<details>
<summary><strong>Go deeper:</strong> why the frontend never talks to inference directly</summary>

The browser is on the user's device, so anything it can reach, anyone can reach. The API is the
single front door. It checks every request (file type, size and, later, who the user is) before
anything reaches the expensive GPU service. Inference can then stay private and simple: it trusts
its caller because only the API can call it. You'll see how Google Cloud enforces "only the API
can call it" in Lesson 9.
</details>

### Monorepo or many repositories?

A **monorepo** is one Git repository that holds several projects. The alternative, a *polyrepo*,
gives each project its own repository.

We chose a monorepo with **independent projects**: one repository, but every project has its own
dependencies, environment and tests, and builds on its own. For two people, it means one place to
clone, one PR when a change spans the API and the frontend, and no version juggling between
repositories.

This decision is written down in an **ADR**, an *Architecture Decision Record*:
[`docs/decisions/0001-repository-structure.md`](../../docs/decisions/0001-repository-structure.md).
An ADR is a short document: the context, the decision, the alternatives and why they lost, and the
consequences. ADRs are never deleted. If a decision changes, a new ADR replaces the old one, so you
can always find out *why* something is the way it is. It's the engineering equivalent of an
experiment record that includes the negative results.

### Turborepo: what it is, and why we don't use it

You'll hear "Turborepo" often in monorepo discussions. **Turborepo** is a build tool for monorepos
made of JavaScript/TypeScript packages. You tell it how your packages depend on each other, and it:

- runs tasks such as `build`, `test` and `lint` **in the right order**, and in parallel where it can
- **caches the results**: if a package's inputs haven't changed, it reuses the previous output
  instead of running the task again, which can make CI much faster

What it **doesn't** do:

- install or resolve dependencies (npm still does that for JavaScript)
- manage Python at all: no virtual environments, no `uv.lock`
- deploy anything, or decide your architecture

Our repository has **one** JavaScript project and **four** Python projects, so Turborepo would add
very little. A small `Makefile` at the root runs each project's own tools in turn, and that's
enough for now. Turborepo (or a similar tool) becomes worth it if we end up with several JavaScript
packages, or if CI gets slow enough that caching pays off. Adding it would need a new ADR.

### Why Python and JavaScript have separate tools

Python and JavaScript are separate ecosystems: different package registries (PyPI and npm),
different installers and different lockfile formats. No single tool handles both well, so each side
uses its standard tool:

| | Python projects | The frontend |
| --- | --- | --- |
| Package registry | PyPI | npm registry |
| Tool | **uv** | **npm** |
| Manifest (ranges) | `pyproject.toml` | `package.json` |
| Lockfile (exact) | `uv.lock` | `package-lock.json` |
| Installed libraries | `.venv/` | `node_modules/` |
| Install from the lockfile | `uv sync` | `npm ci` |
| Add a dependency | `uv add <name>` | `npm install <name>` |

Each Python project has **its own** `uv.lock` and `.venv/`. That's deliberate
([ADR 0002](../../docs/decisions/0002-python-tooling.md)): when inference eventually adds PyTorch,
the API's lockfile, environment and container stay small.

### Exercise B1: set everything up with two commands (15 minutes)

The `Makefile` at the root wraps the per-project commands, so you don't have to visit each folder.

```bash
cd ~/dev/wardrobe-intelligence
make setup
```

`make setup` runs `uv sync` in every Python project and `npm ci` in `apps/web`. Watch the output:
each line starting with `==>` is a different project. The first time, uv may download Python 3.12
and every library. Later runs take a second or two.

```
==> uv sync: services/api
Resolved 38 packages in 2ms
...
==> npm ci: apps/web
```

Then check that everything is healthy:

```bash
make check
```

This runs the formatter check, linter, type checker and tests for every project. A healthy run
ends like this (the numbers change as the project grows):

```
==> pytest: services/api
9 passed in 0.03s
==> pytest: services/inference
1 passed in 0.10s
==> pytest: packages/ai-evaluation
6 passed in 0.00s
==> pytest: infrastructure
7 passed in 0.10s
==> vitest: apps/web
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Now open the `Makefile` and find the line that lists the Python projects (`PY_PROJECTS`). That's
the whole "orchestration layer" of our monorepo.

### Exercise B2: manifest compared with lockfile (10 minutes)

```bash
grep -A3 '^dependencies' services/api/pyproject.toml
grep -A1 '^name = "fastapi"' services/api/uv.lock
grep '"react"' apps/web/package.json
```

You'll see something like:

```
dependencies = [
    "fastapi>=0.162.4",
    "pydantic>=2.14.3",
...
name = "fastapi"
version = "0.162.4"
    "react": "^19.3.1",
```

The manifest says "FastAPI version 0.162.4 **or newer**". The lockfile says "exactly 0.162.4". In
`package.json`, `^19.3.1` means "19.3.1 or any newer 19.x".

Count the dependencies listed in `services/api/pyproject.toml`, then count the packages in its
lockfile:

```bash
grep -c '^name = ' services/api/uv.lock
```

**Question 2.** `services/api/pyproject.toml` lists only a handful of dependencies, but `uv.lock`
lists dozens of packages. Where do the others come from, and why does the lockfile need all of them?

**Question 3.** Your teammate suggests adding Turborepo "so it manages all our dependencies in one
place". What's wrong with that reasoning?

- a) Nothing: Turborepo installs both Python and JavaScript dependencies
- b) Turborepo orders and caches tasks; it doesn't install or resolve dependencies, and it doesn't manage Python at all
- c) Turborepo only works with a single package, so it can't be used in a monorepo
- d) Turborepo replaces Git, so we would lose our history

---

## Part C: Finding your way around an unfamiliar repository (30 minutes)

Every new job, open-source project or library starts with a repository you don't know. You don't
read it top to bottom. You read it in an order that gets you the big picture first, then drill into
only what you need.

### A reading order that works

```
 1. README.md               what is this, how do I run it?
 2. CLAUDE.md, CONTRIBUTING  rules and conventions (CLAUDE.md doubles as a map of the repo)
 3. docs/architecture/      how the parts fit together
 4. docs/decisions/         why it's built this way
 5. the component's README   how to run and change one part
 6. entry points             where execution starts
 7. tests                    what the code is supposed to do, with examples
 8. git log                  what changed recently, and why
```

**Entry points** are where a program starts. Follow the imports from there:

| Component | Entry point |
| --- | --- |
| `services/api` | `app/main.py`: `create_app()` builds the FastAPI app and registers the routers |
| `services/inference` | `app/main.py` |
| `apps/web` | `index.html` → `src/main.tsx` → `src/App.tsx` |
| `infrastructure` | `__main__.py` (Pulumi runs it) |

**Tests are documentation that can't go out of date.** If you want to know what the API returns
for an unknown URL, `services/api/tests/test_errors.py` tells you exactly, and the test would fail
if the answer changed.

### Tools for searching

| I want to... | In VS Code or Cursor | In the terminal |
| --- | --- | --- |
| open a file by name | `Cmd+P`, then type part of the name | `ls`, `find . -name "config.py"` |
| find where a word is used | `Cmd+Shift+F` | `grep -rn "cors_origins" services/` |
| jump to where something is defined | `F12` (Go to Definition) | |
| see who changed a line and why | Git blame in the editor | `git log -p <file>` |

Later (Lesson 5) you'll also ask Claude Code to explain parts of the repository. That's useful,
but you still need to know where to look to check its answers.

### Exercise C1: repository scavenger hunt (20 minutes)

Find each answer using the reading order and the search tools above. Write down the **file path**
where you found it.

1. Which environment variable sets the list of browser origins allowed to call the API?
2. What exact JSON does `GET /health` on the API return, and which file defines its shape?
3. If you added PyTorch, which `pyproject.toml` would it go in, and which ADR or README says so?
4. Which file decides that the frontend's `/api/...` requests are forwarded to port 8000 during
   development?
5. Which variable says *exactly* which model weights the inference service should load? Why must it
   never be set to `main`?
6. Which ADR explains why there's no `packages/shared-types` folder?

**Question 4.** In your own words, why does the reading order put the README and architecture docs
*before* the code? When would you jump straight to the tests?

---

## Challenge: where does it go? (10 minutes)

For each piece of work, name the folder where it belongs and give a one-line reason. Use the
dependency arrows from Part B.

1. A function that computes recall@k for "find similar garments"
2. A Colab notebook comparing two prompt versions on the evaluation set
3. An endpoint that lists all the garments a user has uploaded
4. Code that resizes and rotates a photo before the model sees it
5. A new Cloud Storage bucket for uploaded photos
6. An "Upload photo" button
7. A record of *why* you chose your baseline model

<details>
<summary>Hint 1</summary>

Ask: does this run in the browser, in the API, on the GPU, in Colab, or does it describe the cloud?
</details>

<details>
<summary>Hint 2</summary>

Preprocessing that the model depends on must be identical in the notebook and in production. Which
component owns "everything the model needs"?
</details>

---

## Wrap-up

**Question 5 (explain it back).** A new contributor asks: "Why is this one repository with five
separate projects, instead of one project or five repositories?" Answer them in a few sentences,
using at least one concrete example from our code.

### Cheat sheet

| I want to... | Command or place |
| --- | --- |
| install everything | `make setup` |
| check everything | `make check` |
| install one Python project | `cd <project> && uv sync` |
| install the frontend | `cd apps/web && npm ci` |
| add a Python dependency | `cd <project> && uv add <name>` (never edit `uv.lock` by hand) |
| add a frontend dependency | `cd apps/web && npm install <name>` |
| understand a decision | `docs/decisions/` |
| understand how the parts fit | `docs/architecture/overview.md` |

### Done when

- [ ] `make setup` and `make check` both succeed on your laptop
- [ ] Exercises A1, B1, B2 and C1 are done
- [ ] You've written answers to Questions 1–5 and the challenge, and compared them with the
      [answer key](../answers/02-project-structure.md), or talked them through with `/tutor`
- [ ] You can draw the dependency arrows from Part B without looking

Next: **Lesson 3, How software systems communicate.** You'll run the API and send it requests.
