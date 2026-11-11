# From ML experiment to software product

A hands-on engineering course built around our own project, Wardrobe Intelligence. It's written
for an ML specialist who knows Python well and wants to contribute confidently across the whole
product: Git, APIs, the frontend, coding agents, Docker and Google Cloud.

It doesn't teach Python or ML theory. It teaches everything *around* the model that turns an
experiment into something people can use.

**Time:** about 25 hours, roughly 60% hands-on. Go at your own pace. Understanding matters more
than finishing quickly.

## Start here: Lesson 1

You don't need the repository on your laptop to begin. Lesson 1 teaches you how to get it.

1. **Check that Git works.** In a terminal, run `git --version`. If macOS offers to install
   developer tools, accept, then run it again.
2. **Open [Lesson 1: Git](lessons/01-git.md)** and read it here on GitHub, or in your editor if
   you already have the repository.
3. **Do "Before you start" and Parts A–C.** They only need Git and a practice folder
   (`~/git-practice`), not our repository.
4. **Before Part D, ask your teammate** for the repository URL and an invitation to it on GitHub.
   In Part D you clone the repository and open your first pull request.
5. **Once you've cloned it**, you can switch to the web viewer or mentor mode (below) for the rest
   of the course:

   ```bash
   # Web viewer: needs Node.js 24 or newer (brew install node)
   cd ~/dev/wardrobe-intelligence/learning/app
   npm install      # first time only
   npm run dev      # then open http://localhost:5174

   # Mentor mode: needs Claude Code
   cd ~/dev/wardrobe-intelligence
   claude           # then type /tutor
   ```

Tick off each part in [PROGRESS.md](PROGRESS.md) as you go. In Part D you'll commit that change
as your first pull request.

## How to use it

There are three ways to work through it, and you can mix them.

| Mode | How | Best for |
| --- | --- | --- |
| **Web viewer** | `cd learning/app`, then `npm install` (the first time only), then `npm run dev`. Open <http://localhost:5174>. See [app/README.md](app/README.md). | one part at a time; answering questions on screen, with instant feedback on multiple-choice questions and the answer key revealed after you've answered |
| **Mentor mode** | In Claude Code, from the repository root, type `/tutor` (or "teach me lesson 1", or "quiz me on Git"). | one question at a time, feedback on your own answers, asking "why?" as often as you like |
| **Read and do** | Open a lesson in [`lessons/`](lessons/) and work through it top to bottom. Write your answers, then compare them with [`answers/`](answers/). | working anywhere, including on GitHub |

Track your progress in [PROGRESS.md](PROGRESS.md). You tick items and commit the change on a
branch, so tracking your progress doubles as Git practice. The web viewer also remembers what you've
done, but only in that browser. PROGRESS.md is the shared record.

Every lesson:

- explains each idea in plain English: what it is, why it exists, and where it shows up in our repo
- has exercises you type yourself (copy-pasting is fine; reading the output is the point)
- has questions after each part. Write your answer **before** you look at the answer key.
- separates what you need **now** from what you can **learn later**

## Curriculum

| # | Lesson | Time |
| --- | --- | ---: |
| | **Part 1: Software engineering foundations** | **10 h** |
| 1 | [Git and collaborative development](lessons/01-git.md) | 3 h |
| 2 | [Project structure and architecture](lessons/02-project-structure.md) | 2 h |
| 3 | [How software systems communicate](lessons/03-how-systems-communicate.md) | 3.5 h |
| 4 | [Our technical stack](lessons/04-our-stack.md) | 1.5 h |
| | **Part 2: Using coding agents professionally** | **4.5 h** |
| 5 | [Working with Claude Code](lessons/05-claude-code.md) | 1.5 h |
| 6 | [Claude Skills](lessons/06-skills.md) | 1 h |
| 7 | [MCP and external tools](lessons/07-mcp.md) | 1 h |
| 8 | [Prompt management](lessons/08-prompts.md) | 1 h |
| | **Part 3: Cloud computing and Docker** | **7 h** |
| 9 | [Understanding cloud computing](lessons/09-cloud.md) | 2 h |
| 10 | [Docker](lessons/10-docker.md) | 2.5 h |
| 11 | [How everything connects](lessons/11-how-everything-connects.md) | 2.5 h |
| | **Part 4: Final challenge and revision** | **4 h** |
| 12 | [Final challenge: build a small, working version of our app](lessons/12-final-challenge.md) | 3.5 h |
| 13 | [Revision](lessons/13-revision.md) | 0.5 h |
| | *Optional extension in Lesson 12: deploy a minimal version to Google Cloud, with your teammate* | *1–2 h* |

Part 1 is the longest because it has the most hands-on practice: your first pull request in
Lesson 1, and your first API endpoint in Lesson 3.

### What each lesson covers

1. **Git:** commits, branches, GitHub, pull requests, code review, merge conflicts, and how two
   people work on one repository without overwriting each other. You finish by opening your first
   real pull request.
2. **Project structure:** what each folder in our repo is for, why the frontend, API, inference,
   evaluation and infrastructure live apart, what a monorepo is, what Turborepo does (and why we use
   a simple Makefile instead), why Python and JavaScript tools are managed separately, and how to
   find your way around an unfamiliar repository.
3. **How systems communicate:** HTTP requests and responses, REST, JSON, endpoints, data
   contracts and authentication. We follow one photo upload from the browser through FastAPI to the
   inference service and back, and you add an endpoint yourself.
4. **Our technical stack:** React and TypeScript, FastAPI, PyTorch and Hugging Face, the
   inference service, uv, Pulumi, Google Cloud, GitHub and Docker. What each one does, why we chose
   it, and how they work together.
5. **Claude Code:** how coding agents work in a repository, our guardrails, giving context,
   planning before building, reviewing what they produce, and their limits.
6. **Skills:** reusable workflows for agents, using the ones in `.agents/skills/`. You write one of
   your own.
7. **MCP:** how agents reach external tools (a Trello board, Google Cloud), and why permissions and
   credentials matter.
8. **Prompt management:** writing, templating, versioning and testing prompts, and when a prompt
   belongs in a Skill or in application code.
9. **Cloud computing:** compute, storage and networking; virtual machines, managed services and
   serverless; Cloud Functions compared with Cloud Run; projects, billing, IAM and regions; Pulumi.
10. **Docker:** images, containers and Dockerfiles, using our own `services/api/Dockerfile`.
11. **How everything connects:** the full architecture of our app, and the difference between
    development, deployment and runtime.
12. **Final challenge:** clone, branch, run the app locally, send an image through the API to a
    model, see the result in the frontend, put a service in a container, and explain how it would be
    deployed. **You choose the model.** It's your field. It only has to fit the project's rules,
    which the lesson lists.
13. **Revision:** mixed questions across the course, a self-check, and a glossary to keep.

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
| Lesson 12 | Free disk space and memory for the model you choose (weights are cached outside the repository) | the model card's size, compared with your laptop |
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

## About this folder

| Path | What |
| --- | --- |
| `lessons/`, `answers/` | the lessons and their answer keys |
| `PROGRESS.md` | your progress, updated through pull requests |
| `app/` | the web viewer (React + TypeScript, separate from the product's `apps/web`) |
| [`AUTHORING.md`](AUTHORING.md) | conventions for writing or changing lessons. The viewer depends on them; check with `cd app && npm run check-content` |
| `.agents/skills/tutor/` (repository root) | the mentor-mode skill |
