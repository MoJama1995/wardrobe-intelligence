# Lesson 3: How software systems communicate

**Time:** about 3.5 hours, in five parts (A–E) plus a coding challenge.

**By the end you can:**

- explain what an API is, and what the frontend and the backend each do
- read an HTTP request and response: method, URL, headers, status code and body
- send requests to our API from the terminal and the browser, and read what comes back
- explain REST, endpoints, JSON and data contracts, using our own code
- explain how our TypeScript frontend and Python API stay in agreement automatically
- describe the basics of authentication, and why it never lives in frontend code
- walk through the full journey of a photo upload, from the browser to the model and back
- add a small endpoint to the API, with a test and an updated contract

| You need now | You can learn later |
| --- | --- |
| HTTP methods and status codes; headers and JSON bodies; `curl -i`; `/docs`; endpoints; the contract chain Pydantic → `openapi.json` → `schema.gen.ts`; the error envelope; request IDs; timeouts; the idea of authentication | HTTP/2 and HTTP/3, WebSockets, gRPC, OAuth flows in detail, rate limiting, caching headers, API versioning strategies |

---

## Before you start (5 minutes)

You need `make setup` to have succeeded (Lesson 2). You'll use **three terminal windows or tabs**,
all starting in the repository root:

```bash
cd ~/dev/wardrobe-intelligence
```

Check that `curl` is installed: `curl --version`. It's a command-line tool for sending HTTP
requests, and it ships with macOS.

---

## Part A: Frontend, backend and APIs (25 minutes)

### What an API is

An **API** (*Application Programming Interface*) is the set of requests one program accepts from
other programs, and what it promises to return.

You already use APIs all the time: `model.generate(inputs, max_new_tokens=256)` is an API. You know
its inputs and outputs without reading its source. A **web API** is the same idea, except the caller
and the program are separate processes, often on separate machines, talking over the network.

### Frontend and backend

```
   user's device (untrusted)                 our servers (trusted)
 ┌──────────────────────────┐          ┌───────────────────────────────┐
 │  browser                 │          │  services/api   (FastAPI)     │
 │  apps/web (React)        │──HTTP──▶ │  validates, decides, stores   │──▶ services/inference
 │  shows things, collects  │◀──JSON── │  holds secrets                │      (the model)
 │  input                   │          │                               │
 └──────────────────────────┘          └───────────────────────────────┘
          FRONTEND                                   BACKEND
```

- The **frontend** is the part that runs on the user's device: our React app in `apps/web`. It
  displays things and collects input. It's **untrusted**: anyone can open the browser tools, read
  its code and send it whatever they like.
- The **backend** runs on our servers: `services/api`, and behind it `services/inference`. It
  checks every request, makes decisions, stores data and holds the secrets. It's the only part we
  control.

That's why the rule is: **the frontend asks, the backend decides.** A file-size limit checked only
in the browser isn't a limit. The API must check it too.

### Exercise A1: start the API and meet its documentation (10 minutes)

In terminal 1:

```bash
cd services/api
uv run uvicorn app.main:app --reload --port 8000
```

**Uvicorn** is the web server that runs our FastAPI app. `app.main:app` means "the object `app` in
the module `app/main.py`". `--reload` restarts it when you save a file. Leave it running. You
should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Open <http://localhost:8000/docs> in your browser. This page is generated automatically from our
code. Expand **GET /health**, click **Try it out**, then **Execute**. Look at the response body and
the response headers.

**Question 1.** Our file-size limit for photo uploads will be checked by the API. Why isn't it
enough to check it only in the React app, even though the React app is our own code?

---

## Part B: HTTP requests and responses (35 minutes)

### The shape of every HTTP exchange

**HTTP** is the language browsers and servers use. Every exchange is one **request** and one
**response**:

```
REQUEST                                          RESPONSE
POST /attributes/normalise HTTP/1.1     ◀ method, path           HTTP/1.1 200 OK           ◀ status
Host: localhost:8000                    ◀ headers                content-type: application/json
Content-Type: application/json                                   x-request-id: c223e8e4...
                                        ◀ blank line
{"field": "colour", "value": "Navy"}    ◀ body (optional)        {"field":"colour","value":"navy"}
```

- **Method:** what you want to do.
- **URL:** where. `http://localhost:8000/health?verbose=1` is the scheme (`http`), host
  (`localhost`), port (`8000`), path (`/health`) and query string (`verbose=1`).
- **Headers:** metadata as `Name: value` lines, such as the body's format (`Content-Type`) or who
  you are (`Authorization`).
- **Body:** the data, usually JSON. A `GET` has no body.
- **Status code:** a three-digit number saying how it went.

| Method | Meaning | Example |
| --- | --- | --- |
| `GET` | read something; changes nothing | `GET /health` |
| `POST` | create something, or run an action | upload a photo |
| `PUT` / `PATCH` | replace or update something | correct a garment's colour |
| `DELETE` | remove something | delete a garment |

| Status | Family | Ones you'll meet |
| --- | --- | --- |
| `2xx` | success | `200 OK`, `201 Created` |
| `4xx` | **the caller** did something wrong | `400` bad request, `401` not logged in, `403` not allowed, `404` not found, `405` wrong method, `413` too large, `415` unsupported type, `422` invalid data |
| `5xx` | **the server** failed | `500` bug, `502` a proxy couldn't reach the server behind it, `503` a dependency is unavailable, `504` a dependency timed out |

The `4xx` and `5xx` split matters when debugging: `4xx` means "fix the request", `5xx` means "look
at the server's logs".

**JSON** (*JavaScript Object Notation*) is the text format both sides use for bodies. It looks
almost like a Python dict: `{"status": "ok", "count": 3, "tags": ["blue"], "model": null}`.

### Exercise B1: talk to the API with curl (20 minutes)

In terminal 2, from the repository root. `-i` tells curl to show the status line and headers, not
just the body.

```bash
curl -i http://localhost:8000/health
```

```
HTTP/1.1 200 OK
date: Wed, 11 Nov 2026 17:19:33 GMT
server: uvicorn
content-length: 69
content-type: application/json
x-request-id: ee645041db144b63ab82226ebef7e33f

{"status":"ok","service":"api","environment":"local","build":"local"}
```

Now ask for something that doesn't exist, and then use the wrong method:

```bash
curl -i http://localhost:8000/wardrobe
curl -i -X POST http://localhost:8000/health
```

```
HTTP/1.1 404 Not Found
...
{"error":{"code":"not_found","message":"Not Found","request_id":"88a0ea8505e940a0b9354e953db73af3"}}

HTTP/1.1 405 Method Not Allowed
...
{"error":{"code":"method_not_allowed","message":"Method Not Allowed","request_id":"4536ec7c3faa4209b2be959b1811dcfe"}}
```

Notice two things:

1. **Every error has the same shape**, `{"error": {"code", "message", "request_id"}}`. That's our
   **error envelope** (`services/api/app/core/errors.py`). The frontend handles every error the same
   way and shows `message` to the user. `code` is stable, so code can check it safely.
2. **Every response has an `x-request-id` header**, and errors repeat it in the body.

Now send your own request ID, as the frontend could:

```bash
curl -s -D - -o /dev/null -H "X-Request-ID: my-test-123" \
  http://localhost:8000/health | grep -i request
```

```
x-request-id: my-test-123
```

Switch to terminal 1 and look at the API's log. Each request produced a JSON line like this:

```
{"severity": "INFO", "message": "request_completed", "logger": "app.request", "timestamp": "2026-11-11T17:19:33.980858+00:00", "request_id": "88a0ea8505e940a0b9354e953db73af3", "http_method": "GET", "path": "/wardrobe", "status_code": 404, "duration_ms": 0.14}
```

Find the line whose `request_id` matches your 404. That's what request IDs are for: when a user
reports "it failed", the ID in the error lets you find the exact log line, even among millions.
(The plain `INFO: 127.0.0.1 ... "GET /health"` lines come from Uvicorn's own logging when you run
it locally. In the container we switch those off and keep only our JSON lines.)

<details>
<summary><strong>Go deeper:</strong> why the logs are JSON</summary>

In Google Cloud, everything a service prints goes to Cloud Logging. Cloud Logging understands one
JSON object per line, so `severity` becomes the log level, and fields such as `request_id` and
`status_code` become searchable: "show all 5xx responses in the last hour" is a filter, not a
`grep`. That's the reason for `services/api/app/core/logging.py`. It's also why we never log
secrets, image bytes or personal data: logs are kept, searched and shared.
</details>

**Question 2.** You call the API and get `503`. Which of these is the most likely explanation?

- a) You sent JSON with a missing field
- b) The API is working, but something it depends on (such as the inference service) is unavailable
- c) The URL you requested doesn't exist
- d) You aren't logged in

**Question 3.** A user screenshots an error message that includes
`request_id: 4536ec7c3faa4209b2be959b1811dcfe`. What do you do with it, and why is it more useful
than the time of the error?

---

## Part C: REST, endpoints and data contracts (35 minutes)

### Endpoints and REST

An **endpoint** is one method and path combination the API answers, such as `GET /health`. Our API
has exactly one today. The upload flow will add more.

**REST** is a widely used style for designing endpoints:

- URLs name **things** (resources), with nouns: `/items`, `/items/{item_id}`
- the **method** says what to do with them: `GET /items/42` reads item 42, `DELETE /items/42`
  removes it
- the **status code** says how it went, and the body carries JSON

So "upload a photo of a garment" naturally becomes `POST /items`, and "show me this garment" becomes
`GET /items/{item_id}`. These names are examples: the real paths will be decided when the upload
flow is built.

### Data contracts

The frontend and backend are written in **different languages** by (potentially) **different
people**, and run on **different machines**. They still have to agree, exactly, on what each
request and response looks like. That agreement is the **data contract**.

The dangerous way to do it is to write the shape twice, once in Python and once in TypeScript, and
hope they stay in sync. Ours is written **once**, and everything else is generated from it
([ADR 0003](../../docs/decisions/0003-api-contract-via-openapi.md)):

```
 services/api/app/schemas/health.py        Pydantic model: the single source of truth
            │  uv run python -m app.contract
            ▼
 services/api/openapi.json                 OpenAPI: a language-neutral description of every
            │  npm run gen:api               endpoint and schema (committed to Git)
            ▼
 apps/web/src/lib/api/schema.gen.ts        TypeScript types, generated (never edited by hand)
            │  imported by
            ▼
 apps/web/src/lib/api/client.ts            the typed functions the React code calls
```

Two safety nets keep the chain honest:

- `services/api/tests/test_contract.py` **fails** if `openapi.json` doesn't match the code, so
  you can't forget to regenerate it.
- Because the frontend uses generated types, TypeScript **refuses to compile** frontend code that
  sends or expects the wrong shape. You'll see this in the challenge.

**OpenAPI** is a standard format for describing HTTP APIs. FastAPI produces it from your Pydantic
models and route functions, and it's also what powers the `/docs` page you opened.

### Exercise C1: follow one shape through four files (15 minutes)

Find `HealthResponse` in each of these, and check that the fields match:

1. `services/api/app/schemas/health.py` (Pydantic)
2. `services/api/openapi.json` (search for `"HealthResponse"`)
3. `apps/web/src/lib/api/schema.gen.ts` (search for `HealthResponse`)
4. `apps/web/src/lib/api/client.ts` and `apps/web/src/features/system-status/ApiStatus.tsx`, where
   the frontend uses it

Then open <http://localhost:8000/openapi.json> while the API is running. It's the same document the
committed `openapi.json` is generated from.

**Question 4.** Your teammate adds a field `region` to `HealthResponse` in Python and opens a PR,
but forgets to regenerate anything. What happens, and at which step is the mistake caught?

---

## Part D: Frontend to backend, in the browser (25 minutes)

### The development proxy

In terminal 3, start the frontend:

```bash
cd apps/web
npm run dev
```

```
  VITE v8.3.7  ready in 65 ms

  ➜  Local:   http://localhost:5173/
```

**Vite** is the frontend's development server and build tool. Open <http://localhost:5173>. The page
says something like `API ok · local · build local`.

The page comes from port **5173**, but the API is on port **8000**. Browsers block a web page from
reading responses from a different *origin* (scheme + host + port) unless that server explicitly
allows it. This rule is called **CORS** (*Cross-Origin Resource Sharing*). To avoid it locally, the
React app calls `/api/health` on its *own* origin, and Vite forwards it to the API
(`apps/web/vite.config.ts`):

```
 browser ──GET /api/health──▶ Vite :5173 ──GET /health──▶ API :8000
         ◀──────────────────── JSON ◀─────────────────────
```

In a deployed environment there's no Vite server. The frontend calls the API's real URL
(`VITE_API_BASE_URL`), and the API allows the frontend's origin with `API_CORS_ORIGINS`.

### Exercise D1: watch it in the Network tab (15 minutes)

1. In the browser, open the developer tools (`Cmd+Option+I`) and choose the **Network** tab.
2. Reload the page. Click the request named `health`.
3. Under **Headers**, find the request URL, the method, the status code and the `x-request-id`
   response header. Under **Response**, find the JSON.
4. Find the same request ID in terminal 1's log.
5. Now **stop the API** (`Ctrl+C` in terminal 1) and reload the page. What does the page show, and
   what status does the Network tab show? Restart the API afterwards.

You can also call the API through the proxy from the terminal. It's the same path the browser uses:

```bash
curl -i http://localhost:5173/api/health
```

**Question 5.** In Exercise D1 you stopped the API. Was the error you saw produced by the API's error
envelope? Explain how you know, and which part of the frontend code handles this case.

---

## Part E: Services calling services, and authentication (30 minutes)

### Our second service

In terminal 2, start the inference service on its own port:

```bash
cd services/inference
uv run uvicorn app.main:app --port 8001
```

In another tab:

```bash
curl -i http://localhost:8001/health
```

```
HTTP/1.1 200 OK
...
{"status":"ok","service":"inference","model_id":null,"model_revision":null,"model_loaded":false,"build":"local"}
```

`model_loaded: false` is honest: no model has been chosen yet. Choosing it is ML-lead work, and you
wire one in during the final challenge.

When the API calls inference, the API is the **client**. The same HTTP rules apply, plus two that
matter a lot between services:

- **Always set a timeout.** A GPU service that is starting up ("cold") can take a minute or more.
  Without a timeout, the API would wait forever, and users would stare at a spinner. With one, the
  API gives up after a set time and returns a clear error.
- **Translate failures.** If inference is down, the API returns `503` with a code such as
  `inference_unavailable`. If it's too slow, `504`. It never passes on a raw stack trace
  (`.claude/skills/api-development/SKILL.md`).

ADR 0003 also says that this boundary will get the same treatment as the frontend's: a generated,
tested contract between the API and inference.

### The full journey of a photo upload

This flow is **designed but not built yet** (`docs/architecture/overview.md`, "Intended MVP request
flow"). You'll build a small version in the final challenge. Endpoint names are examples.

```
  BROWSER (apps/web)         API (services/api)                 INFERENCE (services/inference)
  ──────────────────         ──────────────────                 ──────────────────────────────
  1 user picks a photo
  2 POST /items  ───────────▶ 3 validate: type by magic bytes,
    multipart/form-data         size limit → 413 / 415 if bad
                              4 strip EXIF (GPS = personal data)
                              5 store in a private bucket
                                (Cloud Storage), random id
                              6 POST to inference, with a ─────▶ 7 preprocess (orientation, RGB,
                                timeout                              resize), prompt the VLM,
                                                                     parse the output as JSON
                              8 ◀───────────────────────────────── {"category": "shirt",
                                                                     "colour": "navy", ...,
                                                                     "model_version": "..."}
                              9 save the result
  11 show the attributes ◀─── 10 200 OK + JSON
                                 (or 503 / 504 if inference
                                  failed: same error envelope)

  The same request ID travels through every hop, so one ID finds all the log lines.
```

A few details worth noticing:

- An upload is sent as **`multipart/form-data`**, not JSON. That format is designed for files: the
  bytes go as they are, without being converted to text.
- The API checks the file's **magic bytes** (the first bytes of a JPEG or PNG) instead of trusting
  the filename or `Content-Type` header, because the client controls those.
- Whether inference receives the image bytes or a pointer to the stored file, and where results
  are saved, are still open decisions.
- The flow is **synchronous**: the browser waits while the model runs. That's the simplest thing
  that works. If measured latency turns out too high, we'd switch to a background job and polling,
  with an ADR.

### Authentication, briefly

- **Authentication** answers "who are you?". **Authorisation** answers "what are you allowed to
  do?" (for example, only *your* wardrobe).
- Common mechanisms: a **session cookie** set when you log in; a **token** sent on every request
  in the `Authorization: Bearer <token>` header; an **API key** for machine-to-machine calls.
- Secrets never go in frontend code. Anything in the browser bundle, including every `VITE_*`
  variable, can be read by anyone. Secrets live on the backend.
- Services also authenticate to each other. In Google Cloud, the inference service can be set up to
  accept calls only from the API's identity (Lesson 9).

**Our project hasn't chosen an authentication approach yet.** It's listed as an open decision in
`docs/architecture/overview.md`, and it depends on the product scope.

**Question 6.** The API calls inference without a timeout, and the GPU instance is cold and takes 90
seconds to load the model. Describe what the user experiences, and what changes once a 30-second
timeout is added.

**Question 7.** Someone suggests putting the Hugging Face token in `VITE_HF_TOKEN` so the frontend
can call the model directly and skip the API. Give two reasons this is a bad idea.

Stop the services you started (`Ctrl+C` in each terminal) when you're done with this part.

---

## Challenge: add an endpoint (45 minutes)

Add a small endpoint to the API, test it, and update the contract, the same way a real feature is
built. Work on a practice branch (it won't be merged unless your teammate wants it):

```bash
git switch main && git pull
git switch -c learning/normalise-endpoint
```

**The spec.** When people correct a model's prediction by hand, they type values like `" Navy Blue "`.
To compare and search values reliably, we need a canonical form.

- `POST /attributes/normalise`
- Request body (JSON): `{"field": "colour", "value": "  Navy   Blue "}`. `field` must be one of
  `category`, `colour`, `material` or `pattern`. `value` must be 1–100 characters.
- Response (200): `{"field": "colour", "value": "navy blue"}`, lower-case with single spaces.
- Anything invalid returns `422` in our standard error envelope. You get that for free from
  Pydantic and our error handlers.

**Steps:**

1. Read `.claude/skills/api-development/SKILL.md` ("Layout" and "Rules"). Put the request and
   response models in `app/schemas/`, the normalising function in `app/services/`, and the route in
   `app/api/`. Register the router in `app/main.py`.
2. Write tests in `services/api/tests/`: one for the function on its own, one for a successful
   request, and one for each kind of invalid input.
3. Run `uv run pytest` in `services/api`. **One test will fail that you didn't write.** Read its
   message and do what it says.
4. Run `npm run gen:api` in `apps/web`, then `git diff --stat` and `git diff apps/web/src/lib/api/schema.gen.ts`.
   Find your new types.
5. Try the endpoint with `curl` (and in `/docs`), including invalid input to see a real `422`.
6. Run `make check` from the root. Everything must pass. Then commit and push your branch, and open
   a draft PR if you'd like your teammate's feedback.

**Extension (frontend):** add a `normaliseAttribute()` function to `apps/web/src/lib/api/client.ts`
using the generated types. Then, in a scratch file, call it with `field: 'price'` and run
`npm run typecheck`. What happens? Delete the scratch file afterwards.

<details>
<summary>Hint 1</summary>

Pydantic's `Literal["category", "colour", "material", "pattern"]` restricts a field to fixed values,
and `Field(min_length=1, max_length=100)` limits a string's length.
</details>

<details>
<summary>Hint 2</summary>

Copy the shape of `app/api/health.py`: an `APIRouter`, a function with a typed parameter (FastAPI
reads a Pydantic-typed parameter from the JSON body) and a declared return type.
</details>

<details>
<summary>Hint 3</summary>

The test you didn't write is `tests/test_contract.py`. The fix is a command, not a code change. The
docstring at the top of `app/contract.py` names it.
</details>

<details>
<summary>Hint 4</summary>

For the curl request, you need `-X POST`, a `Content-Type: application/json` header (`-H`) and a
body (`-d '{"field": "colour", "value": " Navy Blue "}'`).
</details>

---

## Wrap-up

**Question 8 (explain it back).** Walk through the photo-upload journey from the diagram in Part E.
For each hop, say what is sent (method, format), who validates what, and what the user sees if
inference is down.

### Cheat sheet

| I want to... | Command |
| --- | --- |
| run the API | `cd services/api && uv run uvicorn app.main:app --reload --port 8000` |
| run inference | `cd services/inference && uv run uvicorn app.main:app --reload --port 8001` |
| run the frontend | `cd apps/web && npm run dev` (http://localhost:5173) |
| see a response with headers | `curl -i http://localhost:8000/health` |
| send JSON | `curl -i -X POST <url> -H "Content-Type: application/json" -d '{"k": "v"}'` |
| browse the API | http://localhost:8000/docs |
| regenerate the contract | `uv run python -m app.contract` (services/api), then `npm run gen:api` (apps/web), or `make contract` from the root |

| Status | Means | Look at |
| --- | --- | --- |
| `2xx` | it worked | |
| `4xx` | the request is wrong | the error's `code`, `message` and `details` |
| `5xx` | the server or a dependency failed | the server log, found by `request_id` |

### Done when

- [ ] Exercises A1, B1, C1 and D1 are done, and you've curled both services
- [ ] The challenge passes `make check` on your `learning/normalise-endpoint` branch
- [ ] You've written answers to Questions 1–8 and compared them with the
      [answer key](../answers/03-how-systems-communicate.md), or talked them through with `/tutor`
- [ ] You can draw the upload journey without looking

Next: **Lesson 4, Our technical stack.** Every tool you've used so far, and why we chose it.
