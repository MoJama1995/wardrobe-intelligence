# Lesson 6: Claude Skills

**Time:** about 1 hour, in three parts (A–C), plus a challenge.

**By the end you can:**

- explain what a Skill is and how Claude decides when to use one
- say how a Skill differs from a one-off prompt and from `CLAUDE.md`
- read our skills and recognise the pattern they share
- write, organise and test a small Skill of your own

| You need now | You can learn later |
| --- | --- |
| `SKILL.md` with `name` and `description`, when skills load, invoking one with `/name`, supporting files, writing a good description | scripts bundled inside skills, sharing skills across repositories (plugins), measuring how well a skill works |

---

## Part A: What a Skill is (20 minutes)

### The problem

Say you want every review to check our project's standards: secrets, EXIF stripping, pinned model
revisions, contracts regenerated, and the rest. You could paste that checklist into Claude every
time. Then you'd forget an item, your teammate would use a slightly different list, and in a month
nobody would know which version is current.

### The idea

**A Skill is a set of instructions for a recurring task, saved as a file in the repository, that
Claude loads when the task comes up.** It's a reusable, version-controlled, reviewable workflow.
You write it once, and you and your teammate get the same behaviour every time.

Each skill is a folder in `.claude/skills/` containing a `SKILL.md` file:

```
.claude/skills/
├── pr-review/
│   └── SKILL.md
├── ml-experimentation/
│   ├── SKILL.md
│   └── experiment-record-template.md      ← supporting file, read only when needed
└── tutor/
    └── SKILL.md
```

`SKILL.md` starts with a short header (YAML "frontmatter") followed by Markdown instructions:

  ```markdown
  ---
  name: pr-review
  description: Review a branch, pull request or diff against Wardrobe Intelligence's own
    standards (...). Use for "review my changes", "review this PR", or a self-review before
    opening a pull request.
  ---

  # PR review

  ## Workflow
  1. Collect the change ...
  ```

(Shortened here. In the real file, the description is one long line, and yours should be too.)

### How Claude uses a skill

Claude doesn't read every skill in full all the time. That would fill its context with
instructions it doesn't need. It works in three levels:

```
 always in context        loaded when relevant              read only if the body points to it
 ┌───────────────────┐    ┌───────────────────────────┐    ┌────────────────────────────────┐
 │ name + description│ ─▶ │ the body of SKILL.md      │ ─▶ │ supporting files (templates,   │
 │ of every skill    │    │ (workflow, rules, output) │    │ reference tables)              │
 └───────────────────┘    └───────────────────────────┘    └────────────────────────────────┘
```

A skill's body is loaded when your request matches its **description**, or when you invoke it
directly by typing `/` followed by its name, for example `/pr-review`. So the description does real
work: it's how Claude recognises when the skill applies. Our descriptions say what the skill does
**and when to use it**, often with example phrases (look at the `tutor` description).

### Skills compared with prompts and `CLAUDE.md`

| | One-off prompt | `CLAUDE.md` | Skill |
| --- | --- | --- | --- |
| **Loaded** | only in that message | at the start of every session | when the task matches, or via `/name` |
| **Best for** | this task, today | short rules that always apply ("never commit to `main`") | detailed workflows for recurring tasks |
| **Shared with the team** | no | yes (in Git) | yes (in Git) |
| **Reviewed and versioned** | no | yes | yes |

Keep `CLAUDE.md` short, because everything in it is read every session. Detail belongs in skills,
where it costs nothing until it's needed.

### Exercise A1: read our skills (10 minutes)

In the repository:

```bash
ls .claude/skills
```

Open [`.claude/skills/pr-review/SKILL.md`](../../.claude/skills/pr-review/SKILL.md) and answer for
yourself:

1. What does the description say about *when* to use it?
2. Which sections does the body have? Now skim `ml-experimentation`, `architecture-review` and
   `model-evaluation`. What pattern do they share?
3. Why is it called `pr-review` and not `code-review`? (The first paragraph explains.)

**Question 1.** What job does a skill's `description` do? What would happen if a skill's
description were just "Review"?

**Question 2.** When does Claude load the *body* of the `model-evaluation` skill?

- a) at the start of every session, along with `CLAUDE.md`
- b) when a request matches its description, or when you type `/model-evaluation`
- c) only when you edit a file in `packages/ai-evaluation`
- d) never: you have to paste it into the chat

---

## Part B: Skills as reusable workflows (15 minutes)

### What our skills encode

Our skills aren't generic advice. They write down **our team's standards**, so Claude applies them
consistently:

| Skill | What it makes consistent |
| --- | --- |
| `ml-experimentation` | baseline first, change one thing, pinned revisions, honest statistics, a written record |
| `model-evaluation` | metrics chosen from product needs, abstentions kept in the denominator, failure analysis |
| `architecture-review` | our boundaries (no ML in the API), cost and privacy checks, when an ADR is needed |
| `pr-review` | review in priority order; a fixed output format that lists what *wasn't* checked |
| `tutor` | the teaching style of this course: one question at a time, hints before answers |

Notice the shared shape: **when to use it** (description), **conventions**, a **workflow** of
numbered steps, a **required output** format, and **common mistakes**. The required output matters
most: it makes results comparable across sessions and people, the same way a fixed evaluation
report template does.

### What makes a good skill

- **A specific description** that names the task and the phrases that should trigger it.
- **Steps, not essays.** Numbered and checkable.
- **A required output format**, so you can tell a complete result from an incomplete one.
- **Common mistakes**: the hard-won lessons, which are often the most valuable part.
- **Short.** Long reference material goes in a supporting file, linked from the body.
- **A name that doesn't clash** with a built-in command (that's why we have `pr-review`).

### Exercise B1: use a skill (10 minutes)

Go back to your `learning/claude-code` branch from Lesson 5 and start Claude:

```bash
git switch learning/claude-code
claude
```

Type `/pr-review`. Let it review your `format_scores` change. Then compare its review with the
notes you wrote in Lesson 5, Exercise C2. What did it find that you didn't, and the other way
round? Did its output follow the format in the skill's **Required output** section?

**Question 3.** `pr-review` requires a "Not checked:" line in every review. Why is that worth
having? Give an example from our project of something a review might not check.

---

## Part C: Write your own skill (25 minutes)

### Exercise C1: create, test, improve

Create a new branch from `main`:

```bash
git switch main
git pull
git switch -c learning/skills
```

Pick a small, recurring task that *you* do. Ideas:

- **explain-with-ml-analogies:** explain an unfamiliar part of this repository to an ML person,
  using analogies from training and evaluation
- **experiment-summary:** turn a finished experiment's numbers into a short summary for your
  teammate
- something from your own work that you find yourself explaining or checking repeatedly

1. Check the name isn't already used: `ls .claude/skills`.
2. Create `.claude/skills/<your-skill-name>/SKILL.md` with this skeleton, and fill in every
   `<...>`:

   ```markdown
   ---
   name: <your-skill-name>
   description: <what it does>. Use when <situations and example phrases>.
   ---

   # <Title>

   ## Workflow

   1. <step>
   2. <step>

   ## Required output

   <the exact shape of the result>

   ## Common mistakes

   - <mistake>
   ```

3. **Test it.** Exit Claude (`/exit`, or Ctrl+C twice) and start a new session with `claude`, so
   the new skill is picked up. Then:
   - ask something that **should** trigger it, phrased naturally, without naming the skill
   - type `/<your-skill-name>` to invoke it directly
   - ask something unrelated that should **not** trigger it

4. If it didn't trigger when it should have (or did when it shouldn't), improve the
   **description** and test again. That loop is how skills get good.

5. Commit it yourself on your branch. Whether it becomes part of the project is a conversation with
   your teammate, through a PR.

**Question 4.** Your skill didn't trigger when you asked naturally, but `/your-skill-name` worked.
What's the most likely cause, and what do you change?

---

## Challenge: find the gap (10 minutes)

You're the ML lead, so you know mistakes in ML work that a software engineer wouldn't think of.

Read the **Common mistakes** section of either `ml-experimentation` or `model-evaluation`. Propose
**one** mistake that's missing and that you've seen (or made) in real ML work. Write it in the same
style as the existing items: one line, specific, with the consequence.

If you think it's genuinely useful, it's a great first real PR: a one-line change to a skill,
reviewed by your teammate.

<details>
<summary>Hint 1</summary>

Think about the steps between "the notebook says 87%" and "users see good results": data, splits,
preprocessing, decoding settings, hardware, and what gets compared with what.
</details>

---

## Wrap-up

**Question 5 (explain it back).** Your teammate asks: "Why not put all of this in `CLAUDE.md`
instead of a dozen skill folders?" Explain the difference and when you'd use each one.

### Cheat sheet

| I want to... | Do this |
| --- | --- |
| see our skills | `ls .claude/skills` |
| use a skill directly | `/<skill-name>`, e.g. `/pr-review` |
| create a skill | `.claude/skills/<name>/SKILL.md` with `name` and `description` frontmatter |
| add a template | put it beside `SKILL.md` and link to it from the body |
| make a skill trigger reliably | improve its `description`: what it does, plus when to use it |
| pick up a new skill | start a new Claude session |

### Done when

- [ ] Exercises A1, B1 and C1 are done
- [ ] Your own skill triggers from a natural request and with `/name`, and doesn't trigger on an
      unrelated one
- [ ] You've written answers to Questions 1–5 and compared them with the
      [answer key](../answers/06-skills.md), or talked them through with `/tutor`

Next: **Lesson 7, MCP and external tools.** You'll see how agents reach beyond the repository,
and why that needs careful permissions.
