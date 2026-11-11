# Lesson 10: Docker

**Time:** about 2.5 hours, in five parts (A–E), plus a challenge.

**By the end you can:**

- explain what a container is, and why Docker exists
- tell an image from a container
- write a Dockerfile for a small FastAPI app, build it and run it
- use layer caching and `.dockerignore` deliberately
- read our real `services/api/Dockerfile` line by line and explain each decision
- pass configuration into a container with environment variables
- explain why we build for `linux/amd64` and how an image reaches Cloud Run

| You need now | You can learn later |
| --- | --- |
| image, container, Dockerfile, `build`, `run`, `-p`, `-e`, `ps`, `logs`, `exec`, `stop`; layers and caching; `.dockerignore`; multi-stage builds; platforms; registries and tags | Docker Compose, networks and volumes in depth, health checks, image scanning, distroless images, BuildKit secrets, CUDA base images and GPU containers, Kubernetes |

---

## Before you start (15 minutes)

Install **Docker Desktop** from <https://www.docker.com/products/docker-desktop/> (or with
`brew install --cask docker`), then open it once so it can finish setting up. Docker Desktop is free
for personal use and small businesses; check its licence terms if that changes for us.
[OrbStack](https://orbstack.dev) is a lighter alternative that works with the same commands.

Check that it works:

```bash
docker --version
docker run hello-world
```

`hello-world` prints a message starting with **Hello from Docker!** and explains the steps Docker just
took. Read them: they're a summary of Part A.

> Docker runs a small Linux virtual machine in the background on your Mac. If commands hang or say
> they can't connect to the Docker daemon, make sure Docker Desktop is running (whale icon in the
> menu bar).

---

## Part A: What a container is, and why Docker exists (20 minutes)

### The problem

You've lived this one: a notebook works on your laptop, then fails on a colleague's machine, in Colab
or on a server. The cause is a different Python version, a missing system library, a newer
`transformers`, or an environment variable that was only set on your machine. "Works on my machine"
is the oldest problem in software deployment.

### The idea

**A container packages your code together with everything it needs to run (Python, libraries, system
files, settings), so it runs the same way everywhere.** Your laptop, your teammate's laptop, CI and
Cloud Run all run the identical package.

Two words you'll use constantly:

- An **image** is the package: a read-only, layered snapshot of a filesystem plus instructions for
  how to start it. You **build** an image once.
- A **container** is a running instance of an image: a process with the image's files and its own
  isolated view of the system. You can **run** many containers from one image, and stop or delete them
  without changing the image.

```
   Dockerfile ──docker build──▶  IMAGE  ──docker run──▶  CONTAINER (running)
   (the recipe)                  (frozen,               ──docker run──▶  CONTAINER
                                  shareable)            ──docker run──▶  CONTAINER
```

| From ML | In Docker |
| --- | --- |
| the training script and its pinned `requirements.txt` | the **Dockerfile** |
| a saved, versioned model artefact you can load anywhere | the **image** |
| a loaded model serving predictions in a process | a **container** |
| the Hugging Face Hub, where artefacts are published | a **registry** (Docker Hub, Google's Artifact Registry) |

### Containers compared with virtual machines

A virtual machine (Lesson 9) simulates a whole computer, including its own operating system. A
container shares the host's Linux kernel and only isolates the process and its files, so it starts
in about a second and is much smaller. (On a Mac, Docker Desktop runs one small Linux VM, and all your
containers share it.)

### Why we care

- **Reproducible:** the image built in CI is exactly the one that runs in production.
- **Portable:** Cloud Run (Lesson 9) runs any container image. That's why both our services have a
  Dockerfile.
- **Isolated:** the API's dependencies and the inference service's (soon several GB of PyTorch) never
  interfere with each other.

### Exercise A1: images and containers (5 minutes)

```bash
docker images
docker ps
docker ps -a
```

- `docker images` lists images on your machine. You should see `hello-world`.
- `docker ps` lists **running** containers. Probably none.
- `docker ps -a` lists **all** containers, including stopped ones. The `hello-world` container ran,
  printed its message and exited, but it still exists.

Run `docker run hello-world` twice more, then `docker ps -a` and `docker images` again.

**Question 1.** After running `docker run hello-world` three times, how many images and how many
containers are there for `hello-world`?

- a) 1 image and 3 containers
- b) 3 images and 3 containers
- c) 1 image and 1 container
- d) 3 images and 1 container

Tidy up with `docker container prune` (it deletes stopped containers; answer `y`).

---

## Part B: Your first Dockerfile (30 minutes)

A **Dockerfile** is the recipe for an image: a list of steps, run top to bottom.

### Exercise B1: a tiny FastAPI app (25 minutes)

Work in a practice folder outside our repository:

```bash
mkdir ~/docker-practice
cd ~/docker-practice
code .
```

Create **`main.py`**:

```python
import os

from fastapi import FastAPI

app = FastAPI()


@app.get("/hello")
def hello() -> dict[str, str]:
    greeting_from = os.environ.get("GREETING_FROM", "a container")
    return {"message": f"Hello from {greeting_from}"}
```

Create **`requirements.txt`**, pinned to the same versions our API uses:

```
fastapi==0.162.4
uvicorn==0.54.0
```

Create **`Dockerfile`** (no file extension):

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Line by line:

| Line | Meaning |
| --- | --- |
| `FROM python:3.12-slim` | start from an official image with Python 3.12 on a minimal Debian Linux |
| `WORKDIR /app` | create `/app` inside the image and make it the current folder |
| `COPY . .` | copy everything from this folder (the **build context**) into `/app` |
| `RUN pip install ...` | run a command **while building**, saving its result into the image |
| `CMD [...]` | the command a container runs **when it starts** |

Build the image and give it a name (a **tag**) with `-t`:

```bash
docker build -t hello .
```

The `.` at the end is the build context: the folder Docker may copy files from. The first build
downloads the Python image and installs FastAPI, so it takes a minute.

Run a container from it:

```bash
docker run --rm -p 8080:8080 hello
```

- `--rm` deletes the container when it stops, so stopped containers don't pile up.
- `-p 8080:8080` **publishes a port**: `-p <port on your Mac>:<port inside the container>`. Without
  it, the app runs but nothing outside the container can reach it.

In a second terminal:

```bash
curl http://localhost:8080/hello
```

You should get `{"message":"Hello from a container"}`. Stop the container with `Ctrl+C` in the first
terminal.

Now pass an **environment variable** with `-e`, the same way Cloud Run passes configuration:

```bash
docker run --rm -p 8080:8080 -e GREETING_FROM=Wardrobe hello
```

`curl` again: `{"message":"Hello from Wardrobe"}`. Same image, different configuration. That's how
one image runs in both `dev` and `prod`.

Finally, try `-p 9000:8080` and work out which URL now reaches the app.

**Question 2.** The `CMD` says `--host 0.0.0.0`. Suppose you leave it out, so uvicorn listens on its
default, `127.0.0.1`. The container starts without errors, and you run it with `-p 8080:8080`, but
`curl http://localhost:8080/hello` fails. Why?

---

## Part C: Layers, caching and `.dockerignore` (25 minutes)

### Layers

Each instruction in a Dockerfile produces a **layer**: the filesystem changes that step made.
An image is a stack of layers. When you rebuild, Docker reuses (**caches**) every layer whose inputs
haven't changed, **until the first one that has**. From that point on, every later step runs again.

```
   FROM python:3.12-slim          ← cached
   WORKDIR /app                   ← cached
   COPY . .                       ← main.py changed → this layer is rebuilt …
   RUN pip install …              ← … so this runs again, even though requirements didn't change
   CMD …
```

### Exercise C1: watch the cache (10 minutes)

1. Rebuild without changing anything: `docker build -t hello .` It finishes almost instantly, and
   the steps are marked `CACHED`.
2. Change the message in `main.py` (say `Hi from`), and rebuild. Watch: `pip install` runs again.
3. Reorder the Dockerfile so dependencies are installed **before** the code is copied:

   ```dockerfile
   FROM python:3.12-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY main.py .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

4. Build once, change `main.py` again, and rebuild. Now `pip install` is `CACHED`, and only
   `COPY main.py` runs.

**Question 3.** In your own words, why does copying `requirements.txt` before `main.py` make most
rebuilds faster? When will `pip install` still run again?

### `.dockerignore`

`COPY . .` copies **everything** in the build context: including things that must never be in an
image.

### Exercise C2: a secret in the image (10 minutes)

Go back to `COPY . .` for a moment (the first Dockerfile). Then:

```bash
echo "HF_TOKEN=not-a-real-token" > .env
docker build -t hello .
docker run --rm hello ls -a
docker run --rm hello cat .env
```

Anything after the image name **replaces the `CMD`**, so these run `ls -a` and `cat .env` inside a
fresh container. The token is in the image. If that image were pushed to a registry, anyone who could
pull it could read the token.

Create **`.dockerignore`**:

```
.env
.env.*
.venv
__pycache__
```

Rebuild and run `ls -a` again: `.env` is gone. Then restore the improved Dockerfile from C1. It copies
only the files it names, which is a second line of defence.

**Question 4.** Our `.gitignore` already lists `.env`. Why isn't that enough to keep `.env` out of a
Docker image, and why does `services/api` have both a `.dockerignore` and explicit `COPY` lines?

---

## Part D: Our real Dockerfile, line by line (35 minutes)

Open [`services/api/Dockerfile`](../../services/api/Dockerfile). It uses everything from Parts B and
C, plus a few production habits.

```dockerfile
# syntax=docker/dockerfile:1
```

Use the current Dockerfile syntax, which enables features such as cache mounts (below).

```dockerfile
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
```

A **multi-stage build**: this first stage, named `build`, prepares the environment. It copies the
`uv` program out of uv's official image at a **pinned version**. The settings make uv precompile
Python files (faster start-up), copy files rather than link them, and use the image's Python instead
of downloading one.

```dockerfile
# Dependencies first, so code changes don't invalidate the dependency layer.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev
COPY app ./app
```

Your Exercise C1, done properly:

- **Dependencies before code**, so editing `app/` doesn't reinstall packages.
- `uv sync --frozen` installs **exactly** what `uv.lock` says, with no re-resolving. That's what makes
  the image reproducible: the same versions as your laptop and CI.
- `--no-dev` leaves out pytest, mypy and ruff. They're for development, not production.
- `--mount=type=cache` keeps uv's download cache **between builds** without putting it in the image,
  so even a dependency change rebuilds quickly.
- Only `app/` is copied, so no tests, no `.venv` from your laptop, no `.env`.

```dockerfile
FROM python:3.12-slim AS runtime
ARG BUILD_SHA=unknown
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 API_BUILD_SHA=${BUILD_SHA}
```

The **second stage** starts again from a clean Python image. Only this stage becomes the final image,
so uv and its cache never reach production.

- `ARG BUILD_SHA` is a value given **at build time** (`--build-arg BUILD_SHA=...`). It becomes the
  `API_BUILD_SHA` environment variable, which `/health` reports. The running service can then say
  exactly which commit it was built from.
- `PATH` puts the virtual environment first, so `uvicorn` means the one from `uv.lock`.
- `PYTHONUNBUFFERED=1` makes Python write logs immediately, so they appear in `docker logs` and Cloud
  Logging straight away.

```dockerfile
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
USER app
```

Create an ordinary user called `app`, copy the prepared environment from the `build` stage, and
**switch to that user**. By default, containers run as `root`. If an attacker ever found a bug in
our API, a non-root process limits what they could do inside the container.

```dockerfile
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log --proxy-headers --forwarded-allow-ips='*'"]
```

- `EXPOSE 8080` is documentation: it tells readers which port the app uses. It doesn't publish
  anything; `-p` does that.
- **Cloud Run tells the container which port to listen on** through the `PORT` environment variable.
  `${PORT:-8080}` means "use `$PORT`, or 8080 if it's not set". That needs a shell to expand it, hence
  `sh -c`.
- `exec` replaces the shell with uvicorn, so uvicorn receives the stop signal directly and shuts down
  cleanly.
- `--no-access-log` turns off uvicorn's plain-text request lines. Our own middleware already writes
  one structured JSON log line per request, with the request ID.
- `--proxy-headers` and `--forwarded-allow-ips` let the app see the original client details when it
  sits behind Cloud Run's front end.

And [`services/api/.dockerignore`](../../services/api/.dockerignore) excludes `.venv`, caches,
`tests`, `.env` files and Markdown, so they never even reach the build.

<details>
<summary><strong>Go deeper:</strong> why "exec" and PID 1 matter</summary>

Inside a container, the first process gets process ID 1. When Docker or Cloud Run stops a container,
it sends that process a termination signal (`SIGTERM`) and waits a short time before killing it.

Without `exec`, PID 1 would be `sh`, which doesn't pass the signal on. uvicorn would never hear it,
couldn't finish in-flight requests, and would be killed abruptly. With `exec`, uvicorn *is* PID 1.
You'll see this in Exercise D1: the log says `Started server process [1]`.
</details>

### Exercise D1: build and run the real API image (25 minutes)

From the **repository root**, on a `learning/docker` branch (so you can safely experiment):

```bash
git switch -c learning/docker
docker build -t api services/api
```

`services/api` is the build context: the Dockerfile only sees files inside it. Then run it:

```bash
docker run --rm -p 8080:8080 api
```

In the log, look for `Started server process [1]` and `Uvicorn running on http://0.0.0.0:8080`. In a
second terminal:

```bash
curl http://localhost:8080/health
```

```
{"status":"ok","service":"api","environment":"local","build":"unknown"}
```

The first terminal shows one JSON log line for your request, with a `request_id`. Stop the container
(`Ctrl+C`), then try each of these. **Predict the result before you run it.**

1. Configuration through the environment (our settings read variables prefixed with `API_`):

   ```bash
   docker run --rm -p 8080:8080 -e API_ENVIRONMENT=dev api
   ```

2. The port Cloud Run would choose:

   ```bash
   docker run --rm -p 9000:9000 -e PORT=9000 api
   curl http://localhost:9000/health
   ```

3. Record the commit the image was built from:

   ```bash
   docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) -t api services/api
   docker run --rm -p 8080:8080 api
   ```

4. Run it in the background, then look inside:

   ```bash
   docker run -d --name api-local -p 8080:8080 api
   docker ps
   docker logs api-local
   docker exec api-local whoami
   docker exec api-local ls -a /app
   docker stop api-local
   docker rm api-local
   ```

   `-d` runs the container **detached** (in the background), and `--name` gives it a name to use
   instead of its ID. `docker exec` runs a command inside a running container. Which user is it, and
   which files made it into `/app`? Where are the tests?

5. See the layers and their sizes: `docker history api` and `docker images`.

**Question 5.** Why does the final stage run as a user called `app` instead of `root`, and why is
the image built in two stages instead of one?

**Question 6.** What do you think happens if you run `docker run --rm -p 8080:8080 -e
API_ENVIRONMENT=staging api`? Try it. Why is this behaviour a good thing?

---

## Part E: Platforms, registries and getting to the cloud (15 minutes)

### Platforms

Images are built for a processor **architecture**. Apple Silicon Macs are `arm64`; Cloud Run runs
`amd64` (Intel/AMD). An `arm64` image deployed to Cloud Run fails to start with **`exec format
error`**. That's why our Dockerfiles say:

```
docker build --platform linux/amd64 -t api services/api
```

On an Apple Silicon Mac, Docker builds an `amd64` image by emulating the other processor. It works,
but it's slower. For running on your own laptop, a native build is fine, which is why Exercise D1
left `--platform` out.

### Exercise E1: check the architecture (5 minutes)

```bash
docker image inspect --format '{{.Architecture}}' api
docker build --platform linux/amd64 -t api:amd64 services/api
docker image inspect --format '{{.Architecture}}' api:amd64
```

On Apple Silicon, the first says `arm64` and the last says `amd64`. If you run `api:amd64`, Docker
warns that the image's platform doesn't match your machine's, and then runs it anyway (slowly). On an
Intel Mac, both say `amd64`.

### Registries and tags

Cloud Run doesn't build images. It **pulls** them from a **registry**. Ours will be Google's
**Artifact Registry**, where an image's full name looks like this:

```
europe-west1-docker.pkg.dev/<project-id>/<repository>/api:3f9c2a1
└─── registry host ────────┘ └──────── path ──────────┘ └ tag ┘
```

The **tag** after the colon labels one version of the image. We'll tag images with the **Git commit
SHA**, never just `latest`. It's the same rule as pinning a model revision instead of `main`: the tag
must always mean the same image, so you know exactly what's running and can roll back to it.

The flow, which Lesson 11 puts together:

```
   git commit ──▶ docker build --platform linux/amd64 ──▶ docker push ──▶ Artifact Registry
                                                                                │
                                                       Cloud Run pulls and runs ▼
```

`docker push` sends an image to a registry. You won't push in this lesson. Pushing to our registry
will be done by CI (Lesson 11) or by you together with your teammate, and Claude Code always asks
before running `docker push` in this repository.

<details>
<summary><strong>Go deeper:</strong> what changes for the GPU inference image</summary>

`services/inference/Dockerfile` is currently a CPU placeholder, nearly identical to the API's. When
the serving runtime is chosen (an ADR), it changes in three ways:

- **Base image:** a CUDA-enabled image, so PyTorch can use the GPU.
- **Size:** PyTorch and its CUDA libraries add several gigabytes, so dependency-layer caching matters
  even more.
- **Weights:** either baked into the image (bigger image, no download at start) or fetched from the
  versioned model registry in Cloud Storage at start-up (small image, slower cold start). The README
  says to decide using cold-start measurements. Weights never go into the Git repository either way.
</details>

**Question 7.** You build the API image on your Apple Silicon Mac without `--platform`, push it, and
deploy it to Cloud Run. The deployment fails with `exec format error`. What's the most likely cause?

- a) the Dockerfile has a syntax error
- b) the image was built for `arm64`, but Cloud Run runs `amd64`
- c) Cloud Run doesn't support Python 3.12
- d) the container listens on the wrong port

---

## Challenge: containerise the inference service (20 minutes)

Without looking at Part D's commands:

1. Build an image of `services/inference` called `inference`.
2. Run it so that it's reachable on port **8081** on your Mac, and check its `/health` endpoint.
3. Run it again, passing a model ID and revision through environment variables, so that `/health`
   reports them. Use made-up values such as `example-org/example-vlm` and `0123abcd`; no model is
   loaded yet.
4. Run the API container (port 8080) and the inference container (port 8081) **at the same time**,
   and show both with one command.
5. Compare the two Dockerfiles. What's different, and what do you expect to change when you add a
   real model?

<details>
<summary>Hint 1</summary>

The build context for the inference service is its own folder, just as `services/api` was for the API.
</details>

<details>
<summary>Hint 2</summary>

`-p <port on your Mac>:<port inside the container>`. The container still listens on 8080 inside.
</details>

<details>
<summary>Hint 3</summary>

The inference service reads variables prefixed with `INFERENCE_`. Look in
`services/inference/app/config.py` or `services/inference/.env.example` for the names.
</details>

---

## Wrap-up

**Question 8 (explain it back).** Describe the journey from `services/api/Dockerfile` to a running
API on Cloud Run. Name each step (build, tag, push, pull, run), say where each happens, and explain
how the container learns its port and configuration.

### Cheat sheet

| I want to... | Command |
| --- | --- |
| build an image from a folder | `docker build -t <name> <folder>` |
| build for Cloud Run on Apple Silicon | `docker build --platform linux/amd64 -t <name> <folder>` |
| run it and reach port 8080 | `docker run --rm -p 8080:8080 <name>` |
| pass configuration | `docker run ... -e NAME=value <name>` |
| run in the background | `docker run -d --name <cname> -p 8080:8080 <name>` |
| list running / all containers | `docker ps` / `docker ps -a` |
| see a container's logs | `docker logs <cname>` (add `-f` to follow) |
| run a command inside a running container | `docker exec <cname> <command>` |
| stop and remove | `docker stop <cname>` then `docker rm <cname>` |
| list images, see layers | `docker images`, `docker history <name>` |
| tidy up | `docker container prune`, `docker image prune` |

### Done when

- [ ] `docker run hello-world` works, and Exercise A1 is done
- [ ] Your practice app builds and runs (B1), and you've seen the cache and `.dockerignore` at work
      (C1, C2)
- [ ] The real API image builds, runs and answers `/health` (D1), and you know its architecture (E1)
- [ ] The inference challenge is done
- [ ] You've written answers to Questions 1–8 and compared them with the
      [answer key](../answers/10-docker.md), or talked them through with `/tutor`
- [ ] You can explain every line of `services/api/Dockerfile` without notes

Delete your practice branch when you're done (`git switch main`, then `git branch -D learning/docker`).

Next: **Lesson 11, How everything connects.** You'll put every piece of the course on one map.
