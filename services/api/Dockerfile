# syntax=docker/dockerfile:1
# Build context: services/api   ->   docker build --platform linux/amd64 -t api services/api
# (Cloud Run runs linux/amd64; Apple Silicon machines must pass --platform.)

FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependencies first, so code changes don't invalidate the dependency layer.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev
COPY app ./app

FROM python:3.12-slim AS runtime
ARG BUILD_SHA=unknown
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 API_BUILD_SHA=${BUILD_SHA}
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
USER app
EXPOSE 8080
# Cloud Run injects PORT. Access logs come from the app's own structured middleware.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log --proxy-headers --forwarded-allow-ips='*'"]
