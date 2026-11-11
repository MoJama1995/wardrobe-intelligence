# Lesson 8 answer key: Prompt management

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: problems with prompt v1

**Any three, each linked to a number:**

| Problem in v1 | What it hurts |
| --- | --- |
| "Describe" with no output format, so prose answers like `img-006` can't be parsed | **parse failures**, which then lower **coverage** and **accuracy** |
| abstaining with a magic word (`"unknown"`) that the parser has to special-case | **coverage** looks too high if it's counted as an answer; if the label is "not determinable", it's even counted as **unsupported** |
| no instruction against guessing, so materials get invented (`img-003` wool, `img-004` silk) | **unsupported rate** |
| no "single garment" or labelling framing, so the model may describe a whole outfit | **accuracy** (wrong category) |
| no guidance on the form of values ("T-shirt", "sweater") | **accuracy**, unless the normaliser or a taxonomy map absorbs it |

---

### Question 2: context, not instructions

**Answer: b).** The photo changes with every request, so it's context, passed in as a variable.
The other three are fixed rules we wrote and version: instructions.

---

### Exercise B1: one way to write `parse_output`

```python
def parse_output(text: str, fields: list[str]) -> dict[str, str | None]:
    cleaned = text.strip().removeprefix("```json").removesuffix("```").strip()
    data = json.loads(cleaned)  # json.JSONDecodeError is a kind of ValueError
    if not isinstance(data, dict):
        raise ValueError("expected a JSON object")
    result: dict[str, str | None] = {}
    for field in fields:
        value = data.get(field)
        if isinstance(value, str) and value.strip().lower() in {"", "unknown"}:
            value = None
        result[field] = value
    return result
```

Tests that cover the four requirements:

```python
import pytest


def test_code_fence_is_removed() -> None:
    text = '```json\n{"category": "coat", "colour": "camel", "material": null}\n```'
    assert parse_output(text, FIELDS)["category"] == "coat"


def test_missing_keys_become_none_and_extra_keys_are_ignored() -> None:
    assert parse_output('{"category": "coat", "brand": "x"}', FIELDS) == {
        "category": "coat",
        "colour": None,
        "material": None,
    }


def test_unknown_and_empty_strings_count_as_abstaining() -> None:
    parsed = parse_output('{"category": "coat", "colour": "", "material": "Unknown"}', FIELDS)
    assert parsed["colour"] is None
    assert parsed["material"] is None


@pytest.mark.parametrize("text", ["The garment is a white shirt.", "[1, 2]", ""])
def test_anything_but_a_json_object_raises(text: str) -> None:
    with pytest.raises(ValueError):
        parse_output(text, FIELDS)
```

Note that `json.JSONDecodeError` is a subclass of `ValueError`, so invalid JSON already raises
the right type of error. `"[1, 2]"` is valid JSON but not an object, which is why the `isinstance`
check is needed.

---

### Question 3: is v2 better?

**A good answer includes:**

- **Not from this.** Six examples is far too few: one example flips a field by about 17
  percentage points. Our `ml-experimentation` skill says that with fewer than about 200 examples you
  shouldn't claim gains under about 5 points. (And these outputs were hand-written for the
  exercise.)
- Look at *why* the numbers moved. Part of v1's category gap is "sweater" against "jumper", which
  is a taxonomy question (the same garment in different words), not necessarily a worse prompt. And
  v2 abstained on `img-002`'s denim, which it could have answered: lower unsupported claims can
  cost coverage.
- **Before switching:** decide the thresholds first. Run both versions with the same model
  revision, decoding settings and preprocessing on the versioned evaluation set (tune on `dev`,
  touch `test` once). Score per field with confidence intervals (paired bootstrap), and do failure
  analysis. Write the evaluation report, then open a PR that changes the prompt and its version id,
  with your teammate reviewing.

---

### Question 4: if `"unknown"` weren't treated as `None`

**A good answer includes:**

- **Coverage** of `material` in v1 rises from 67% to 100%. `"unknown"` would count as an
  *answer* for `img-005`. Accuracy stays at 67%, because `"unknown"` isn't `"wool"`, so it's
  scored as a wrong answer instead of an abstention.
- It's misleading because it hides the model's honest "I can't tell", and the metric then claims
  the model always answered. Worse, for an example whose label is "not determinable", a literal
  `"unknown"` would count as an **unsupported claim**: the metric would punish exactly the
  behaviour we want.
- The general lesson: the prompt, the parser and the metric form one contract. Change one and you
  must check the others.

---

### Question 5: counting unparseable answers separately and as abstentions

**A good answer includes:**

- **Separately:** a parse failure is a different problem from a wrong attribute, with a different
  fix (format instructions, decoding settings, `max_new_tokens`). Our `model-evaluation` skill says
  invalid output is reported separately. Folded silently into the scores, nobody would know it was
  happening.
- **As abstentions in the scores:** for that photo, the user gets nothing, so it must count against
  accuracy and coverage. Dropping failures from the denominator instead would inflate accuracy,
  which is the first item in `model-evaluation`'s common mistakes.

---

### Question 6: where each one belongs

1. **Skill.** It's a workflow for how we work. We already have one: `ml-experimentation` with its
   experiment-record template.
2. **Application code.** It's product behaviour: versioned, tested and evaluated, in
   `services/inference/app/` once the model exists.
3. **A one-off message.** It's a single task.
4. **`CLAUDE.md`.** It's a rule that applies to every task, and it's already there ("No secrets,
   `.env` files, credentials, datasets or model weights in Git").
5. **Application code.** Users read the result, so it's a product prompt, with the same versioning
   and evaluation as (2).

---

### Challenge: add a field

**Code changes:** add `"pattern"` to `FIELDS` (in `compare.py` and the tests) and update the render
test's expected text.

**Everything else that changes:**

- **The golden set.** Running `compare.py` immediately fails with
  `ValueError: reference 0 has no value for 'pattern'`. Every example needs a `pattern` label (or
  `null` if a reviewer can't tell). That's new annotation, so in the real project it's a **new
  dataset version**.
- **The saved outputs.** They came from prompts that never asked for a pattern. Parsed now, they'd
  all abstain on `pattern`, so they say nothing about it. Every version you want to compare has to
  be re-run with the new field.
- **The prompt version.** `TEMPLATE` didn't change, but the *rendered* prompt did, because
  `{fields}` now includes `pattern`. The version id should follow what the model actually sees:
  `attributes-v3`.
- **The taxonomy.** Which pattern values are allowed ("striped" or "stripes")? Without a decision,
  the normaliser counts synonyms as wrong. You might list the allowed values in the prompt, which is
  itself a prompt change.

---

### Question 7: the life of a prompt change

**A good answer covers:**

1. **Hypothesis and experiment:** in Colab, following `ml-experimentation`. One change (the prompt),
   the same model revision, decoding and evaluation set; tune on `dev`. The config records the
   prompt version.
2. **Evaluation:** score with `ai_evaluation` against the baseline and thresholds set beforehand.
   Write the report (`model-evaluation`).
3. **Packaging:** the prompt goes into `services/inference/app/` as a versioned constant, next to
   its parser, with unit tests (`model-packaging`). A reproducibility check compares the service
   with the notebook on the golden set.
4. **Review:** a PR changes the prompt and its version, and links the evaluation report and the
   release manifest. Your teammate reviews it.
5. **Release:** a new model-registry version records the prompt version. Switching production to it
   is a reviewed config change.
6. **Who decides:** you, as the ML lead, propose based on the evidence. Your teammate reviews. If
   it's a meaningful change, it's recorded in an ADR or the inference changelog.
