# Lesson 5 answer key: Working with Claude Code

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: the agent loop

**A good answer includes:**

- The agent reads (files, search results), plans, acts through a tool (edits a file, runs a
  command), observes the result, and repeats until the task is done or it needs you.
- The **observe** step is what lets it catch mistakes: a failing test, a type error, a traceback.
- That only works if there is something to observe. In our repository that means the checks:
  `uv run pytest`, `uv run ruff`, `uv run mypy`, `npm test`, or `make check` for everything. Code
  without tests gives the agent (and you) nothing to check against.

**Misconception:** *"The agent knows whether its code works."* It knows what the checks told it,
and only if it ran them. That's why you ask it to run them and show you, and then run them
yourself.

---

### Question 2: what Claude can do without asking

**Answer: b).** `uv run pytest` is in the **allow** list of `.claude/settings.json`, because
running checks is safe and useful.

- a) `git commit` is **denied**: you commit, Claude suggests the message.
- c) every `pulumi` command is **denied**, `preview` included: Pulumi talks to real cloud
  resources, so you run it yourself.
- d) `git push` **asks every time**: it publishes your branch to GitHub.

---

### Question 3: "ask" instead of "never" for commits

**For:** it saves a step. Claude could commit right after you've reviewed, with a well-written
message, and you still approve every commit.

**Against (any of these):**

- Approving prompts becomes a reflex. After the twentieth "yes", you stop reading, and a commit is
  exactly the step where you're meant to have read everything.
- Committing yourself forces the review: `git status`, `git diff`, then commit. That habit matters
  most while you're learning.
- A commit is your signature on the change. It should be a deliberate human act.

There's no single right answer; this is a team decision. If you change the rule, change it in
`.claude/settings.json` through a reviewed PR, and update `CLAUDE.md` and
`docs/development/claude-code.md` to match.

---

### Question 4: "Done. All tests pass."

**A good answer includes:**

- Don't take the summary on trust. Check **which** command it ran, **where** (which project
  folder), and look at the actual output it showed you.
- Review the change yourself: `git status` (anything unexpected?), `git diff` (read every line),
  and read the tests (do they test the edge cases, or do they just exist?).
- Run the checks yourself, in the right folder: `uv run pytest`, `uv run ruff check .` and
  `uv run mypy` in that package, or `make check` from the root.
- Only then commit.

**Why:** agents can misread output, run the tests for the wrong project, or summarise
optimistically. Our `CLAUDE.md` tells Claude never to claim checks passed without running them,
but you're the final check.

---

### Question 5: precise compared with vague

**Any three, with a consequence for each:**

| The precise request has... | Without it... |
| --- | --- |
| the **location** (`packages/ai-evaluation`, `reporting.py`) | code ends up in the wrong project, or spread across several |
| the **interface** (function name, argument and return types) | you get something that doesn't fit how you'll call it |
| **edge cases** (`None` shows as "–") | the obvious path works and the edge case crashes later |
| **constraints** (don't change `score_attributes`, no new dependencies) | scope creep, or a new library nobody reviewed |
| **acceptance criteria and how to check** (the three commands) | "done" means "it looks done", and nothing was run |
| a request to **show the commands and output** | you can't tell what was verified |

---

### Question 6: `torch` in `services/api`

**A good answer includes:**

- No. `services/api` has **no ML dependencies**, by design. Image preprocessing for the model
  belongs in `services/inference`, which owns model loading, preprocessing, prompting and output
  parsing.
- Why: the API is meant to be a small, cheap CPU service that starts fast. `torch` adds gigabytes
  to its image and slows every deployment. And if preprocessing lives in two places, the API's
  copy and the model's copy drift apart, which is a classic cause of "worse in production".
- Where it's written: `CLAUDE.md` (the map says "FastAPI public API, no ML dependencies"),
  `services/api/pyproject.toml` (its description), the `architecture-review` skill's boundaries,
  and `docs/architecture/overview.md`.
- The API may still validate the upload (file type, size) without ML libraries. That's a different
  job from model preprocessing.

---

### Question 7: adding a metric, start to finish

**A good answer covers:**

1. **You:** `git switch main`, `git pull`, `git switch -c feat/<metric-name>` (or `learning/...`
   for practice). Start `claude` from the repository root.
2. **You:** write a precise request: where (`packages/ai-evaluation`), the function signature, the
   edge cases (empty input, `None`, abstentions), constraints (pure function, no new dependencies,
   no change to existing metrics), and done-when (tests pass, ruff and mypy clean). Point at files
   with `@`.
3. **Claude, in plan mode:** reads the package and proposes a plan. **You:** check that it matches
   what you meant, correct it, then approve.
4. **Claude:** implements, runs the checks (allowed without asking), shows the output and suggests
   a commit message.
5. **You:** review: `git status`, `git diff`, read the tests, run the checks yourself. Ask "why"
   about anything unclear, and ask for changes.
6. **You:** commit (Claude can't), push (Claude would have to ask), open a PR. Your teammate
   reviews.

The ML judgement stays yours: is the metric right for the decision it supports, and are the
denominators honest (see the `model-evaluation` skill)?
