# Lesson 5: Working with Claude Code

**Time:** about 1.5 hours, in four parts (A–D).

**By the end you can:**

- explain what a coding agent is and how it works inside a repository
- say what Claude Code can and can't do in *our* repository, and where those rules are written
- give an agent the context it needs: files, constraints and acceptance criteria
- plan before building, and review what an agent produced before you trust it
- break a feature into tasks an agent (or a person) can finish and check
- ask an agent to solve an engineering problem, not just to type code
- name the main ways agents go wrong, and how to catch them

| You need now | You can learn later |
| --- | --- |
| the agent loop, permissions and our guardrails, `CLAUDE.md`, plan mode, `@`-mentioning files, `Esc`, `/clear`, reviewing a diff | hooks, subagents, running Claude Code in CI, custom commands, MCP servers (Lesson 7) |

---

## Before you start (10 minutes)

You need Claude Code installed and signed in (`claude --version` prints a version), and the
repository set up from Lesson 2 (`make setup` and `make check` pass).

Start every exercise in this lesson from an up-to-date `main`, on a branch of its own:

```bash
cd ~/dev/wardrobe-intelligence
git switch main
git pull
git switch -c learning/claude-code
claude
```

`claude` starts a session in the current folder. That folder is what Claude works in, so always
start it from the repository root.

> `learning/...` branches are for practice. They're only merged if your teammate agrees.

---

## Part A: What a coding agent is (20 minutes)

### From chat to agent

A chat assistant answers from what you paste in. A **coding agent** can also *act*: it reads files,
searches the code, runs commands and edits files, then looks at the result and decides what to do
next. It keeps going around that loop until the task is done, or until it needs you.

```
            ┌──────────────────────────────────────────────┐
            ▼                                              │
   your request ──▶ read & plan ──▶ act with a tool ──▶ observe the result
                    (files, search)  (edit, run a command)   (output, errors, test results)
                                           │
                                           └──▶ asks you first, if the action needs permission
```

Each action goes through a **tool**: "read file", "search", "edit file", "run a shell command".
That's the important difference from a chat window. The agent works on the **real files on your
laptop**, with your tools (uv, npm, git), so its changes are real, and so are its mistakes.

You already know the underlying model is a language model: very capable, and sometimes
confidently wrong. The agent loop doesn't change that. What it adds is the ability to *check*: run
the tests, read the error, try again. Your job is to make sure it checks, and to check the checks.

### What Claude can see, and what it can't

| Claude sees | Claude doesn't see |
| --- | --- |
| files it decides to read (or that you point it at) | your screen, browser or Colab notebooks |
| `CLAUDE.md` (read at the start of every session) | anything outside the folder you started it in, unless you give it a path |
| the names and descriptions of our skills (Lesson 6) | what you and your teammate agreed in conversation |
| command output it runs, and what you type | secrets: `.env` and key files are blocked (Part B) |

Claude starts each session knowing nothing about our project except `CLAUDE.md` and the skill
descriptions. Everything else, it has to read. That's why context matters so much (Part B).

### Exercise A1: watch the loop (15 minutes)

In your Claude Code session, type:

```
How does a request to GET /health travel through services/api? Name each file it passes
through, in order. Don't change anything.
```

While it works, watch which tools it uses: it searches, opens files, maybe runs something. Then
check its answer yourself. Open `services/api/app/main.py`, `services/api/app/core/middleware.py`
and `services/api/app/api/health.py`. Did it get the order right? Did it mention anything that
isn't in the code?

**Question 1.** Describe the agent loop in your own words. Which step lets an agent catch its own
mistakes, and what does that step depend on in our repository?

---

## Part B: Guardrails and context (20 minutes)

### Permissions: what Claude may do here

Every tool call goes through **permissions**. Reading files in the project is allowed. Editing a
file or running a command needs your approval, unless a rule says otherwise. When Claude asks, you
can approve once, approve that kind of action for the rest of the session, or say no.

Our project's rules live in [`.claude/settings.json`](../../.claude/settings.json) and apply to
everyone who opens the repository in Claude Code:

| Rule | Commands | Why |
| --- | --- | --- |
| **No prompt** (allow) | `uv run pytest`, `uv run ruff`, `uv run mypy`, `npm run ...`, `npm test`, `make check`, `make lint`, `make test` | checks are safe and you want Claude to run them often |
| **Ask every time** | `git push`, `gcloud run deploy`, `gcloud builds submit`, `docker push` | these leave your laptop: other people see them, or they change real systems |
| **Never** (deny) | `git commit`; every `pulumi` command, even `preview`; `gcloud projects delete`; reading `.env` files, private keys, service-account keys, gcloud and Pulumi credentials | you own the history and the cloud; secrets never enter a conversation |

Why deny `git commit` rather than ask? A commit is your signature on a change: it says "I've read
this and I stand behind it". So Claude leaves its changes uncommitted and suggests a message, and
you review and commit. Pulumi is denied because it reads and changes real cloud resources that cost
real money. You run it yourself, and paste the output if you want Claude's help reading it.

The rules match the *start* of a command, so they're a safety net, not a sandbox. **Read every
permission prompt before you approve it.** "Yes" to a command you don't understand is the most
common way to get into trouble with an agent.

### Context: what Claude needs from you

Claude reads [`CLAUDE.md`](../../CLAUDE.md) at the start of every session: our map of the
repository, the commands and the rules. Skills (Lesson 6) add detailed workflows when a task
matches. The rest comes from **your request**:

- **Point at the files.** Type `@` followed by a path, for example `@services/api/app/main.py`, to
  attach that file to your message.
- **State constraints.** "No new dependencies." "Don't change the public API." "Only touch
  `packages/ai-evaluation`."
- **Say what done looks like:** acceptance criteria you can check. "A unit test covers the empty
  case, and `uv run pytest` passes in that package."
- **Say how to verify it.** Name the commands it should run and show you.

Two keys worth knowing now: **`Esc`** interrupts Claude mid-task (useful the moment you see it
heading the wrong way), and **`/clear`** starts a fresh conversation in the same session. Use
`/clear` between unrelated tasks, so old context doesn't leak into new work.

### Exercise B1: find the rules (10 minutes)

1. Open `.claude/settings.json` and `CLAUDE.md` in your editor and read them. They're short.
2. Ask Claude: `What are you not allowed to do in this repository, and where is each rule written?`
   Compare its answer with the files. Did it miss or invent anything?

**Question 2.** Which of these can Claude do in our repository without asking you first?

- a) `git commit -m "Add reporting"`
- b) `uv run pytest` in `services/api`
- c) `pulumi preview`
- d) `git push`

**Question 3.** Your teammate suggests changing `git commit` from "never" to "ask every time", to
save time. Give one argument for and one against.

---

## Part C: Plan, build, review (35 minutes)

### Plan before you build

For anything bigger than a one-line fix, ask for a **plan** first. In **plan mode**, Claude reads
and thinks but doesn't change files. It ends with a plan for you to approve, edit or reject. In
the terminal, press **Shift+Tab** until the status line shows plan mode. (Editor extensions have a
mode menu instead.)

Planning is cheap and changing direction later is expensive, exactly like agreeing an experiment
design before spending GPU hours. A plan also shows you what the agent *understood*. If the plan is
wrong, the code would have been wrong too.

### A vague request compared with a precise one

```
Vague:    Improve the evaluation package.

Precise:  In packages/ai-evaluation, add src/ai_evaluation/reporting.py with a function
          format_scores(scores: dict[str, FieldScore]) -> str that returns a Markdown table:
          one row per field, with columns accuracy, coverage and unsupported rate, as
          percentages with one decimal place, and "–" when a value is None.
          Export it from ai_evaluation/__init__.py. Add unit tests, including the None case.
          Don't change score_attributes. No new dependencies.
          Done when: uv run pytest, uv run ruff check . and uv run mypy all pass in that package.
          Show me the commands you ran and their output.
```

The precise request names the place, the interface, the edge cases, what *not* to touch, and how
to know it's finished. The vague one forces Claude to guess every one of those.

### Exercise C1: plan first (15 minutes)

1. Switch to plan mode. Send the **vague** request. Read the plan, but don't approve it: press
   `Esc`. What did Claude have to guess?
2. Send `/clear`, switch to plan mode again, and send the **precise** request. Read the plan. Does
   it match what you asked for? If not, say what to change.
3. Approve the plan and let Claude implement it. Approve the permission prompts only after reading
   them.

### Reviewing what the agent produced

**Never trust a summary, including "all tests pass".** An agent can misread output, run the wrong
command, or (rarely) simply be wrong about what happened. Review it like a pull request from a
fast, keen colleague who doesn't know the project well:

1. `git status`: which files changed? Anything unexpected, such as a lockfile or a file outside
   the package?
2. `git diff`: read every line. Ask Claude "why?" about anything you don't understand.
3. Read the **tests**. Do they check the edge cases you asked for, or do they just exist?
4. **Run the checks yourself**, in the package:

   ```bash
   cd packages/ai-evaluation
   uv run pytest
   uv run ruff check .
   uv run mypy
   cd ../..
   ```

5. Only then commit, yourself, ideally with the message Claude suggested, after editing it if
   needed.

### Exercise C2: review and commit (15 minutes)

Do the five review steps above for Claude's change. Write down at least one thing you'd change, or
a question you'd ask in a real review.

Before you commit, ask Claude: `Commit this with a good commit message.` Watch what happens. Does
Claude try? What does it do instead?

Then commit on your `learning/claude-code` branch yourself:

```bash
git add packages/ai-evaluation
git commit -m "feat(eval): add format_scores for Markdown score tables"
```

**Question 4.** Claude finishes and says: "Done. All tests pass." What do you do next, and why?

**Question 5.** Give three things the precise request in Part C contains that the vague one
doesn't, and say what could go wrong without each one.

---

## Part D: Working like an engineer with an agent (15 minutes)

### Break the work down

Agents do best with tasks that are small, clear and checkable. That's the same advice our
[`project-management`](../../.agents/skills/project-management/SKILL.md) skill gives for people:
slice work **vertically**, a thin end-to-end path first (fake model → real API → UI), then deepen
it. "Build all the endpoints" is a bad task for anyone. "A photo upload returns fixed fake
attributes through the API" is a good one.

### Ask for solutions, not just code

Compare:

- "Write a Dockerfile with a CUDA base image for the inference service."
- "The inference service will need a GPU. What are our options for running it cheaply in dev,
  with trade-offs in cost, cold start and complexity? Check our docs and ADRs first. Don't write
  code yet."

The first gets you code for a decision nobody made. The second gets you the decision first, and an
agent that has read the repository is good at exactly that kind of comparison. You then decide,
record it (an ADR, for meaningful decisions), and ask for the code.

### Where agents go wrong

- **Confidently wrong:** invented functions, wrong flags, outdated library APIs. Run it to know.
- **Missing context:** it doesn't know what isn't written down. If you agreed something with your
  teammate, put it in the request (or in the docs).
- **Drift in long sessions:** after a lot of back and forth, earlier details get lost. One task per
  conversation; `/clear` between tasks.
- **Scope creep:** "while I was there, I also refactored...". Ask for small diffs, and say no.
- **Breaking project rules:** for example, proposing `torch` in `services/api`. Our rules are in
  `CLAUDE.md` and the skills, but you are the last check.
- **It can't judge model quality.** It can run `score_attributes`, but whether a model is good
  enough for users is your call, based on the evaluation.

### Exercise D1: plan a feature, then critique it (10 minutes)

`/clear`, switch to plan mode, and ask:

```
Use the project-management skill to break "a user uploads a photo of a garment and sees its
category and colour" into tickets. Don't create any issues; just show me the plan.
```

Critique the result: are the tickets vertical slices? Does each have acceptance criteria you could
test? Is any ticket too big (L or larger)? Is the model choice treated as a research ticket owned by
the ML lead? Press `Esc` when you're done; nothing needs to be built.

**Question 6.** Claude proposes adding `torch` and `transformers` to `services/api` so the API can
resize images "the same way the model does". What do you reply, and where in the repository is
the rule written?

---

## Wrap-up

**Question 7 (explain it back).** You want Claude to add a new metric to `packages/ai-evaluation`.
Walk through how you'd do it from start to finish: branch, request, planning, building, review,
commit. Say what *you* do and what *Claude* does at each step.

### Cheat sheet

| I want to... | Do this |
| --- | --- |
| start a session | `claude` from the repository root |
| point Claude at a file | `@path/to/file` in your message |
| get a plan before any changes | Shift+Tab until plan mode (or the mode menu in an editor) |
| stop Claude right now | `Esc` |
| start fresh between tasks | `/clear` |
| check what Claude changed | `git status`, then `git diff` |
| commit | you do it: Claude isn't allowed to |
| run Pulumi | you do it, and paste the output if you want help |

### Done when

- [ ] Exercises A1, B1, C1, C2 and D1 are done
- [ ] You've reviewed and committed an agent's change yourself on `learning/claude-code`
- [ ] You've written answers to Questions 1–7 and compared them with the
      [answer key](../answers/05-claude-code.md), or talked them through with `/tutor`
- [ ] You can explain our three permission levels and why each command is where it is

Next: **Lesson 6, Claude Skills.** You'll look inside the skills Claude has been using, and write
one of your own.
