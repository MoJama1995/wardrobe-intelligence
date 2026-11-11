"""Scoring for structured garment-attribute extraction (category, colour, material, ...).

Conventions for evaluation data:

* A reference value of ``None`` means a human reviewer judged the attribute
  *not determinable from the image* (e.g. fabric from a low-resolution photo).
  If the model still asserts a value there, that is counted as ``unsupported``:
  an unsupported claim, which is tracked separately from accuracy.
* A prediction of ``None`` (or a missing key) means the model abstained.
* Every reference must contain every evaluated field. A missing key is an
  annotation bug and raises, rather than silently shrinking the denominator.
"""

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

Attributes = Mapping[str, str | None]
Normaliser = Callable[[str], str]


def default_normalise(value: str) -> str:
    """Case- and whitespace-insensitive comparison. Synonyms belong in a taxonomy map."""
    return " ".join(value.lower().split())


@dataclass(frozen=True)
class FieldScore:
    field: str
    support: int  # references with a determinable value
    correct: int
    answered: int  # predictions with a value, where the reference has one
    not_determinable: int  # references marked None
    unsupported: int  # predictions with a value, where the reference is None

    @property
    def accuracy(self) -> float | None:
        """Correct / support. Abstentions count as wrong. None when there is no support."""
        return self.correct / self.support if self.support else None

    @property
    def coverage(self) -> float | None:
        """How often the model answered when an answer existed."""
        return self.answered / self.support if self.support else None

    @property
    def unsupported_rate(self) -> float | None:
        """How often the model asserted a value that cannot be seen. Lower is better."""
        return self.unsupported / self.not_determinable if self.not_determinable else None


def score_attributes(
    predictions: Sequence[Attributes],
    references: Sequence[Attributes],
    fields: Sequence[str],
    normalise: Normaliser = default_normalise,
) -> dict[str, FieldScore]:
    if len(predictions) != len(references):
        raise ValueError(
            f"{len(predictions)} predictions but {len(references)} references: "
            "results must be aligned one-to-one with the evaluation set"
        )
    if not fields:
        raise ValueError("at least one field must be evaluated")

    scores: dict[str, FieldScore] = {}
    for field in fields:
        support = correct = answered = not_determinable = unsupported = 0
        for index, (prediction, reference) in enumerate(zip(predictions, references, strict=True)):
            if field not in reference:
                raise ValueError(f"reference {index} has no value for {field!r}")
            expected = reference[field]
            predicted = prediction.get(field)
            if predicted is not None and not predicted.strip():
                predicted = None  # an empty string is an abstention, not an answer

            if expected is None:
                not_determinable += 1
                unsupported += predicted is not None
                continue

            support += 1
            if predicted is not None:
                answered += 1
                correct += normalise(predicted) == normalise(expected)

        scores[field] = FieldScore(
            field=field,
            support=support,
            correct=correct,
            answered=answered,
            not_determinable=not_determinable,
            unsupported=unsupported,
        )
    return scores
