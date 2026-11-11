# Lesson 1: Git and collaborative development

**Time:** about 2.5 hours, in five parts (A–E). Stop between parts whenever you like.

**By the end you can:**

- explain what a commit, a branch, a remote and a pull request are, and why each exists
- save your work in small, well-described commits
- keep secrets, model weights and datasets out of Git
- work on a branch, push it to GitHub and open a pull request
- review a pull request and respond to review comments
- resolve a merge conflict calmly
- explain how two people change one repository without overwriting each other's work

| You need now | You can learn later |
| --- | --- |
| `status`, `add`, `commit`, `log`, `diff`, `switch`, `merge`, `push`, `pull`, `clone`, `restore`; pull requests; resolving conflicts | `rebase`, `cherry-pick`, `stash`, `reflog`, tags and releases, `bisect`, branch protection rules, Git LFS |

---

## Before you start (10 minutes)

Open a terminal and check that Git is installed:

```bash
git --version
```

Then tell Git who you are. Every commit records this name and email, so use the email from your
GitHub account. If you'd rather keep your email private, GitHub offers a `noreply` address in
**Settings → Emails**.

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

Finally, check that your editor can be opened from the terminal (`code .` opens the current folder
in VS Code, `cursor .` in Cursor). The exercises say `code`; use `cursor` if that's your editor.

> **Typing commands:** lines that start with `#` in a code block are comments. You don't need to type them.

---

## Part A: Why Git exists (20 minutes)

### The problem

You've probably seen a folder like this:

```
attribute_extraction.ipynb
attribute_extraction_v2.ipynb
attribute_extraction_v2_fixed.ipynb
attribute_extraction_FINAL.ipynb
attribute_extraction_FINAL_with_review_edits.ipynb
```

It answers none of the questions that matter:

- What exactly changed between two versions, and **why**?
- Which version produced the result in last week's report?
- Two people edited the same file. Whose edits win, and did anything get lost?

### The idea

**Git records snapshots of a folder over time, each one with a note saying what changed and why.**
You can look at any snapshot, compare two of them, or go back to one. Several people can work on
their own copies and combine their work in a controlled way.

A few words you'll use constantly:

- **Repository** (or **repo**): a folder whose history Git tracks. Ours is `wardrobe-intelligence`.
  Git keeps that history in a hidden `.git/` folder inside it. You never edit `.git/` by hand.
- **Commit:** one saved snapshot, plus a message, an author and a timestamp.
- **History:** the chain of commits, each one pointing back to the one before it.

### You already know most of this from ML

| From ML | In Git |
| --- | --- |
| a checkpoint you can roll back to | a **commit** |
| the note in your experiment log: what you changed and why | the **commit message** |
| trying a variant without touching the baseline | a **branch** (Part C) |
| promoting the winning variant to be the new baseline | **merging** (Part C) |

One important difference: Git versions **code and text**. It does not version model weights or
datasets. Those are large and binary, and some are personal data. We keep them in Google Cloud
Storage or on the Hugging Face Hub and refer to them by an exact version (Part B).

<details>
<summary><strong>Go deeper:</strong> what a commit really is</summary>

A commit stores a snapshot of every tracked file (not just the differences), the commit it came
from (its *parent*), the author, the time and the message. Git computes an ID from all of that: a
long hexadecimal hash such as `3f9c2a1e…`, usually shortened to the first 7 characters.

Because the ID depends on the content *and* the parent, you can't change an old commit without
changing its ID and the ID of every commit after it. That's why history you've already shared is
treated as permanent. To undo something, you add a new commit that reverses it.

Git stores this efficiently: files that didn't change are shared between snapshots rather than
copied.
</details>

### Exercise A1: your first repository (15 minutes)

Practise in a throwaway folder outside our project, where mistakes cost nothing.

```bash
mkdir ~/git-practice
cd ~/git-practice
git init
git status
```

`git init` turns the folder into a repository. `git status` is the command you'll run most: it
tells you where you are and what has changed. **Read its output every time.** It often suggests
the next command.

Now create a file called `prompt.txt` (`code prompt.txt`) containing exactly these three lines,
and save it:

```
Describe the garment in the photo.
Return: category, colour, material.
If something isn't visible, answer "unknown".
```

Run `git status` again. You should see `prompt.txt` listed under **Untracked files**: it's in the
folder, but Git isn't tracking it yet. Now save your first snapshot:

```bash
git add prompt.txt
git status
git commit -m "Add garment attribute prompt"
git log
```

`git log` shows your commit: its ID, your name, the date and your message. Press `q` to leave the
log view if it fills the screen.

> We'll always pass the message with `-m "..."`. If you ever run `git commit` without it, Git opens
> an editor. If you land in a strange screen full of `~` characters, that's the Vim editor: type
> `:wq` and press Enter to save and continue.

**Question 1.** Look at the output of `git status` before and after `git add`. In your own words,
what does `git add` do, and what does `git commit` do? Why do you think Git needs two separate
steps?

---

## Part B: The three places your work lives (25 minutes)

At any moment, a change you make is in one of three places:

```
  working directory          staging area              repository
  your files as they         the next snapshot,        every commit,
  are on disk now            being put together        permanently

        you edit  ──── git add ────▶   ──── git commit ────▶   saved in history
```

- **Working directory:** the files you see and edit.
- **Staging area:** the changes you've chosen to go into the *next* commit. `git add` puts them here.
- **Repository:** the history. `git commit` turns everything in the staging area into a new commit.

**Why the middle step?** It lets you choose what goes into each commit. Say you fixed a bug and, in
the same session, tidied up an unrelated file. Those should be two commits with two messages. A
reviewer can then read each one on its own, and if the tidy-up breaks something, it can be undone
without losing the bug fix. **One logical change per commit** is the habit to build.

Two commands show you what has changed:

- `git diff`: changes in your working directory that are **not staged** yet
- `git diff --staged`: changes that **are staged** and will go into the next commit

### Exercise B1: stage on purpose (10 minutes)

1. In `prompt.txt`, change line 1 to `Describe the single garment in the photo.`
2. Create a new file, `notes.txt`, containing `Idea: ask for JSON output instead of plain text.`
3. Run these one at a time, reading the output after each one:

```bash
git status
git diff
git add prompt.txt
git status
git diff
git diff --staged
git commit -m "Ask about a single garment"
git status
```

`notes.txt` wasn't part of that commit. It's a separate idea, so give it its own commit:

```bash
git add notes.txt
git commit -m "Note idea: JSON output"
git log --oneline
```

`--oneline` gives one short line per commit. You should now have three commits.

### What never goes into Git

Some files must never be committed:

| Kind | Examples | Why not |
| --- | --- | --- |
| **Secrets** | `.env` holding a Hugging Face token or API keys | Anyone with access to the history can read them, forever |
| **Large binaries** | `*.safetensors`, `*.pt`, checkpoints | Gigabytes; Git is built for text |
| **Data** | datasets, user photos | Large, often licensed, and wardrobe photos are personal data |
| **Generated or installed files** | `.venv/`, `node_modules/`, `__pycache__/` | Rebuilt from lockfiles in seconds; different on every machine |

A file called **`.gitignore`** lists patterns Git should ignore. Open **our** `.gitignore` in the
repository (once you've cloned it in Part D), or [view it here](../../.gitignore). Look for
`.env`, `*.safetensors`, `experiments/data/` and `.venv/`.

So where *do* weights and datasets go? To Google Cloud Storage or the Hugging Face Hub, referenced
by an exact, unchangeable version, such as a Hub commit SHA rather than `main`. See
[`docs/ml/README.md`](../../docs/ml/README.md). You'll see this again in the final challenge.

<details>
<summary><strong>Go deeper:</strong> if a secret is ever committed</summary>

Deleting the file in a new commit doesn't help: the secret is still in the history, and in every
copy anyone has already pulled. The only safe response is to **rotate** it: revoke the token and
create a new one. Then tell your teammate. It happens to experienced engineers too; what matters is
reacting quickly.

Also: `.gitignore` only affects files Git isn't tracking yet. If a file was committed before the
pattern was added, Git keeps tracking it until you explicitly remove it from tracking.
</details>

### Exercise B2: make Git ignore things (10 minutes)

In `~/git-practice`:

1. Create a file `.env` containing `HF_TOKEN=not-a-real-token`.
2. Create an empty file standing in for model weights: `touch model.safetensors`.
3. Run `git status`. Both files are listed as untracked, one `git add .` away from being committed.
4. Create `.gitignore` containing these two lines:

   ```
   .env
   *.safetensors
   ```

5. Run `git status` again. What's listed now?
6. Commit the `.gitignore` file with a clear message.

**Question 2.** After a Colab run, you copy `checkpoints/model.safetensors` (3 GB) and a `.env` file
holding your Hugging Face token into our repository, then run `git status`. What do you expect to
see, and why? Where should the weights live instead?

---

## Part C: Branches (30 minutes)

### The idea

**A branch is a name that points at a commit.** When you commit on a branch, the name moves forward
to the new commit. `main` is just a branch, but by agreement it's the one everyone trusts: in our
project, `main` should always work.

When you start a task, you create a branch from `main`, and your commits go onto it. `main` doesn't
move, so your teammate is never affected by your half-finished work, and you're never affected by
theirs.

```
                        main
                          │
   A ──── B ──── C  ◀─────┘
                  \
                   D ──── E   ◀── feat/add-pattern   (your work in progress)
```

It's the same instinct as never overwriting your baseline while you try a variant.

### Branch names in our project

[`CONTRIBUTING.md`](../../CONTRIBUTING.md) sets the convention `<type>/<short-topic>`, where the
type is one of `feat`, `fix`, `ml`, `infra`, `docs`, `chore` or `test`. Examples:
`ml/baseline-eval`, `feat/image-upload`, `docs/lesson-1-progress`.

### Exercise C1: a branch of your own (15 minutes)

```bash
cd ~/git-practice
git switch -c feat/add-pattern
```

`git switch -c` **c**reates a new branch and switches to it. (Older tutorials use `git checkout -b`
for the same thing.)

1. Change line 2 of `prompt.txt` to `Return: category, colour, material, pattern.`
2. Stage and commit it with the message `Ask for pattern`.
3. Look at the history as a graph:

   ```bash
   git log --oneline --graph --all
   ```

4. Now switch back to `main` and look at the file:

   ```bash
   git switch main
   cat prompt.txt
   ```

   The word `pattern` has disappeared. Don't worry, and think about why before reading on.

5. Switch back with `git switch feat/add-pattern` and run `cat prompt.txt` again.

Switching branches swaps the files in your working directory to match the latest commit on that
branch. Nothing is lost: each branch keeps its own commits.

### Merging

When the work on a branch is finished, you **merge** it: you bring its commits into another
branch.

```bash
git switch main
git merge feat/add-pattern
```

You'll see `Fast-forward`. Because `main` hadn't moved since you branched off, Git didn't need to
combine anything. It just moved the `main` label forward to your latest commit:

```
Before:  A ─ B ─ C               ← main
                  \
                   D             ← feat/add-pattern

After:   A ─ B ─ C ─ D           ← main, feat/add-pattern
```

The branch has done its job, so delete the name (the commits stay):

```bash
git branch -d feat/add-pattern
git log --oneline --graph --all
```

> In the real project you won't merge into `main` on your laptop like this. On GitHub, merging
> happens through a pull request (Part D). Practising locally is how you learn what a merge is.

**Question 3.** You're on the branch `ml/attribute-prompt`. You commit a change, then run
`git switch main`, and your change is gone from the file. What happened? Is your work lost?

---

## Part D: GitHub, remotes and pull requests (35 minutes)

### Remotes

So far everything has been on your laptop. To collaborate, both of you need a shared copy that
lives somewhere else: on **GitHub**. A copy of the repository somewhere else is called a
**remote**. By convention, the main one is named **`origin`**.

```
     your laptop                   GitHub                 your teammate's laptop
  ┌────────────────┐        ┌──────────────────┐        ┌────────────────┐
  │   local repo   │──push─▶│     "origin"     │◀─push──│   local repo   │
  │                │◀─pull──│   shared copy    │──pull─▶│                │
  └────────────────┘        └──────────────────┘        └────────────────┘
```

| Command | What it does |
| --- | --- |
| `git clone <url>` | copies a repository from GitHub to your laptop (once) |
| `git push` | sends your new commits on the current branch up to GitHub |
| `git pull` | brings new commits from GitHub down into your current branch |
| `git fetch` | downloads new commits without changing your files (`pull` = `fetch` + `merge`) |

**Committing is not sharing.** A commit exists only on your laptop until you push it.

<details>
<summary><strong>Go deeper:</strong> Git compared with GitHub</summary>

Git is the version-control tool. It runs on your laptop and works with no internet at all.
GitHub is a website that hosts Git repositories and adds collaboration features on top:
pull requests, code review, issues, project boards and GitHub Actions, which run automated checks
(more in Lesson 11). GitLab and Bitbucket do the same job; Git is identical across all of them.

You may also see `origin/main` in Git's output. That's your laptop's record of where `main` was on
GitHub the last time you fetched. It updates when you `fetch` or `pull`.
</details>

### Pull requests

A **pull request (PR)** is a request to merge your branch into `main`, with a page on GitHub for
discussing it. It shows every change line by line, and your teammate can comment on any line,
request changes or approve.

Why bother with only two people?

- **A second pair of eyes** catches bugs, security problems and unclear code. In our project, the
  reviewer is always the other developer, so both of you learn the whole system.
- **Automated checks** can run on every PR before it's merged (CI, Lesson 11).
- **A record of why**: months later, the PR explains why a change was made.
- **`main` stays working**, because nothing reaches it without review.

### Our workflow (from CONTRIBUTING.md)

```
main ──●──────────────────────────────────────────●──▶
        \                                        ↗
         ●───●───●  push ─▶ PR ─▶ review ─▶ fixes ─▶ approve ─▶ squash merge
         your branch
```

1. Start from an up-to-date `main`: `git switch main` then `git pull`.
2. Create a branch: `git switch -c <type>/<short-topic>`.
3. Make small commits with clear messages.
4. Push the branch and open a PR.
5. Your teammate reviews. You answer comments and push fixes to the **same branch**. The PR updates
   by itself.
6. Once it's approved, merge on GitHub. We prefer **squash merges** for small PRs: all your
   branch's commits become one tidy commit on `main`.
7. Update your local `main` and delete the branch.

### Commit messages in our project

```
feat(api): validate uploaded image type by magic bytes

Content-Type headers are client-controlled; checking the first bytes
rejects renamed non-images before they reach Pillow.
```

- First line: `type(scope): what the commit does`, written as a command ("add", not "added"), at
  most 72 characters. Scopes include `api`, `web`, `inference`, `eval`, `infra`, `ml` and `claude`.
- Optional body after a blank line: **why**. The diff already shows *what*.

`fix stuff` and `update` tell a reviewer nothing. `fix(eval): count empty strings as abstentions`
tells them exactly what to check.

### Reviewing and being reviewed

When you review, ask yourself:

- Does it do what the PR description says? Is anything missing, such as tests or docs?
- Could it leak something (secrets, personal data, photos in logs) or cost money?
- Would *you* understand this code in three months?

As an ML specialist you'll spot things others miss, such as a preprocessing step that differs from
the notebook or a metric computed on the wrong split. Asking a question ("why is this needed?") is
a perfectly good review comment.

When you're reviewed, comments are about the code, not about you. Reply to each one: fix it, or
explain why you'd keep it as it is.

### Exercise D1: your first real pull request (30 minutes)

> **Needs:** our repository on GitHub, with you invited as a collaborator. Ask your teammate for the
> repository URL. If it isn't ready yet, do Part E first and come back.

1. Log in to GitHub from the terminal (choose GitHub.com, then HTTPS, then sign in with the browser):

   ```bash
   gh auth login
   ```

2. Clone the repository. Choose a folder for your projects first, for example `~/dev`:

   ```bash
   mkdir -p ~/dev && cd ~/dev
   git clone <repository-url>
   cd wardrobe-intelligence
   git log --oneline | head -5
   ```

3. Create a branch for your progress tracking:

   ```bash
   git switch -c docs/lesson-1-progress
   ```

4. Open `learning/PROGRESS.md` (`code learning/PROGRESS.md`). Tick Lesson 1 parts A–C by
   changing `- [ ]` to `- [x]`. Add one question you still have under **Questions I still have**.

5. Check your change, then commit it:

   ```bash
   git status
   git diff
   git add learning/PROGRESS.md
   git commit -m "docs(learning): record lesson 1 progress"
   ```

6. Push the branch to GitHub. `-u origin <branch>` links your local branch to a branch of the same
   name on GitHub, so later you can just type `git push` and `git pull`:

   ```bash
   git push -u origin docs/lesson-1-progress
   ```

7. Open a pull request:

   ```bash
   gh pr create --fill
   ```

   (Or open the link that `git push` printed, and click **Create pull request**.)

8. Ask your teammate to review it and leave at least one comment. Address the comment: edit the
   file, commit, and `git push`. Then refresh the PR page and see your new commit appear.

9. Once it's approved, click **Squash and merge** on GitHub. Then bring your laptop up to date:

   ```bash
   git switch main
   git pull
   git branch -d docs/lesson-1-progress
   ```

   Git may refuse with *"not fully merged"*. That's expected after a squash merge, because GitHub
   created a new commit instead of reusing yours. Once you've checked on GitHub that the PR shows
   **Merged**, delete the branch with `git branch -D docs/lesson-1-progress`.

> **About Claude Code in this repository:** Claude isn't allowed to run `git commit` here at all,
> and it asks you before every `git push`. Those rules live in `.claude/settings.json` (Lesson 5).
> In this lesson, you run every command yourself.

**Question 4.** You've committed but not pushed. Who can see your commit?

- a) only you
- b) you and your teammate
- c) everyone with access to the repository
- d) anyone on the internet

**Question 5.** Give two reasons we open pull requests instead of pushing straight to `main`, even
though there are only two of us.

---

## Part E: Merge conflicts, and not overwriting each other (35 minutes)

### Why conflicts happen

Git merges **line by line**. If two branches changed *different* parts of a file, Git combines them
automatically. If both changed **the same lines**, Git can't know which version is right, so it
stops and asks you to decide.

A conflict isn't an error, and nothing is broken. It's Git asking you a question.

```
                ┌── D   "…, pattern, season."   ← feat/add-season
   A ── … ── C ─┤
                └── E   "…, pattern, fit."      ← main

   Same line, changed two different ways  →  you decide.
```

Git marks the disputed lines in the file like this:

```
<<<<<<< HEAD
Return: category, colour, material, pattern, fit.
=======
Return: category, colour, material, pattern, season.
>>>>>>> feat/add-season
```

- Between `<<<<<<< HEAD` and `=======`: the version on the branch you're on.
- Between `=======` and `>>>>>>> feat/add-season`: the version from the branch you're merging in.

**Resolving** means editing the file into what it *should* say, deleting the three marker lines,
then `git add` and `git commit`. Often the right answer keeps both changes, but you have to think
about it. Git can't.

### Exercise E1: cause a conflict and resolve it (20 minutes)

In `~/git-practice`:

1. Create a branch and change line 2 of `prompt.txt` to
   `Return: category, colour, material, pattern, season.` Then commit:

   ```bash
   git switch -c feat/add-season
   # edit line 2 and save, then:
   git add prompt.txt
   git commit -m "Ask for season"
   ```

2. Go back to `main` and make a **different** change to the **same** line,
   `Return: category, colour, material, pattern, fit.`, then commit:

   ```bash
   git switch main
   # edit line 2 and save, then:
   git add prompt.txt
   git commit -m "Ask for fit"
   ```

3. Merge the branch into `main`:

   ```bash
   git merge feat/add-season
   ```

   You'll see `CONFLICT (content): Merge conflict in prompt.txt`.

4. Run `git status` and read what it says.
5. Open `prompt.txt`, find the markers, and **decide what line 2 should say**. Is either change
   wrong? Edit the file to the final version and remove every marker line.
6. Finish the merge:

   ```bash
   git add prompt.txt
   git commit -m "Merge feat/add-season"
   git log --oneline --graph --all
   ```

   The graph now shows two lines of work joining together.

> **Escape hatch:** if a merge gets confusing, `git merge --abort` puts everything back to how it was
> before you ran `git merge`. Then you can start again calmly.

**Question 6.** You and your teammate both changed `services/api/app/main.py` on different branches.
Their PR is merged first. When you bring the new `main` into your branch:

- a) Git always reports a conflict, because it's the same file
- b) Git reports a conflict only if you both changed the same (or neighbouring) lines
- c) Git never reports a conflict; it keeps whichever change is newest
- d) Git keeps your teammate's version, because theirs was merged first

**Question 7.** While resolving a conflict in `prompt.txt`, you delete everything between the markers
except your own version, then commit. What might have gone wrong, and how could you have checked
before committing?

### How we avoid overwriting each other

1. **Never work directly on `main`.** Always use a branch.
2. **Start every task from an up-to-date `main`** (`git switch main`, then `git pull`).
3. **Keep branches short-lived and PRs small.** A two-day branch rarely conflicts; a two-week branch
   always does. If your branch lives longer, bring `main` into it regularly: `git switch main`,
   `git pull`, `git switch <your-branch>`, `git merge main`.
4. **Say what you're working on**, so you don't both edit the same file at once. We'll use a
   project board for this (Lesson 7).
5. **Never force-push** (`git push --force`) to a branch someone else uses, and never to `main`. It
   replaces history on GitHub and can wipe out your teammate's commits.
6. **Never hand-edit generated files** to resolve a conflict. That includes lockfiles (`uv.lock`,
   `package-lock.json`) and generated code (`openapi.json`, `schema.gen.ts`): regenerate them with
   the tool that made them.

**Question 8.** After bringing `main` into your branch, `services/api/uv.lock` has a conflict. What
should you do, and why shouldn't you fix it by hand?

---

## Challenge: travel back in time (15 minutes)

A favourite use of Git: "the prompt worked last week, what did it say then?"

In `~/git-practice`, without editing any file by hand:

1. Show what `prompt.txt` looked like in your **very first** commit, without changing any files.
2. Bring that old version back into your working directory. Run `git status` and `git diff`. What
   do they tell you?
3. Get back to the latest version.

<details>
<summary>Hint 1</summary>

`git log --oneline` lists every commit with its short ID. The oldest one is at the bottom.
</details>

<details>
<summary>Hint 2</summary>

`git show <commit-id>:<file>` prints a file as it was in that commit.
</details>

<details>
<summary>Hint 3</summary>

`git restore` can take a `--source` option. Try `git restore --help`, or ask Claude what it does.
</details>

---

## Wrap-up

**Question 9 (explain it back).** Describe the full journey of one change, from editing a file on
your laptop to that change being on `main` on GitHub. Name each step and command, and say why each
step exists.

### Undo cheat sheet

| I want to... | Command | Careful? |
| --- | --- | --- |
| see what's going on | `git status` | always safe |
| see what changed | `git diff`, `git diff --staged`, `git log -p` | always safe |
| unstage a file (keep my edits) | `git restore --staged <file>` | safe |
| throw away my unstaged edits to a file | `git restore <file>` | **deletes those edits** |
| fix the last commit's message, before pushing | `git commit --amend -m "new message"` | only if **not pushed** yet |
| get out of a confusing merge | `git merge --abort` | safe |
| I committed to `main` by mistake | stop and ask | it's fixable, but the fix depends on whether you pushed |

### Done when

- [ ] Exercises A1, B1, B2, C1 and E1 are done in `~/git-practice`
- [ ] Your first pull request (D1) is merged
- [ ] You've written answers to Questions 1–9 and compared them with the
      [answer key](../answers/01-git.md), or talked them through with `/tutor`
- [ ] You can explain the workflow diagram in Part D without looking

Next: **Lesson 2, Project structure and architecture.** You'll find your way around the repository
you just cloned.
