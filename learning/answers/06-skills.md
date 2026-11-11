# Lesson 6 answer key: Claude Skills

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: what the description does

**A good answer includes:**

- Claude always has every skill's name and description in context, but not the bodies. The
  description is how Claude decides that a request matches a skill and loads its body.
- So it has to say **what the skill does and when to use it**, ideally with the phrases people
  actually use ("review my changes", "is model B better than A?").
- With a description of just "Review", Claude couldn't tell whether to use it for a PR, an
  architecture proposal or an evaluation report. It would trigger at the wrong times, or not at all,
  and you'd have to invoke it by name every time.

**Misconception:** *"The description is documentation for humans."* It helps humans too, but its
main job is triggering.

---

### Question 2: when the `model-evaluation` body loads

**Answer: b).** The body loads when a request matches the description, or when you invoke it with
`/model-evaluation`.

- a) Only `CLAUDE.md` (and the skills' names and descriptions) are read at the start of every
  session.
- c) Skills aren't tied to file paths. Editing `packages/ai-evaluation` doesn't load anything by
  itself, though a request about evaluation would match the description.
- d) The point of a skill is that you don't have to paste it.

---

### Question 3: why "Not checked:" matters

**A good answer includes:**

- A review that lists only what it found implies everything else is fine. "Not checked" makes the
  gaps visible, so nobody mistakes a partial review for a full one.
- It's the same honesty as reporting skipped tests, or saying an evaluation ran on a subset.
- Examples from our project: GPU evaluation or real model quality (CI has no GPU); the Docker
  image build; deployed behaviour on Cloud Run; cold-start latency; a `pulumi preview` (Claude
  can't run Pulumi here, so a human has to).

---

### Question 4: triggers by name but not naturally

**A good answer includes:**

- The **description** doesn't match how you actually asked. Invoking it by name skips matching
  altogether, so `/name` working proves the body is fine and the description is the problem.
- Fix: rewrite the description to say what it does **and when to use it**, including the words
  and example phrases you'd naturally use. Start a new session and test again with natural
  phrasings, plus one unrelated request that should *not* trigger it.

**Also check:** the file is at `.claude/skills/<name>/SKILL.md`, the frontmatter is between `---`
lines with `name` and `description`, and you started a new session after creating it.

---

### Question 5: `CLAUDE.md` compared with skills

**A good answer includes:**

- `CLAUDE.md` is read in full at the start of **every** session, so it should hold only short
  rules and facts that always apply: the map, the commands, the rules (never commit, no secrets,
  pin revisions).
- Skills hold **detailed workflows for specific tasks**. Only their names and descriptions are
  always in context. The body loads when needed, and templates only when the body points to them.
- Putting everything in `CLAUDE.md` would fill every session's context with instructions that are
  irrelevant to the task at hand, which makes everything slower and costlier, and gives Claude more
  to get confused by. It would also make the file hard for humans to maintain.
- Rule of thumb: if it applies to *every* task, it goes in `CLAUDE.md`; if it's *how to do a
  particular kind of task*, it's a skill.

---

### Challenge: find the gap

There's no single answer. A good proposal is:

- **specific and from real ML practice**, not generic ("be careful with data")
- **written like the existing items**: one line, the mistake, and its consequence
- **not already covered** by another skill. Search first: for example, near-duplicates across
  splits and class imbalance hidden by aggregate accuracy are already in `dataset-management`.

Examples of the kind of thing that works:

- "Building the prompt by hand in the notebook instead of with the processor's chat template: the
  service applies the template, so production sees a different input than the evaluation did."
  (`model-packaging` or `ml-experimentation`)
- "Changing `max_new_tokens` between runs: long outputs get truncated, so JSON parse failures look
  like a model regression." (`model-evaluation`)
- "Evaluating in batches in the notebook but serving one image at a time without checking that
  padding doesn't change the outputs: greedy decoding is only reproducible if the inputs are
  identical." (`model-packaging`)
