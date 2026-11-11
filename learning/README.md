# From ML experiment to software product

A hands-on engineering course built around our own project, Wardrobe Intelligence. It's written
for an ML specialist who knows Python well and wants to contribute confidently across the whole
product: Git, APIs, the frontend, coding agents, Docker and Google Cloud.

It doesn't teach Python or ML theory. It teaches everything *around* the model that turns an
experiment into something people can use.

**Time:** about 24 hours, roughly 60% hands-on. Go at your own pace. Understanding matters more
than finishing quickly.

## How to use it

There are two ways to work through it, and you can mix them.

| Mode | How | Best for |
| --- | --- | --- |
| **Read and do** | Open a lesson in [`lessons/`](lessons/) and work through it top to bottom. Write your answers to the questions, then compare them with [`answers/`](answers/). | working alone, at your own pace |
| **Mentor mode** | In Claude Code, from the repository root, type `/tutor` (or "teach me lesson 1", or "quiz me on Git"). | one question at a time, feedback on your answers, asking "why?" as often as you like |

Track your progress in [PROGRESS.md](PROGRESS.md). You tick items and commit the change on a
branch, so tracking your progress doubles as Git practice.

Every lesson:

- explains each idea in plain English: what it is, why it exists, and where it shows up in our repo
- has exercises you type yourself (copy-pasting is fine; reading the output is the point)
- has questions after each part. Write your answer **before** you look at the answer key.
- separates what you need **now** from what you can **learn later**

## Curriculum

| # | Lesson | Time | Status |
| --- | --- | ---: | --- |
| | **Part 1: Software engineering foundations** | **8 h** | |
| 1 | [Git and collaborative development](lessons/01-git.md) | 2.5 h | ready |
| 2 | Project structure and architecture | 1.5 h | planned |
| 3 | How software systems communicate | 2.5 h | planned |
| 4 | Our technical stack | 1.5 h | planned |
| | **Part 2: Using coding agents professionally** | **4.5 h** | |
| 5 | Working with Claude Code | 1.5 h | planned |
| 6 | Claude Skills | 1 h | planned |
| 7 | MCP and external tools | 1 h | planned |
| 8 | Prompt management | 1 h | planned |
| | **Part 3: Cloud computing and Docker** | **7 h** | |
| 9 | Understanding cloud computing | 2 h | planned |
| 10 | Docker | 2.5 h | planned |
| 11 | How everything connects | 2.5 h | planned |
| | **Part 4: Final challenge and revision** | **4 h** | |
| 12 | Final challenge: build a small, working version of our app | 3.5 h | planned |
| | Revision | 0.5 h | |
| | *Optional extension: deploy a minimal version to Google Cloud* | *1–2 h* | *not required* |

### What each lesson covers

1. **Git:** commits, branches, GitHub, pull requests, code review, merge conflicts, and how two
   people work on one repository without overwriting each other. You finish by opening your first
   real pull request.
2. **Project structure:** what each folder in our repo is for, why the frontend, API, inference,
   evaluation and infrastructure live apart, what a monorepo is, why Python and JavaScript tools are
   managed separately, and how to find your way around an unfamiliar repository.
3. **How systems communicate:** HTTP requests and responses, REST, JSON, endpoints, data
   contracts and authentication. We follow one photo upload from the browser through FastAPI to the
   inference service and back.
4. **Our technical stack:** React and TypeScript, FastAPI, PyTorch and Hugging Face, the
   inference service, uv, Pulumi, Google Cloud, GitHub and Docker. What each one does, why we chose
   it, and how they work together.
5. **Claude Code:** how coding agents work in a repository, giving them context, planning before
   building, reviewing what they produce, and their limits.
6. **Skills:** reusable workflows for agents, using the ones in `.claude/skills/` (including the
   tutor you may be using right now).
7. **MCP:** how agents reach external tools (project boards, Google Cloud), and why permissions and
   credentials matter.
8. **Prompt management:** writing, templating, versioning and testing prompts, and when a prompt
   belongs in a Skill or in application code.
9. **Cloud computing:** compute, storage and networking; virtual machines, managed services and
   serverless; Cloud Functions compared with Cloud Run; projects, billing, IAM and regions.
10. **Docker:** images, containers and Dockerfiles, using our own `services/api/Dockerfile`.
11. **How everything connects:** the full architecture of our app, and the difference between
    development, deployment and runtime.
12. **Final challenge:** clone, branch, run the app locally, send an image through the API to a
    model, see the result in the frontend, put a service in a container, and explain how it would be
    deployed. **You choose the model.** It's your field. It only has to fit the project's rules,
    which the lesson lists.

## What exists in our repository today (10 November 2026)

The project is at the foundation stage, so some lessons describe parts that aren't built yet. Each
lesson says which is which.

| Part | Status |
| --- | --- |
| Git repository | created; first commit and GitHub repository pending |
| `apps/web` (React + TypeScript) | runs; shows the API's health status only |
| `services/api` (FastAPI) | runs; `/health` endpoint, standard error format, OpenAPI contract, Dockerfile |
| `services/inference` | runs; `/health` only. **No model yet**: choosing one is ML-lead work |
| `packages/ai-evaluation` | scores extracted garment attributes (accuracy, coverage, unsupported claims) |
| `infrastructure/` (Pulumi) | skeleton only. No cloud resources are defined and **nothing is deployed** |
| Photo upload → model → result | designed in [`docs/architecture/overview.md`](../docs/architecture/overview.md), not built. You build a small version in the final challenge |
| CI (GitHub Actions) | planned |

## What you need, and when

Install each tool when a lesson needs it, not all at once. On macOS most of these come from
[Homebrew](https://brew.sh).

| When | Set up | Check it works |
| --- | --- | --- |
| Lesson 1 | Git (`xcode-select --install` if `git --version` fails) | `git --version` |
| Lesson 1 | A GitHub account, and access to our repository (your teammate invites you) | you can open the repository page on GitHub |
| Lesson 1 | GitHub CLI: `brew install gh` | `gh auth status` |
| Lesson 1 | A code editor (VS Code or Cursor) with its shell command installed | `code --version` or `cursor --version` |
| Lesson 2 | uv: `brew install uv`, and Node.js 24 or newer: `brew install node` | `make setup && make check` in the repository |
| Part 2 | Claude Code, signed in | `claude --version` |
| Part 3 | Docker Desktop (or OrbStack) | `docker run hello-world` |
| Optional deploy | Google Cloud SDK, Pulumi CLI and access to our Google Cloud project. Do this with your teammate: it costs money | |

Nothing in the course costs money, except the optional deployment, which you do together with your
teammate.

## Ground rules

- **Type the commands yourself.** Claude can explain and check your work, but the habit has to be
  yours.
- **Mistakes in the practice folders are free.** In the real repository everything goes through a
  branch and a pull request, so nothing you do can break `main`.
- **Never paste tokens, keys or `.env` contents** into a chat, a commit or a notebook.
- **Stuck for 15 minutes?** Ask Claude or your teammate, and write the question down in
  PROGRESS.md. Good questions are part of the work.
