# Convenience targets for humans. CI runs the same tools with each project's own
# configuration (pyproject.toml / package.json).
PY_PROJECTS := services/api services/inference packages/ai-evaluation infrastructure
WEB := apps/web

.PHONY: setup check lint typecheck test format contract

setup:
	@for p in $(PY_PROJECTS); do echo "==> uv sync: $$p"; (cd $$p && uv sync) || exit 1; done
	@echo "==> npm ci: $(WEB)" && cd $(WEB) && npm ci

check: lint typecheck test

lint:
	@for p in $(PY_PROJECTS); do echo "==> lint: $$p"; (cd $$p && uv run ruff format --check . && uv run ruff check .) || exit 1; done
	@echo "==> lint: $(WEB)" && cd $(WEB) && npm run --silent format:check && npm run --silent lint

typecheck:
	@for p in $(PY_PROJECTS); do echo "==> mypy: $$p"; (cd $$p && uv run mypy) || exit 1; done
	@echo "==> tsc: $(WEB)" && cd $(WEB) && npm run --silent typecheck

test:
	@for p in $(PY_PROJECTS); do echo "==> pytest: $$p"; (cd $$p && uv run pytest -q -m "not slow and not gpu and not model") || exit 1; done
	@echo "==> vitest: $(WEB)" && cd $(WEB) && npm test

format:
	@for p in $(PY_PROJECTS); do (cd $$p && uv run ruff format . && uv run ruff check --fix .); done
	cd $(WEB) && npm run format

# Regenerate the API contract and the frontend types from it.
contract:
	cd services/api && uv run python -m app.contract
	cd $(WEB) && npm run gen:api
