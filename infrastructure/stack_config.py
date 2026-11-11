"""Typed stack configuration plus the naming and labelling rules every resource follows.

Pure functions live here so they can be unit-tested without the Pulumi engine;
only ``load()`` reads Pulumi configuration.
"""

import re
from dataclasses import dataclass
from typing import Literal

import pulumi

APP = "wardrobe-intelligence"
Environment = Literal["dev", "prod"]
ENVIRONMENTS: tuple[Environment, ...] = ("dev", "prod")

# https://cloud.google.com/resource-manager/docs/labels-overview#requirements
_LABEL_KEY = re.compile(r"^[a-z][a-z0-9_-]{0,62}$")
_LABEL_VALUE = re.compile(r"^[a-z0-9_-]{0,63}$")


def parse_environment(value: str) -> Environment:
    if value not in ENVIRONMENTS:
        raise ValueError(f"environment must be one of {ENVIRONMENTS}, got {value!r}")
    return value


def validate_labels(labels: dict[str, str]) -> dict[str, str]:
    for key, value in labels.items():
        if not _LABEL_KEY.match(key):
            raise ValueError(f"invalid GCP label key {key!r}")
        if not _LABEL_VALUE.match(value):
            raise ValueError(f"invalid GCP label value {value!r} for key {key!r}")
    return labels


@dataclass(frozen=True)
class StackConfig:
    environment: Environment
    project_id: str
    region: str

    def labels(self, component: str, **extra: str) -> dict[str, str]:
        """Labels for every resource, so cost reports group by app, environment and component."""
        return validate_labels(
            {
                "app": APP,
                "environment": self.environment,
                "component": component,
                "managed-by": "pulumi",
                **extra,
            }
        )

    def resource_name(self, component: str) -> str:
        """Predictable names such as ``wardrobe-intelligence-dev-api``."""
        return f"{APP}-{self.environment}-{component}"


def load() -> StackConfig:
    environment = parse_environment(pulumi.Config().require("environment"))
    if pulumi.get_stack() != environment:
        raise ValueError(
            f"stack {pulumi.get_stack()!r} must be named after its environment {environment!r}"
        )
    gcp = pulumi.Config("gcp")
    return StackConfig(
        environment=environment, project_id=gcp.require("project"), region=gcp.require("region")
    )
