# Lesson 8: Prompt management

**Time:** about 1 hour, in three parts (A–C), plus a challenge.

**By the end you can:**

- say what makes a prompt good for our product, and why
- separate fixed instructions from per-request context
- write a prompt as a template with variables, give it a version, and keep it in Git
- test a prompt in two ways: unit tests for rendering and parsing, and a small golden set scored
  with our evaluation package
- decide whether something belongs in a Skill or in application code

| You need now | You can learn later |
| --- | --- |
| instructions compared with context, templates and variables, prompt versions, unit tests for rendering and parsing, golden-set comparison with `score_attributes` | constrained decoding and structured outputs, few-shot selection, LLM-as-judge (only after calibrating it against human labels), prompt-optimisation tools |

This lesson is deliberately simple. No framework, no model: plain Python, and saved model
outputs you can read.

---

## Part A: What makes a good prompt (15 minutes)

### The prompt is part of the model

For our product, the prompt isn't decoration. The same weights with a different prompt give
different attributes, different abstentions and different hallucinations. A prompt change is a
model change, and it gets the same treatment: a version, a comparison with the baseline, a
decision. That's also why our model release manifest records the prompt version
([`manifest.md`](../../.agents/skills/model-packaging/manifest.md), the `"prompt"` field).

### Two versions of the same prompt

Lesson 1's practice prompt, call it **v1**:

```
Describe the garment in the photo.
Return: category, colour, material.
If something isn't visible, answer "unknown".
```

And **v2**:

```
You are labelling a photo of a single garment for a personal wardrobe app.
Return only a JSON object with exactly these keys: category, colour, material.
Each value is a short, lowercase word or phrase, or null.
Use null when you cannot see the attribute clearly in the photo. Never guess.
```

What v2 does better:

- **States the task and setting:** one garment, labelling, for a wardrobe app.
- **Fixes the output format:** "only a JSON object with exactly these keys". Code has to read the
  answer, and "describe" invites prose that no parser can use.
- **Says how to abstain, in a form the code understands:** `null`, rather than a magic word that
  the parser must special-case.
- **Discourages guessing:** our `ai_evaluation` package tracks exactly this as `unsupported_rate`.

Settings such as temperature 0 and `max_new_tokens` aren't prompt text, but they're versioned with
it (see the `decoding` field in the manifest).

### Instructions compared with context

- **Instructions** are the fixed part we write: the task, the format, the rules. They're the same
  for every request, versioned and tested.
- **Context** is what changes per request: the user's photo, the list of fields to extract, perhaps
  the user's own taxonomy. It's inserted through **variables**.

Keeping them apart means you can test the instructions once and reuse them, and change the
context without touching them. It also means untrusted content (a photo can contain text, such as a
printed T-shirt slogan) stays in its slot, clearly marked as data, not mixed into the rules. That's
the prompt-injection lesson from Lesson 7 again.

The same split makes your requests to Claude Code better: instructions (goal, constraints,
acceptance criteria) plus context (`@` files, error output). See Lesson 5.

**Question 1.** Name three problems with prompt v1 for our product. For each one, say which number
in our evaluation it would hurt (accuracy, coverage, unsupported rate, or parse failures).

**Question 2.** Which of these is **context** rather than instructions?

- a) "Return only a JSON object"
- b) the photo the user just uploaded
- c) "Never guess"
- d) "Each value is a short, lowercase word or phrase"

---

## Part B: Templates, versions and tests (35 minutes)

### Templates and variables

A **template** is the fixed text, with named gaps for the variables. In Python, the simplest
approach is `str.format`:

```python
TEMPLATE = "... Return only a JSON object with exactly these keys: {fields}. ..."
TEMPLATE.format(fields=", ".join(["category", "colour", "material"]))
```

Wrap it in a small function, `render_prompt(fields)`, so the rendering can be tested and every
caller renders it the same way.

<details>
<summary><strong>Go deeper:</strong> braces in templates</summary>

`str.format` treats every `{...}` as a variable. If your template includes a JSON example such as
`{"category": "coat"}`, rendering fails with `KeyError: '"category"'`. Double the literal braces,
`{{"category": "coat"}}`, and they render as single braces. This is the kind of bug a one-line unit
test catches before the model ever sees the prompt.
</details>

### Versions

Give every prompt a **version id** that changes whenever the text changes, for example
`PROMPT_VERSION = "attributes-v2"`. Keep the prompt in Git, **next to the code that parses its
output**: they change together. Then record the version wherever results are recorded: experiment
configs in `experiments/configs/`, evaluation reports, and the model release manifest.

In our repository there's no product prompt yet: it arrives with the model. The
[`model-packaging`](../../.agents/skills/model-packaging/SKILL.md) skill says it will live in
`services/inference/app/` as a versioned constant, alongside preprocessing and output parsing, all
unit-tested.

### Two kinds of test

| Test | What it catches | Needs a model? | Runs |
| --- | --- | --- | --- |
| **Unit tests** for rendering and parsing | broken templates, parsers that crash on code fences or missing keys, abstentions miscounted | no | every change, in CI |
| **Golden-set comparison**: the same fixed examples, each prompt version, scored with `score_attributes` | quality changes: accuracy, coverage, unsupported claims, parse failures | yes, to produce the outputs | every prompt change |

A small golden set (tens of examples) catches regressions quickly. A real decision to change the
product's prompt uses the versioned evaluation set and the `model-evaluation` workflow.

### Exercise B1: render and parse (20 minutes)

Work in a practice folder outside the repository. These commands create a tiny uv project that
uses our evaluation package straight from your clone (change the path if you cloned it somewhere
else):

```bash
mkdir ~/prompt-practice
cd ~/prompt-practice
uv init --bare --python 3.12
uv add --editable ~/dev/wardrobe-intelligence/packages/ai-evaluation
uv add --dev pytest
```

Create `prompts.py`:

```python
"""Garment-attribute prompt: a versioned template, plus code to render it and parse the answer."""

import json

PROMPT_VERSION = "attributes-v2"

TEMPLATE = """\
You are labelling a photo of a single garment for a personal wardrobe app.
Return only a JSON object with exactly these keys: {fields}.
Each value is a short, lowercase word or phrase, or null.
Use null when you cannot see the attribute clearly in the photo. Never guess.
"""


def render_prompt(fields: list[str]) -> str:
    if not fields:
        raise ValueError("at least one field is required")
    return TEMPLATE.format(fields=", ".join(fields))


def parse_output(text: str, fields: list[str]) -> dict[str, str | None]:
    raise NotImplementedError("Exercise B1: write this")
```

Now write `parse_output` yourself. It must:

1. accept a JSON object, including one wrapped in a Markdown code fence (`` ```json `` … `` ``` ``),
   which models often add
2. return exactly the requested fields: a missing key becomes `None`, and extra keys are ignored
3. treat `"unknown"` (in any capitalisation) and empty strings as `None`, meaning the model
   abstained
4. raise `ValueError` for anything that isn't a JSON object

Then create `test_prompts.py`. One test is given. Add at least one test per requirement:

```python
from prompts import parse_output, render_prompt

FIELDS = ["category", "colour", "material"]


def test_rendered_prompt_names_every_field() -> None:
    assert "category, colour, material" in render_prompt(FIELDS)
```

Run the tests until they pass:

```bash
uv run pytest
```

### Exercise B2: compare two prompt versions (15 minutes)

Imagine we ran both prompts on the same six photos and saved the raw answers. Create these three
files. `golden.json` holds the human labels; `null` means a reviewer couldn't tell from the photo:

```json
[
  {"id": "img-001", "category": "t-shirt", "colour": "navy", "material": "cotton"},
  {"id": "img-002", "category": "jeans", "colour": "blue", "material": "denim"},
  {"id": "img-003", "category": "coat", "colour": "camel", "material": null},
  {"id": "img-004", "category": "dress", "colour": "red", "material": null},
  {"id": "img-005", "category": "jumper", "colour": "grey", "material": "wool"},
  {"id": "img-006", "category": "shirt", "colour": "white", "material": null}
]
```

`outputs_v1.json` holds what the model answered with prompt v1:

```json
{
  "img-001": "{\"category\": \"T-shirt\", \"colour\": \"navy\", \"material\": \"cotton\"}",
  "img-002": "{\"category\": \"jeans\", \"colour\": \"blue\", \"material\": \"denim\"}",
  "img-003": "{\"category\": \"coat\", \"colour\": \"beige\", \"material\": \"wool\"}",
  "img-004": "{\"category\": \"dress\", \"colour\": \"red\", \"material\": \"silk\"}",
  "img-005": "```json\n{\"category\": \"sweater\", \"colour\": \"grey\", \"material\": \"unknown\"}\n```",
  "img-006": "The garment is a white shirt."
}
```

`outputs_v2.json` holds the answers with prompt v2:

```json
{
  "img-001": "{\"category\": \"t-shirt\", \"colour\": \"navy\", \"material\": \"cotton\"}",
  "img-002": "{\"category\": \"jeans\", \"colour\": \"blue\", \"material\": null}",
  "img-003": "{\"category\": \"coat\", \"colour\": \"camel\", \"material\": null}",
  "img-004": "{\"category\": \"dress\", \"colour\": \"red\", \"material\": null}",
  "img-005": "{\"category\": \"jumper\", \"colour\": \"grey\", \"material\": \"wool\"}",
  "img-006": "{\"category\": \"shirt\", \"colour\": \"white\", \"material\": \"linen\"}"
}
```

And `compare.py`, which parses each answer with *your* `parse_output` and scores it:

```python
"""Score saved model outputs for one or more prompt versions on the same golden set."""

import json
import sys
from pathlib import Path

from ai_evaluation import score_attributes

from prompts import parse_output

FIELDS = ["category", "colour", "material"]


def percent(value: float | None) -> str:
    return "-" if value is None else f"{value:.0%}"


def evaluate(outputs_file: str) -> None:
    golden = json.loads(Path("golden.json").read_text())
    outputs = json.loads(Path(outputs_file).read_text())

    predictions = []
    unparseable = 0
    for example in golden:
        try:
            predictions.append(parse_output(outputs[example["id"]], FIELDS))
        except ValueError:
            unparseable += 1
            predictions.append({})  # an unreadable answer counts as abstaining on every field
    references = [{field: example[field] for field in FIELDS} for example in golden]

    scores = score_attributes(predictions, references, FIELDS)

    print(f"\n{outputs_file}: {len(golden)} examples, {unparseable} unparseable")
    print(f"{'field':<10}{'accuracy':>10}{'coverage':>10}{'unsupported':>13}")
    for field, score in scores.items():
        print(
            f"{field:<10}{percent(score.accuracy):>10}{percent(score.coverage):>10}"
            f"{percent(score.unsupported_rate):>13}"
        )


for name in sys.argv[1:]:
    evaluate(name)
```

Run it:

```bash
uv run python compare.py outputs_v1.json outputs_v2.json
```

If your `parse_output` meets all four requirements, you'll see:

```
outputs_v1.json: 6 examples, 1 unparseable
field       accuracy  coverage  unsupported
category         67%       83%            -
colour           67%       83%            -
material         67%       67%          67%

outputs_v2.json: 6 examples, 0 unparseable
field       accuracy  coverage  unsupported
category        100%      100%            -
colour          100%      100%            -
material         67%       67%          33%
```

If your numbers differ, your parser handles something differently. Find out which example, and
why. That's exactly what these tests are for.

Then go through `outputs_v1.json` one example at a time and say which number each mistake
affects. (`img-005`'s "sweater" is worth a moment: is that a model error or a taxonomy
question?)

**Question 3.** The numbers favour v2. Can you conclude that v2 is the better prompt? What would you
need before switching the product to it?

**Question 4.** Suppose `parse_output` *didn't* turn `"unknown"` into `None`. Which number in v1's
`material` row would change, and in which direction? Why is that misleading?

**Question 5.** `compare.py` counts unparseable answers separately **and** treats them as
abstentions in the scores. Why do both?

---

## Part C: Skill or application code? (10 minutes)

Both Skills and product prompts are text that tells a model what to do, so it's easy to mix them
up. They have different readers and different stakes:

| | Skill | Product prompt (application code) |
| --- | --- | --- |
| **Read by** | Claude Code, helping you and your teammate build | our product's model, answering users |
| **Lives in** | `.agents/skills/<name>/SKILL.md` | `services/inference/app/` (planned), next to its parser |
| **Versioned by** | Git and PR review | Git, plus a prompt version id recorded in experiments, evaluation reports and the release manifest |
| **Tested by** | trying it and reviewing what it produces | unit tests, a golden set, and an evaluation against the baseline |
| **A change means** | your workflow works differently | users see different results: it's a model change |

And for completeness: a rule that applies to every task belongs in `CLAUDE.md`, and a one-off
instruction is just a message.

**Question 6.** Where does each of these belong: a Skill, application code, `CLAUDE.md`, or a
one-off message?

1. A checklist for turning a finished Colab experiment into a record in `docs/ml/experiments/`
2. The prompt the production model uses to extract garment attributes
3. "Rename `percent` to `format_percent` in `compare.py`"
4. "Never put model weights in Git"
5. The wording the product uses to ask the model to explain a recommendation to a user

---

## Challenge: add a field (10 minutes)

Extend your practice project to extract a fourth attribute, `pattern` (for example "solid",
"striped", "floral"). Make the code changes, and write down everything else that would have to
change before you could compare prompt versions fairly again.

<details>
<summary>Hint 1</summary>

Add `"pattern"` to `FIELDS` in `compare.py` and run it before changing anything else. Read the
error.
</details>

<details>
<summary>Hint 2</summary>

Think about all three inputs to a comparison: the prompt (and its version), the golden labels and
the saved model outputs. Which of them are still valid?
</details>

---

## Wrap-up

**Question 7 (explain it back).** Describe the life of a change to our product's prompt, from idea
to production. Where does the prompt live, how is it versioned, how is it tested, and who decides
that it ships?

### Cheat sheet

| I want to... | Do this |
| --- | --- |
| make a prompt reusable | a template with named variables, rendered by one tested function |
| keep instructions and data apart | fixed instructions in the template; per-request context through variables |
| version a prompt | a version id (`attributes-v2`) changed with every edit; recorded with every result |
| catch broken prompts or parsers | unit tests for `render_prompt` and `parse_output` |
| compare prompt versions | the same golden set, scored with `score_attributes`, parse failures counted separately |
| decide where it lives | product behaviour → application code; how we work → a Skill; always true → `CLAUDE.md` |

### Done when

- [ ] Exercises B1 and B2 are done, and your numbers match the expected output
- [ ] You've written answers to Questions 1–7 and compared them with the
      [answer key](../answers/08-prompts.md), or talked them through with `/tutor`
- [ ] You can explain why a prompt change is a model change

Next: **Lesson 9, Understanding cloud computing.** Part 3 begins: where all of this will run.
