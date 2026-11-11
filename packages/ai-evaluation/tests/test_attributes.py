import pytest

from ai_evaluation import score_attributes

FIELDS = ["category", "colour", "material"]


def test_perfect_predictions_score_full_accuracy_and_coverage() -> None:
    references = [{"category": "t-shirt", "colour": "navy", "material": "cotton"}]

    scores = score_attributes(references, references, FIELDS)

    assert all(score.accuracy == 1.0 for score in scores.values())
    assert all(score.coverage == 1.0 for score in scores.values())


def test_comparison_ignores_case_and_whitespace() -> None:
    scores = score_attributes(
        [{"category": "  T-Shirt ", "colour": "Navy", "material": "cotton"}],
        [{"category": "t-shirt", "colour": "navy", "material": "cotton"}],
        FIELDS,
    )

    assert scores["category"].accuracy == 1.0


def test_abstaining_lowers_accuracy_and_coverage() -> None:
    scores = score_attributes(
        [{"category": "jeans", "colour": None}, {"category": "jeans", "colour": ""}],
        [{"category": "jeans", "colour": "blue"}, {"category": "jeans", "colour": "black"}],
        ["category", "colour"],
    )

    assert scores["colour"].accuracy == 0.0
    assert scores["colour"].coverage == 0.0


def test_asserting_a_non_determinable_attribute_counts_as_unsupported() -> None:
    # The reviewer could not tell the fabric from the photo; the model claimed silk.
    scores = score_attributes(
        [{"material": "silk"}, {"material": None}],
        [{"material": None}, {"material": None}],
        ["material"],
    )

    material = scores["material"]
    assert material.unsupported == 1
    assert material.unsupported_rate == 0.5
    assert material.accuracy is None  # no determinable references: accuracy is undefined


def test_misaligned_predictions_and_references_raise() -> None:
    with pytest.raises(ValueError, match="aligned one-to-one"):
        score_attributes([{}], [], FIELDS)


def test_reference_missing_a_field_is_an_annotation_error() -> None:
    with pytest.raises(ValueError, match="reference 0 has no value for 'material'"):
        score_attributes([{}], [{"category": "coat", "colour": "camel"}], FIELDS)
