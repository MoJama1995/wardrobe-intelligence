# Lesson 10 answer key: Docker

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask the tutor why
> (`/tutor` or `$tutor`).

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: images and containers after three runs

**Answer: a).** One image, three containers. `docker run` creates a new container from the image
every time; the image itself is built (or pulled) once and reused. `docker ps -a` shows three
stopped `hello-world` containers, and `docker images` shows one image.

**Misconception:** *"Running an image changes it."* It doesn't. Images are read-only; each container
gets its own writable layer on top, which disappears when the container is removed.

---

### Question 2: uvicorn listening on `127.0.0.1` inside the container

**A good answer includes:**

- Inside a container, `127.0.0.1` (localhost) means **the container itself**, not your Mac.
- `-p 8080:8080` forwards traffic from your Mac to the container's network interface. An app that
  listens only on the container's own loopback never sees that traffic, so the connection fails.
- `0.0.0.0` means "listen on every network interface", including the one Docker forwards to.

**Misconception:** *"Publishing the port with `-p` is enough."* The app must also listen where the
traffic arrives. Cloud Run has the same requirement: listen on `0.0.0.0` and on `$PORT`.

---

### Question 3: why copy `requirements.txt` first?

**A good answer includes:**

- Each instruction creates a layer. Docker reuses cached layers until it reaches the first instruction
  whose inputs changed, and from there it reruns everything.
- With `COPY requirements.txt .` first, the slow `pip install` layer depends only on
  `requirements.txt`. Editing `main.py` changes only the later `COPY main.py` layer, so packages
  aren't reinstalled.
- `pip install` still runs again when `requirements.txt` changes, when anything above it changes
  (for example a new version of the base image, or a different `FROM` line), or when you build with
  `--no-cache`.

It's the same idea as caching preprocessed features: recompute only what depends on what changed.

---

### Question 4: `.gitignore` compared with `.dockerignore`

**A good answer includes:**

- `.gitignore` is read **only by Git**. Docker reads **only `.dockerignore`**. The build context is the
  folder on your disk, which includes untracked files like your real `.env`, whatever Git thinks of
  them.
- `services/api` uses two layers of protection:
  - **explicit `COPY` lines** (`pyproject.toml`, `uv.lock`, `app`), so only named files enter the
    image;
  - **`.dockerignore`**, so secrets and junk aren't even sent to the builder, and stay out if
    someone later adds a broad `COPY . .`.

**Worth knowing:** a secret that made it into any layer stays in the image, even if a later step
deletes it, because earlier layers are still part of the image. If a secret was ever in a pushed
image, rotate it.

---

### Question 5: non-root user and two stages

**A good answer includes:**

- **Non-root:** containers run as `root` by default. If an attacker exploited a bug in our API,
  running as an unprivileged user limits what they could change inside the container. It's least
  privilege again, like the IAM roles in Lesson 9.
- **Two stages:** the `build` stage has uv and the tools needed to create the virtual environment.
  The `runtime` stage copies only the result (Python, the `.venv` and `app/`). The final image is
  smaller and contains less that could be attacked or go wrong, and the build tools never reach
  production.
- A strong answer mentions the cache mount too: uv's download cache speeds up builds without ever
  being part of an image.

---

### Question 6: `API_ENVIRONMENT=staging`

**A good answer includes:**

- The container **fails to start**. `Settings` in `services/api/app/core/config.py` only accepts
  `local`, `test`, `dev` or `prod`, so Pydantic raises a validation error while the app is loading.
  The output ends with something like `Input should be 'local', 'test', 'dev' or 'prod'`, and the
  container exits (and, with `--rm`, is removed).
- This is **failing fast**: a misconfigured service stops immediately with a clear message, instead
  of running half-configured and failing mysteriously later.
- On Cloud Run, a new revision that doesn't start never receives traffic. The deployment fails and
  the previous working revision keeps serving.

---

### Question 7: `exec format error` on Cloud Run

**Answer: b).** Building on Apple Silicon without `--platform` produces an `arm64` image, and Cloud
Run runs `amd64`. The processor can't execute the image's programs, hence "exec format error". Build
with `--platform linux/amd64` (in our setup, CI will do this).

The other options produce different errors: a Dockerfile syntax error fails the build itself, and a
wrong port makes Cloud Run report that the container didn't start listening on `$PORT`.

---

### Question 8: from Dockerfile to Cloud Run

**A good answer covers, in order:**

1. **Build:** `docker build --platform linux/amd64 --build-arg BUILD_SHA=<commit> ...` runs the
   Dockerfile and produces an image: on a laptop, or (planned) in GitHub Actions.
2. **Tag:** name it with the registry path and the commit SHA, such as
   `europe-west1-docker.pkg.dev/<project>/<repo>/api:<sha>`. Never just `latest`.
3. **Push:** `docker push` uploads it to Artifact Registry (CI or a human; an agent must ask first).
4. **Deploy:** Cloud Run is told to run that exact image (through Pulumi or `gcloud run deploy`).
5. **Pull and run:** Cloud Run pulls the image and starts containers, setting `PORT`, which the `CMD`
   passes to uvicorn, along with environment variables such as `API_ENVIRONMENT` from the service's
   configuration.
6. **Logs:** the app writes JSON lines to standard output, and Cloud Run sends them to Cloud Logging.

---

### Exercise D1: predictions

1. `/health` returns `"environment":"dev"`: configuration from the environment, same image.
2. The app listens on 9000 inside the container, and `-p 9000:9000` publishes it: `/health` works on
   `localhost:9000`. That's exactly what Cloud Run does with `PORT`.
3. `/health` returns `"build":"<your short commit SHA>"` instead of `"unknown"`.
4. `whoami` prints `app`. `ls -a /app` shows `.`, `..`, `.venv`, `app`, `pyproject.toml` and
   `uv.lock`. There are **no tests**: the Dockerfile never copies them, and `.dockerignore` excludes
   them anyway.
5. `docker history` shows one line per layer. The biggest besides the base image is the copy of the
   prepared `/app` (mostly `.venv`).

---

### Challenge: containerise the inference service

```bash
docker build -t inference services/inference
docker run --rm -p 8081:8080 inference
curl http://localhost:8081/health
# {"status":"ok","service":"inference","model_id":null,"model_revision":null,"model_loaded":false,"build":"unknown"}

docker run --rm -p 8081:8080 \
  -e INFERENCE_MODEL_ID=example-org/example-vlm \
  -e INFERENCE_MODEL_REVISION=0123abcd \
  inference
curl http://localhost:8081/health
# {"status":"ok","service":"inference","model_id":"example-org/example-vlm","model_revision":"0123abcd","model_loaded":false,"build":"unknown"}

docker run -d --name api-local -p 8080:8080 api
docker run -d --name inference-local -p 8081:8080 inference
docker ps
docker stop api-local inference-local
docker rm api-local inference-local
```

Both containers listen on 8080 *inside*. They don't clash, because each has its own network space;
only the ports published on your Mac must differ.

Comparing the files (`diff services/api/Dockerfile services/inference/Dockerfile`), they differ only in
comments and in the build-SHA variable name (`API_BUILD_SHA` compared with `INFERENCE_BUILD_SHA`).
Inference is still a CPU placeholder. When a model is added, expect:

- a **CUDA base image**, and PyTorch (or vLLM) in the dependencies: several GB, so caching matters
  more
- a decision on **weights**: baked into the image, or downloaded from the model registry at start-up,
  decided by cold-start measurements in an ADR
- a real `model_loaded` value in `/health`, and a much longer start-up while the model loads

You may also notice that `docker logs inference-local` shows no line per request. The inference
service doesn't have the API's request-logging middleware yet, and its Dockerfile turns off uvicorn's
access log.
