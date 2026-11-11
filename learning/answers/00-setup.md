# Lesson 0 answer key: Set up your laptop and the project

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

### Question 1: who installs FastAPI, and where?

**A good answer includes:**

- **uv** installs it, when `make setup` runs `uv sync` in `services/api`.
- It goes into a **`.venv` folder inside `services/api`**, a virtual environment that belongs to that
  project only, not into your Mac's system Python and not into a conda environment.
- The exact version comes from `services/api/uv.lock`, so you and your teammate get identical
  libraries.

It's fine if your prediction was different. The point was to notice that, unlike in a notebook, you
never ran `pip install` yourself. Lesson 2 explains why.

---

### Question 2: where FastAPI was installed

**Answer: b).** Each Python project gets its own `.venv`, created by `uv sync` from that project's
lockfile. So the API and the inference service can use different libraries (for example, only
inference will ever need PyTorch) without conflicts.

**Misconceptions:**

- *a) Globally:* nothing in our setup installs project libraries globally. That's how a "works on my
  machine" problem starts.
- *c) `node_modules`:* that folder holds the frontend's JavaScript libraries. Python and JavaScript
  dependencies are managed by different tools (Lesson 2).
- *d) Downloaded each time:* libraries are installed once. `uv run` only starts Python with the
  project's `.venv`.

---

### Question 3: `ModuleNotFoundError` after pulling

**A good answer includes:**

- Your teammate added a new dependency, so `pyproject.toml` and `uv.lock` changed. Your `.venv`
  doesn't have that dependency yet.
- Run `uv sync` in that project (`cd services/api && uv sync`), or `make setup` from the repository
  root to update every project. Then start the API again.
- Don't `pip install` the missing library by hand. The lockfile is the source of truth, and `uv sync`
  makes your environment match it exactly.

---

### Question 4: what each command gave you

**A good answer includes:**

- **`git clone`:** a copy of the repository from GitHub, including its full history, in a new folder.
- **`make setup`:** every project's dependencies, installed at the exact versions in its lockfile
  (`.venv` folders for Python, `node_modules` for the frontend).
- **`make check`:** confidence that your setup works. It runs the formatters, linters, type checks
  and tests for every project.
- **`npm run dev`:** a development server for the frontend at `localhost:5173`. It reloads when you
  change code, and forwards `/api` requests to the API on port 8000.
