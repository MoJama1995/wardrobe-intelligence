# Lesson 13: Revision

**Time:** about 30 minutes, in three parts (A–C), plus a glossary to keep.

You've gone from a Python ML experiment to a working product: version control, an API contract, a
frontend, a model behind an interface, containers and a deployment plan. This lesson pulls it
together, shows you what's solid and what isn't yet, and gives you a glossary to come back to.

**By the end you can:**

- answer mixed questions from across the course without looking things up
- name the two or three topics you want to strengthen next
- explain the core ideas of the course to your teammate in your own words

| You need now | You can learn later |
| --- | --- |
| the self-check in Part C, and the glossary | `git rebase`, Turborepo, authentication, asynchronous processing (Pub/Sub, Cloud Run Jobs), signed URLs, GPU serving runtimes such as vLLM, load testing, observability dashboards |

---

## Part A: Foundations and agents (10 minutes)

Answer each question in writing, without opening the earlier lessons. Then compare with the
[answer key](../answers/13-revision.md).

**Question 1.** You pushed a commit containing your Hugging Face token to your branch. The pull request
isn't merged yet. What should you do first?

- a) delete the token from the file in a new commit
- b) force-push to rewrite the branch's history
- c) revoke the token and create a new one
- d) close the pull request so nobody sees it

**Question 2.** Why does `services/api` have no ML dependencies? What would get worse if the model
code moved into the API?

**Question 3.** A request to `POST /analyses` comes back with 422 and the code `validation_error`. What
is the most likely cause?

- a) the inference service is down
- b) the request didn't match the contract, for example it had no `file` field
- c) a bug in the API's code
- d) the image is larger than 10 MB

**Question 4.** You add a field `fit` to the API's response. List the steps that keep the backend and
the frontend in sync. What fails, and where, if you skip the contract step?

**Question 5.** What's the difference between a **Skill** (in `.agents/skills/`) and the **prompt**
the inference service sends to the model? Give one example of each from our project, and say who or
what reads each one.

---

## Part B: Cloud, containers and the whole system (10 minutes)

**Question 6.** Claude could connect to our Trello board through an MCP server. What access would you
give it to begin with? Name two risks of giving it more.

**Question 7.** Why does our plan run the GPU inference service on Cloud Run with a minimum of zero
instances in dev?

- a) GPUs on Cloud Run aren't billed
- b) with scale to zero there's no GPU cost while idle, and one always-on L4 instance costs roughly
  $770 a month
- c) Cloud Run can't keep instances running
- d) it makes requests faster

**Question 8.** What's the difference between a Docker **image** and a **container**? And why does our
Dockerfile copy `pyproject.toml` and `uv.lock` *before* copying `app/`?

**Question 9.** For each event, say whether it happens at **development**, **deployment** or
**runtime**:

1. you write a test for the output parser
2. GitHub Actions builds the inference image after a merge
3. a user uploads a photo of a jacket
4. a human runs `pulumi up -s dev`
5. a Cloud Run instance loads the model weights
6. your teammate reviews your pull request

---

## Part C: Check yourself (10 minutes)

### Self-check

Tick what you could explain to someone else **right now**, without notes. Anything left unticked is
where to go back next. Each line names its lesson.

- [ ] I can explain commits, branches, pull requests and resolving a conflict (1)
- [ ] I can say what each top-level folder of our repository is for, and which way dependencies
      point (2)
- [ ] I can describe an HTTP request and response: method, path, headers, body, status code, JSON (3)
- [ ] I can explain why the frontend's types are generated from `openapi.json` (3)
- [ ] I can name each technology in our stack and what it does for us (4)
- [ ] I can give Claude Code a well-scoped task, plan it first and review the result (5)
- [ ] I can explain what a Skill is, and when a workflow deserves one (6)
- [ ] I can explain what MCP is, and why agents get the least access that works (7)
- [ ] I can version and test a prompt, and say whether it belongs in a Skill or in the product (8)
- [ ] I can explain projects, IAM, regions, billing, and Cloud Run compared with Cloud Functions (9)
- [ ] I can build and run a container from our Dockerfiles, and explain each line (10)
- [ ] I can draw our architecture from memory and mark development, deployment and runtime (11)
- [ ] I can add an endpoint, call another service with a timeout and show the result in the
      frontend (12)
- [ ] I can plug in a model of my choice, pinned to a revision, without changing the API (12)

### Explain it to your teammate

Pick **two** of these and explain each one out loud in about two minutes, to your teammate or to
`/tutor`. Notice where you hesitate: that's useful information.

1. Why every change goes through a branch and a pull request, even with two people.
2. Everything that happens between pressing **Analyse** and seeing the attributes.
3. Why we reference a model by a revision SHA and never by `main`.
4. Why Claude can't commit or run Pulumi in this repository, and why that's a feature.
5. What Docker gives us that `uv sync` on a laptop doesn't.
6. Why the API and inference are separate services.

**Question 10 (reflect).** Which two topics from the self-check are you least sure about? For each
one, what's one concrete thing you'll do to strengthen it (re-read a part, redo an exercise, pair with
your teammate, or pick up a real task in that area)?

---

## Glossary

| Term | Meaning | Lesson |
| --- | --- | --- |
| ADR | Architecture decision record: a short, permanent note of a decision, its context and alternatives (`docs/decisions/`) | 2 |
| API | A defined way for programs to talk to each other. Ours is HTTP + JSON (`services/api`) | 3 |
| Artifact Registry | Google Cloud's store for container images | 9, 11 |
| Branch | A movable name for a line of commits, so work happens without touching `main` | 1 |
| CI | Continuous integration: automated checks (tests, linting, builds) on every pull request | 11 |
| Cloud Run | Google Cloud service that runs containers, scales with traffic and can scale to zero | 9 |
| Cold start | The delay while a new instance starts (and, for us, loads the model) | 9, 12 |
| Commit | A saved snapshot of the repository, with a message, an author and a parent | 1 |
| Container | A running instance of an image, isolated from the machine around it | 10 |
| Contract | The agreed shape of requests and responses. Ours is the generated `openapi.json` | 3 |
| CORS | The browser rule that controls which origins a page may call | 3 |
| Dockerfile | The recipe for building an image, step by step | 10 |
| Endpoint | One method plus path that an API answers, e.g. `POST /analyses` | 3 |
| Environment variable | Configuration passed to a process from outside, e.g. `API_INFERENCE_URL` | 4, 10 |
| Error envelope | Our single error format: `{"error": {"code", "message", "request_id"}}` | 3 |
| EXIF | Metadata inside photos, which can include GPS location. Stripped before storage | 12 |
| GCS | Google Cloud Storage: buckets of files (uploads, model registry) | 9 |
| HTTP status code | A three-digit result, e.g. 200 OK, 415 wrong type, 503 dependency down | 3 |
| IAM / service account | Who may do what in Google Cloud. A service account is an identity for a program | 9 |
| Image (Docker) | A frozen, shareable package of an app and everything it needs | 10 |
| Inference | Running a trained model on new input. Our `services/inference` | 4 |
| Lockfile | Exact versions of every dependency (`uv.lock`, `package-lock.json`). Generated, never hand-edited | 2 |
| MCP | Model Context Protocol: a standard way for agents to use external tools | 7 |
| Merge conflict | Two branches changed the same lines, and a human decides the result | 1 |
| Monorepo | One repository holding several independently built projects | 2 |
| Multipart form | The HTTP body format browsers use to upload files | 12 |
| Pull request | A request to merge a branch, with review and discussion | 1 |
| Pulumi / IaC | Infrastructure as code: cloud resources defined in Python and applied by a human | 4, 9, 11 |
| Region | The physical location of cloud resources. It affects GPU availability, latency and cost | 9 |
| Remote | A copy of the repository elsewhere, usually GitHub (`origin`) | 1 |
| REST | A style of HTTP API built around resources and standard methods | 3 |
| Revision (immutable) | An exact version (a commit SHA) that can never change, unlike `main` or `latest` | 12 |
| Scale to zero | No instances while idle, so no compute cost, at the price of cold starts | 9 |
| Serverless | You provide code or a container; the platform runs and scales the servers | 9 |
| Skill | Reusable, versioned instructions that Claude loads for a kind of task | 6 |
| Staging area | The next commit being put together (`git add`) | 1 |
| Timeout | The longest a caller waits before giving up. Required on every outbound call | 3, 12 |
| uv | Our Python tool for versions, environments and lockfiles | 2, 4 |
| Vite proxy | Forwards `/api` from the frontend's dev server to the API, locally | 3, 12 |

---

## Wrap-up

### Done when

- [ ] Questions 1–9 answered and checked against the [answer key](../answers/13-revision.md)
- [ ] The self-check is honest, and Question 10 names your next two steps
- [ ] You've explained two of the prompts out loud
- [ ] You've written anything still unclear under "Questions I still have" in `learning/PROGRESS.md`

**That's the course.** From here, the best practice is real work: pick up a ticket on the project
board, review your teammate's next pull request, and lead the decision that's yours, the baseline
model, from Colab results on our evaluation set to an ADR.
