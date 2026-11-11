# Lesson 0: Set up your laptop and the project

**Time:** about 1 hour, in three parts (A–C). Much of it is waiting for downloads.

Do this lesson **together with your teammate** if you can, sitting together or sharing a screen.
Setup problems are much quicker to solve with two people, and they're the least interesting part of
the course.

**By the end you can:**

- install the tools our project needs on a Mac
- download our repository from GitHub and install everything it depends on
- check that everything works with one command
- start the API and the frontend, and see them talk to each other
- open the rest of the course in the web viewer or in mentor mode

| You need now | You can learn later |
| --- | --- |
| a terminal, Homebrew, `gh auth login`, `git clone`, `make setup`, `make check`, starting and stopping a server | what each tool really does (Lessons 1–4), Docker (Lesson 10), the Google Cloud tools (only for the optional deployment in Lesson 12) |

---

## Before you start (5 minutes)

1. **A GitHub account.** If you don't have one, create a free account at <https://github.com>.
2. **Access to our repository.** Ask your teammate to invite you, then accept the invitation (it
   arrives by email, and also appears at <https://github.com/notifications>). Ask for the
   **repository URL** too. It looks like `https://github.com/<owner>/wardrobe-intelligence.git`.
3. **A terminal.** Press Cmd+Space, type `Terminal` and press Enter. Six things are all you need for
   now:

| Do this | How |
| --- | --- |
| see which folder you're in | `pwd` |
| list what's in it | `ls` |
| go into a folder | `cd foldername` (`cd ~` goes to your home folder; `cd ..` goes up one level) |
| run a command | type it and press Enter. Lines starting with `#` in this course are comments: don't type those |
| stop a running program (such as a server) | Ctrl+C |
| paste | Cmd+V |

You don't need this repository on your laptop to read this lesson: read it on GitHub. By the end of
the lesson you'll have the repository, and you can read the rest of the course on your laptop.

---

## Part A: Install the tools (25 minutes)

A developer's laptop needs a handful of general tools. Each **project** then installs its own
libraries inside its own folder, so nothing in this lesson clutters your Mac or interferes with any
Python, conda or Jupyter setup you already have.

### Exercise A1: Homebrew (10 minutes)

**Homebrew** is a package manager for macOS: one command installs a tool, and another keeps it up to
date. Check whether you already have it:

```bash
brew --version
```

If you see a version number, skip to Exercise A2. If you see `command not found`, install it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

- It asks for your Mac password. Nothing appears while you type it. That's normal: type it and press
  Enter.
- It also installs Apple's **command-line developer tools**, which include Git and `make`. This can
  take a while.
- When it finishes, it prints **Next steps** with two or three commands to run. Run them: they let
  your terminal find `brew`. Then close the terminal, open a new one, and check `brew --version`
  again.

### Exercise A2: the project's tools (10 minutes)

```bash
brew install gh uv node
```

| Tool | What it's for | Where you'll learn it properly |
| --- | --- | --- |
| `git` | version control: the history of every change (came with Apple's developer tools) | Lesson 1 |
| `gh` | GitHub from the terminal: logging in, pull requests | Lesson 1 |
| `uv` | Python versions, environments and dependencies for each Python project | Lesson 2 |
| `node` (with `npm`) | runs the JavaScript tools that build our frontend | Lessons 2 and 4 |
| `make` | runs our shortcuts, such as `make setup` (came with Apple's developer tools) | Lesson 2 |

Check that each one answers with a version:

```bash
git --version
gh --version
uv --version
node --version     # must be 24 or newer
make --version
```

### Exercise A3: your editor (5 minutes)

Install **VS Code** (`brew install --cask visual-studio-code`, or download it from
<https://code.visualstudio.com>). If you prefer **Cursor**, that works too. Wherever this course says
`code`, use `cursor`.

Then let the terminal open it: in VS Code, press **Cmd+Shift+P**, type `shell command` and choose
**Shell Command: Install 'code' command in PATH**. Check it in a new terminal:

```bash
code --version
```

### Exercise A4 (optional for now): a coding agent

You need a coding agent from Lesson 5 onwards, and for **mentor mode** (the tutor) in any lesson.
The course works with either **Claude Code** (from Anthropic) or **Codex** (from OpenAI); you need
only one. Ask your teammate which one and which account to use, then install it:

- **Claude Code:** follow the instructions in Anthropic's Claude Code documentation.
- **Codex:** `npm install -g @openai/codex` (or `brew install --cask codex`). Then run `codex`
  once and choose **Sign in with ChatGPT**.

Then check:

```bash
claude --version   # or: codex --version
```

**Question 1.** Make a prediction before Part B: our API uses the Python library FastAPI. You haven't
installed FastAPI anywhere yet. Which of the tools above do you think will install it, and where on
your laptop do you think it will end up?

---

## Part B: Get the project and install it (20 minutes)

### Exercise B1: log in to GitHub (3 minutes)

```bash
gh auth login
```

Choose **GitHub.com**, then **HTTPS**, then **Yes** to authenticate Git with your GitHub
credentials, then **Login with a web browser**. Copy the one-time code it shows, and paste it into the
page that opens. From now on, Git can download from and upload to GitHub as you, without passwords.

### Exercise B2: download the repository (2 minutes)

Make a folder for your projects, and **clone** the repository into it. Cloning downloads the project
and its full history. Lesson 1 explains it properly; for now, think of it as "download the project".

```bash
mkdir -p ~/dev
cd ~/dev
git clone <repository-url>
cd wardrobe-intelligence
ls
```

Replace `<repository-url>` with the URL your teammate gave you. `ls` should list twelve entries,
including `README.md`, `Makefile`, `apps`, `services`, `packages`, `infrastructure`, `docs` and
`learning`.

Open it in your editor with `code .` (the `.` means "this folder"). From now on, this folder is
**the repository**.

### Exercise B3: install the project (10 minutes)

```bash
make setup
```

`make setup` goes into each project in the repository and installs exactly the library versions
written in that project's lockfile:

- **Python projects** (`services/api`, `services/inference`, `packages/ai-evaluation`,
  `infrastructure`): `uv sync` creates a `.venv` folder inside each one, with its own Python 3.12
  and its own libraries.
- **The frontend** (`apps/web`): `npm ci` installs its JavaScript libraries into
  `apps/web/node_modules`.

The first run downloads Python and a few hundred megabytes of libraries. Later runs take seconds.
Each line starting with `==>` is a new project:

```
==> uv sync: services/api
Resolved 38 packages in 2ms
...
==> npm ci: apps/web
```

### Exercise B4: check that everything works (5 minutes)

```bash
make check
```

This runs every project's formatting check, linter, type checker and tests. A healthy run ends with
the tests passing (the numbers grow as the project does):

```
==> pytest: services/api
9 passed in 0.03s
...
==> vitest: apps/web
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

If anything fails, don't try to fix it alone. Copy the whole output and send it to your teammate, or
ask your coding agent to explain it. A failing `make check` on a fresh setup is a setup problem, not your fault.

**Question 2.** Where did `make setup` install FastAPI for our API?

- a) globally, for every Python program on your Mac
- b) into `services/api/.venv`, used only by the API project
- c) into `apps/web/node_modules`, next to the frontend's libraries
- d) nowhere: FastAPI is downloaded from the internet each time the API starts

**Question 3.** A week from now, you pull your teammate's latest changes, and the API fails to start
with `ModuleNotFoundError: No module named 'httpx2'`. What has probably happened, and what do you
run?

---

## Part C: Run the app and open the course (15 minutes)

### Exercise C1: start the API and the frontend (10 minutes)

Our app is several programs that run at the same time, so each one needs its own terminal. In VS
Code, open the terminal (**Terminal → New Terminal**), then split it with the split icon so you can
see two side by side.

In the first terminal, start the **API**:

```bash
cd ~/dev/wardrobe-intelligence/services/api
uv run uvicorn app.main:app --reload --port 8000
```

In the second, start the **frontend**:

```bash
cd ~/dev/wardrobe-intelligence/apps/web
npm run dev
```

Now open these in your browser:

- <http://localhost:8000/health>: the API answers with a short JSON message, starting with
  `{"status":"ok"`
- <http://localhost:8000/docs>: the API's automatic documentation
- <http://localhost:5173>: the frontend. It shows **Wardrobe Intelligence** and the line
  **API ok · local · build local**. The frontend asked the API how it's doing, and showed the answer.

Stop the API with Ctrl+C in its terminal, then reload the frontend page. What changes? Start the API
again with the same command (press the Up arrow to get it back). Then stop both with Ctrl+C.

### Exercise C2: open the course (5 minutes)

You now have the course on your laptop, in `learning/`. Pick the way you like best. You can mix
them.

```bash
# The web viewer: lessons one part at a time, answers saved, instant feedback
cd ~/dev/wardrobe-intelligence/learning/app
npm install      # first time only
npm run dev      # then open http://localhost:5174

# Mentor mode: the tutor asks one question at a time (needs Claude Code or Codex)
cd ~/dev/wardrobe-intelligence
claude           # Claude Code: then type /tutor
codex            # Codex: then type $tutor
```

To use mentor mode inside VS Code instead, open the repository folder itself (**File → Open
Folder… → wardrobe-intelligence**) before you start the agent. Otherwise it won't find the course. In either agent you can
also just ask: "teach me lesson 1" or "quiz me on lesson 1".

**Question 4 (explain it back).** In one sentence each, what did these give you: `git clone`,
`make setup`, `make check` and `npm run dev`?

---

## Wrap-up

### If something goes wrong

| Symptom | Fix |
| --- | --- |
| `brew: command not found` right after installing Homebrew | run the **Next steps** commands Homebrew printed, then open a new terminal |
| `xcrun: error: invalid active developer path` | `xcode-select --install`, then try again |
| `git clone` says `Repository not found` | accept the GitHub invitation first, check the URL, and run `gh auth status` |
| `node --version` is older than 24 | `brew upgrade node` |
| `Address already in use` when starting a server | something is already running on that port, probably the same server in another terminal. Stop it with Ctrl+C there |
| the frontend shows **API unavailable** | the API isn't running. Start it in the other terminal |
| anything else | copy the full output to your teammate or your coding agent; [`docs/development/setup.md`](../../docs/development/setup.md) has more fixes |

### Done when

- [ ] `brew`, `git`, `gh`, `uv`, `node`, `make` and `code` all answer with a version
- [ ] the repository is in `~/dev/wardrobe-intelligence` and `make check` passes
- [ ] you've seen **API ok · local · build local** at <http://localhost:5173>
- [ ] the course opens in the web viewer (or the tutor answers in Claude Code or Codex)
- [ ] you've written answers to Questions 1–4 and compared them with the
      [answer key](../answers/00-setup.md)

Next: **Lesson 1, Git.** You'll learn what `git clone` actually did, and how to work with the
repository you've just set up.
