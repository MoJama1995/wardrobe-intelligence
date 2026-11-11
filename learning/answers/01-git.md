# Lesson 1 answer key: Git

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask the tutor why
> (`/tutor` or `$tutor`).

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: `git add` compared with `git commit`

**A good answer includes:**

- `git add` copies the current state of a file into the **staging area**, the next snapshot being
  put together. Nothing is saved in the history yet.
- `git commit` takes everything in the staging area and saves it in the history as one commit,
  permanently, with a message.
- Two steps let you **choose what goes into each commit**, so each commit is one logical change.
  For example, a bug fix and an unrelated tidy-up become two commits that can be reviewed and undone
  separately.

**Misconceptions:**

- *"`git add` saves the file."* It doesn't. If you never commit, the staged change isn't in the
  history.
- *"`git commit` uploads to GitHub."* It doesn't; `git push` does. A commit is local.

---

### Question 2: weights and a `.env` file in the repository

**A good answer includes:**

- Neither file shows up in `git status`, because our `.gitignore` matches `*.safetensors` and `.env`.
  Git doesn't report ignored files, so it can't accidentally commit them with `git add .`.
- The weights belong in Google Cloud Storage (our model registry) or the Hugging Face Hub, referred
  to by an **exact, unchangeable version** (a Hub commit SHA, or a registry version such as
  `v1.0.0`), never by a moving name such as `main` or `latest`.
- The token stays in `.env` on your laptop (never committed), in Colab's **Secrets** panel, or in
  Secret Manager in the cloud.

**Worth noticing:** the `checkpoints/` folder at the repository root isn't ignored as a folder (our
`.gitignore` ignores `experiments/checkpoints/`). The `.safetensors` file is still caught by the
`*.safetensors` pattern, though. A checkpoint saved as `.npz` or `.h5` would not be. That's why you
still read `git status` before every commit instead of trusting `.gitignore` blindly.

**Misconception:** *"`.gitignore` hides files that are already committed."* It doesn't. It only
affects files Git isn't tracking yet.

---

### Question 3: the change "disappeared" after switching to `main`

**A good answer includes:**

- `git switch` changes the files in your working directory to match the latest commit of the branch
  you switch to. Your commit is on `ml/attribute-prompt`, not on `main`, so `main`'s version of the
  file doesn't contain it.
- Nothing is lost. `git switch ml/attribute-prompt` brings it back.

**Worth knowing:** if you have *uncommitted* changes when you switch, Git either carries them along
or refuses to switch if they'd be overwritten. It tells you which. Committing before you switch
avoids the question.

---

### Question 4: who can see an unpushed commit?

**Answer: a) only you.** A commit lives in the repository on your laptop. Nobody else sees it until
you `git push`, which is also why an unpushed commit is lost if your laptop is.

---

### Question 5: why pull requests, with only two people?

**Any two of these:**

- **Review:** a second pair of eyes catches bugs, security and privacy problems, and unclear code.
  In our project the reviewer is always the other developer, so both of you learn the whole system.
- **Automated checks** (CI) run on every PR before it reaches `main`.
- **`main` stays working**, because nothing reaches it unreviewed.
- **A record of why**: the PR's description and discussion explain the change months later.
- **Easy to undo**: one squash-merged PR is one commit on `main`, so it's simple to revert.

---

### Question 6: both of you changed `services/api/app/main.py`

**Answer: b).** Git merges line by line. If your changes and your teammate's touch different parts of
the file, Git combines them automatically. It only stops when you both changed the same lines, or
lines right next to each other.

**The subtle part:** *no conflict doesn't mean correct.* If your teammate renamed a function and you
added a new call to the old name somewhere else in the file, Git merges both without complaint, and
the code is broken. That's a *semantic* conflict, and catching those is what tests and review are
for.

**Misconceptions:** Git doesn't compare timestamps (c), and doesn't favour whichever branch was
merged first (d).

---

### Question 7: keeping only your side of the conflict

**A good answer includes:**

- You may have **silently deleted your teammate's change**. In Exercise E1, keeping only `season`
  loses `fit`. Git doesn't warn you, because once you commit it assumes you meant it.
- How to check:
  - Read **both** sides before deciding, and ask "is either change wrong?" Usually neither is.
  - Look at what each side was for (`git log` and the PR it came from), and ask its author if
    unsure.
  - Run `git diff` before `git add`, search the file for leftover `<<<<<<<`, `=======` or `>>>>>>>`
    markers, and run the tests.

---

### Question 8: a conflict in `uv.lock`

**A good answer includes:**

- `uv.lock` is **generated** by uv from `pyproject.toml`. It records the exact version and checksum
  of every dependency, and it's internally consistent only when uv writes it.
- So: resolve any conflict in `pyproject.toml` by hand (that file is written by humans), then
  regenerate the lockfile with `uv lock` in that project (`services/api`). Then `git add` both files
  and finish the merge. The same idea applies to `package-lock.json` (`npm install`) and to our
  generated API files (`openapi.json`, `schema.gen.ts`: see `make contract`).
- A hand-merged lockfile can end up describing a set of packages that doesn't exist, or doesn't match
  `pyproject.toml`. The breakage then shows up later, somewhere confusing.

---

### Question 9: the journey of one change

**A good answer covers, in order:**

1. `git switch main` and `git pull`: start from the latest shared version.
2. `git switch -c <type>/<topic>`: a branch, so `main` is untouched while you work.
3. Edit; check with `git status` and `git diff`.
4. `git add <files>`: choose what goes into this commit.
5. `git commit -m "type(scope): ..."`: save a snapshot with a message saying what and why.
6. `git push -u origin <branch>`: share the branch; nothing on GitHub until now.
7. Open a pull request: ask for the branch to be merged, with a place for discussion.
8. Review: your teammate comments. You push fixes to the same branch, and the PR updates.
9. Approve, then **squash merge** on GitHub: the change is now on `main`.
10. `git switch main`, `git pull`, delete the branch: your laptop matches GitHub again.

---

### Challenge: travel back in time

One way to do it (there are others):

```bash
git log --oneline                          # the oldest commit is at the bottom; copy its ID
git show <first-id>:prompt.txt             # 1. print the old version; no files change
git restore --source <first-id> prompt.txt # 2. put the old version in your working directory
git status                                 #    prompt.txt shows as modified
git diff                                   #    old version (on disk) compared with the latest commit
git restore prompt.txt                     # 3. back to the latest committed version
```

`git restore --source` changes only your working directory. It doesn't touch the history, so step 3
can always bring you back. To *keep* the old version, you'd commit it as a new change, and the
history would record that you went back and why.
