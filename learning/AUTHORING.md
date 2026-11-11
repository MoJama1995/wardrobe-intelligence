# Writing and editing course lessons

Conventions for everything in `learning/`. They keep lessons consistent, and the web viewer
(`learning/app`) relies on the formats marked **(parsed)**. [Lesson 1](lessons/01-git.md) and its
[answer key](answers/01-git.md) are the reference examples.

## Audience and voice

- The learner is Developer B, the ML lead: fluent in Python and ML, newer to software engineering,
  systems, APIs, deployment and cloud. Never teach Python basics or ML theory. Use ML analogies when
  they genuinely help.
- Address the learner as "you". Call Developer A "your teammate". Don't use anyone's name.
- Plain English and British spelling (colour, licence, practise as a verb), matching the rest of the
  repository. Define each term the first time it's used, and introduce terms only when needed.
- For each idea: what it is, why it exists (the problem it solves), then where it is in *our*
  repository, with real paths.
- About 60% doing and 40% reading. Each part takes 20–40 minutes. Keep explanations short.
- Be honest about the project's state: say clearly what exists today and what is planned (see
  `docs/architecture/overview.md`).
- **Model choice belongs to the learner.** Explain the project's constraints, but never recommend
  a specific model.

## Files

| File | Contents |
| --- | --- |
| `lessons/NN-slug.md` | the lesson |
| `answers/NN-slug.md` | its answer key (same file name) |
| `PROGRESS.md`, `README.md` | course-wide; changed only by the course maintainer |

Lesson file names: `01-git`, `02-project-structure`, `03-how-systems-communicate`, `04-our-stack`,
`05-coding-agents`, `06-skills`, `07-mcp`, `08-prompts`, `09-cloud`, `10-docker`,
`11-how-everything-connects`, `12-final-challenge`, `13-revision`.

## Lesson structure

```
# Lesson N: Title                                   (parsed: lesson title)

**Time:** about X hours, in N parts (A–…). ...

**By the end you can:**
- ...

| You need now | You can learn later |
| --- | --- |
| ... | ... |

---

## Before you start (10 minutes)                    optional
## Part A: Title (20 minutes)                       (parsed: each H2 is one step in the viewer)
### Exercise A1: title (15 minutes)
**Question 1.** ...                                 (parsed)
## Part B: ...
## Challenge: title (15 minutes)                    hints in <details>, answers only in the key
## Wrap-up                                          last question, cheat sheet, "### Done when"
```

- **Questions (parsed):** a paragraph starting `**Question N.**` or `**Question N (label).**`,
  numbered from 1 within each lesson. Put each question at the end of the part it tests.
- **Multiple choice (parsed):** the question paragraph is followed immediately by a list of options,
  each one `- a) text`, `- b) text`, and so on. Exactly one option is correct.
- **Expandable explanations:** use the following form, with a blank line after `</summary>`:

  ```html
  <details>
  <summary><strong>Go deeper:</strong> topic</summary>

  Markdown content…
  </details>
  ```

- **Hints:** `<details><summary>Hint 1</summary>` … in the same form. A hint nudges; it never gives
  the full answer.
- **Done when:** a checklist at the end. Then a `Next:` line naming the next lesson.

## Answer key structure

```
# Lesson N answer key: Title

> **Write your own answer first.** ...

### Question N: short title                         (parsed: section runs to the next ### or EOF)

**Answer: b).** One-line reason.                    (parsed: multiple-choice questions only)

**A good answer includes:**
- ...

**Misconceptions:**
- ...

### Challenge: title
```

Open questions describe what a good answer *includes*, rather than giving one model answer.

## Diagrams

- ASCII or box-drawing diagrams in fenced code blocks with no language, at most 100 characters
  wide. They render the same on GitHub, in VS Code, in a terminal and in the viewer.
- No Mermaid in lessons. The terminal and the viewer can't render it.

## Links

- Use relative links. From `lessons/` or `answers/`, a repository file is `../../path/to/file`.
  Another lesson is `NN-slug.md`, and an answer key is `../answers/NN-slug.md`.

## Exercises: accuracy and safety

- **Run every command you put in a lesson,** or check it line by line against the repository, and
  show realistic output. If something can't be verified (for example Docker isn't installed), say so
  to whoever reviews the lesson. Never hide it.
- Practice that could break things happens in throwaway folders outside the repository
  (`~/git-practice`, `~/api-practice`, `~/docker-practice`, ...). Practice in the real repository
  happens on a branch named `learning/<topic>`. Those branches aren't merged unless your teammate
  agrees.
- **Nothing costs money or touches shared systems** without "do this together with your teammate"
  and a cost note. Optional cloud steps are always marked optional.
- The coding agent's guardrails in this repository (`AGENTS.md`): the agent may **not** run
  `git commit` or any `pulumi` command, and it asks before `git push`, `gcloud run deploy`,
  `gcloud builds submit` and `docker push`. Claude Code enforces them (`.claude/settings.json`);
  Codex follows them as instructions. Lessons say "you run this" for those commands.
- Lessons work with **either Claude Code or Codex**. Say "the agent" or "your coding agent",
  not "Claude", and where commands differ show both (`/tutor` or `$tutor`, Shift+Tab or `/plan`).
- Never ask the learner to paste tokens, keys or `.env` contents anywhere.
