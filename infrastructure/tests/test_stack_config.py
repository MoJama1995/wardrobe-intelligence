import pytest

from stack_config import StackConfig, parse_environment, validate_labels


@pytest.fixture
def cfg() -> StackConfig:
    return StackConfig(environment="dev", project_id="example-project", region="europe-west1")


def test_labels_identify_app_environment_and_component(cfg: StackConfig) -> None:
    assert cfg.labels("api") == {
        "app": "wardrobe-intelligence",
        "environment": "dev",
        "component": "api",
        "managed-by": "pulumi",
    }


def test_labels_reject_values_gcp_would_refuse(cfg: StackConfig) -> None:
    with pytest.raises(ValueError, match="invalid GCP label value"):
        cfg.labels("API Service")


def test_label_keys_must_start_with_a_letter() -> None:
    with pytest.raises(ValueError, match="invalid GCP label key"):
        validate_labels({"1team": "ml"})


def test_resource_names_include_the_environment(cfg: StackConfig) -> None:
    assert cfg.resource_name("uploads") == "wardrobe-intelligence-dev-uploads"


@pytest.mark.parametrize("value", ["staging", "Prod", ""])
def test_unknown_environments_are_rejected(value: str) -> None:
    with pytest.raises(ValueError, match="environment must be one of"):
        parse_environment(value)
