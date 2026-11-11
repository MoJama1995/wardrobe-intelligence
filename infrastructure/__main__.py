"""Pulumi entrypoint.

No resources are defined yet. Add them in small, focused modules (``storage.py``,
``services.py``, ...) as each one is needed, label every resource with
``cfg.labels(component)``, and estimate its cost before adding it.
See .claude/skills/gcp-infrastructure/SKILL.md and infrastructure/README.md.
"""

import pulumi

import stack_config

cfg = stack_config.load()

pulumi.export("environment", cfg.environment)
pulumi.export("project", cfg.project_id)
pulumi.export("region", cfg.region)
