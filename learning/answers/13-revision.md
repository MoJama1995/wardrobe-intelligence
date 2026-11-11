# Lesson 13 answer key: Revision

> **Write your own answer first.** If yours differs, look at the lesson named in brackets, or ask
> `/tutor` to go through it with you.

---

### Question 1: A token in a pushed commit (Lesson 1)

**Answer: c).** Once the token has been pushed, assume it's compromised. Revoke it and create a new
one *first*. Deleting it in a new commit (a) leaves it in the history. Rewriting history (b) doesn't
help with copies that may already exist, and comes second at most, after rotating and agreeing with
your teammate. Closing the PR (d) hides nothing: the commit is still on GitHub.

---

### Question 2: No ML in the API (Lessons 2 and 4)

**A good answer includes:**

- The API and inference **scale and cost differently**. The API is cheap CPU Cloud Run that scales to
  zero. Inference needs a GPU, with its own cold starts, quotas and costs.
- Model libraries are gigabytes. Inside the API, they'd make its image huge and slow to build, deploy
  and cold-start, for every request, including the ones that never touch the model.
- Separate services keep a clear boundary: the API can't depend on model internals, and you can swap
  the model without redeploying the API (ADR 0001, `docs/architecture/overview.md`).

---

### Question 3: 422 `validation_error` (Lesson 3)

**Answer: b).** `validation_error` is the API's answer to a request that doesn't match the contract:
a missing `file` field, or a wrong type. Inference being down is 503 (a). A bug is 500 (c). A
too-large image is 413 `image_too_large` (d). The stable code tells you which one without reading
any logs.

---

### Question 4: Adding `fit` (Lessons 3 and 12)

**A good answer includes:**

1. Add the field to the Pydantic schema, plus the logic, plus tests.
2. Regenerate the contract: `uv run python -m app.contract` in `services/api` (or `make contract`).
3. Regenerate the frontend types: `npm run gen:api` in `apps/web`. Then use the new field.
4. Bump `app.__version__` (minor: it's an additive change). Commit the schema, `openapi.json` and
   `schema.gen.ts` in one pull request.

If you skip step 2, `tests/test_contract.py` fails in `services/api` because `openapi.json` is stale.
If you skip step 3, the frontend's types don't know about `fit`, so TypeScript stops you using it.

---

### Question 5: A Skill compared with the product prompt (Lessons 6 and 8)

**A good answer includes:**

- A **Skill** is instructions for the *coding agent* (Claude Code) about how to do a kind of
  development work. Examples: `pr-review`, `model-packaging`, `tutor`. Claude reads it while helping
  developers. It never runs inside the product.
- The **product prompt** is part of the *product*: the text the inference service sends to the VLM
  with each photo. It's a versioned constant in `services/inference`, released with the model
  (`prompt.version` in the manifest) and evaluated against the baseline like any model change.
- The test: does the user's request depend on it at runtime? Then it belongs in the application code,
  versioned and tested. Is it guidance for people and agents doing the work? Then it's a Skill.

---

### Question 6: Access for a Trello MCP server (Lesson 7)

**A good answer includes:**

- **Start read-only**, on one board, with a token kept outside the repository. Add writing (moving
  cards, commenting) only when there's a clear need, and keep a human confirming each action.
- **Risks of more access:**
  - **Prompt injection:** card text is untrusted input, and could tell the agent to do things nobody
    asked for.
  - **Mistakes at machine speed:** an agent can archive or move many cards before anyone notices.
  - **A leaked or over-scoped token** exposes every board the account can reach.

---

### Question 7: Minimum zero instances in dev (Lesson 9)

**Answer: b).** Cloud Run bills GPUs per instance for as long as the instance is alive. With a
minimum of zero, an idle dev environment costs almost nothing, at the price of cold starts. One
always-on minimum L4 instance is roughly $770 a month (`cost-reference.md`; re-check prices before
deciding). (a) is false. (c) is false: minimum instances exist, but cost money. (d) is the opposite:
scale to zero makes the first request *slower*.

---

### Question 8: Image compared with container, and layer order (Lesson 10)

**A good answer includes:**

- An **image** is the frozen package: our code, Python, dependencies and the start command. A
  **container** is a running instance of an image. One image can run as many containers.
- Docker caches each step (layer). Dependencies change rarely and code changes constantly. Copying
  `pyproject.toml` and `uv.lock` and installing *before* copying `app/` means a code change reuses
  the cached dependency layer, so rebuilds take seconds instead of minutes.

---

### Question 9: Development, deployment or runtime (Lesson 11)

1. Writing a test: **development**.
2. GitHub Actions building the image after a merge: **deployment**.
3. A user uploading a photo: **runtime**.
4. A human running `pulumi up -s dev`: **deployment** (it changes infrastructure).
5. A Cloud Run instance loading the weights: **runtime** (at instance start-up, part of a cold start).
6. Your teammate reviewing your pull request: **development**.

**Why it matters:** problems are found and fixed differently in each phase. Tests and review catch
development mistakes, previews and staged rollouts catch deployment mistakes, and logs, request ids
and alerts catch runtime problems.

---

### Question 10: Reflect

There's no single right answer. A good answer is **specific**. "Docker" is too vague. "I can't yet
explain why the uv layer is cached, so I'll redo Lesson 10's caching exercise and explain it to my
teammate" is the kind of answer that helps.

Bring both items to your next session with your teammate, or start `/tutor` on that lesson.
