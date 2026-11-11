"""Model-agnostic evaluation for Wardrobe Intelligence.

Everything here takes plain predictions and references, so the same code scores a
Colab experiment, a CI regression check and a production sample.
"""

from ai_evaluation.attributes import FieldScore, score_attributes

__all__ = ["FieldScore", "score_attributes"]
