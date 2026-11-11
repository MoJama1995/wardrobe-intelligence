# Lesson 3 answer key: How software systems communicate

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask the tutor why
> (`/tutor` or `$tutor`).

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: why the API must check the file size too

**A good answer includes:**

- The React app runs on the user's device, so the user controls it. Anyone can bypass it entirely
  and send requests straight to the API with `curl`, a script, or a modified copy of the page.
- So a check that exists only in the frontend isn't a rule, it's a suggestion. The backend is the
  only place we control, so it must enforce every rule that matters for safety, cost or
  correctness.
- Checking in the frontend *as well* is still good: it gives the user instant feedback without
  waiting for an upload. It just can't be the only check.

**Misconception:** *"It's our own code, so it can be trusted."* The code is ours, but the device
running it isn't.

---

### Question 2: what a `503` most likely means

**Answer: b).** `503 Service Unavailable` is a server-side (`5xx`) status. Our API uses it when a
dependency, such as inference, is unavailable.

**Why the others are wrong:** a missing field is a caller mistake, `422` (a). A URL that doesn't
exist is `404` (c). Not being logged in is `401` (d). All three are `4xx`, the caller's side.

---

### Question 3: what to do with a request ID

**A good answer includes:**

- Search the logs for that exact `request_id`. Every log line written while handling that request
  carries it (`services/api/app/core/logging.py`), so you find the exact request: path, status,
  duration and any exception traceback, which never goes to the user.
- It beats a timestamp because many requests happen in the same second, clocks differ between
  machines, and the user's clock or time zone may be wrong. An ID is exact.
- Once the API calls inference with the same ID, one search finds the request's whole journey
  across services.

---

### Question 4: a schema change without regenerating

**A good answer includes:**

- `services/api/tests/test_contract.py` fails, because the committed `openapi.json` no longer
  matches what the code produces. It fails in `uv run pytest`, in `make check`, and later in CI on
  the PR. Its message says exactly which commands to run.
- After running `uv run python -m app.contract`, the frontend types still need `npm run gen:api`.
  Until then, the frontend doesn't know about `region`. Nothing breaks, because it's a *new* field,
  but the frontend can't use it.
- The reviewer should also expect to see `openapi.json` and `schema.gen.ts` change in the same PR.
  Their diffs show exactly how the contract changed.

**Worth knowing:** *removing* or *renaming* a field is more dangerous than adding one. Code that
reads the old field breaks. Thanks to the generated types, TypeScript catches that at compile time
(`npm run typecheck`) instead of in the user's browser.

---

### Question 5: stopping the API during Exercise D1

**A good answer includes:**

- It wasn't the API's error envelope, because the API wasn't running, so nothing could produce
  one. The Vite dev server's proxy couldn't reach port 8000. It answered **`502 Bad Gateway`** with an
  empty, plain-text body.
- How you know: the Network tab shows status `502`, there's no `x-request-id` header, and there's no
  JSON body. No log line appears in the API terminal either.
- The frontend's `toApiError` in `apps/web/src/lib/api/client.ts` tries to read the error envelope,
  fails (the body isn't JSON), and falls back to a generic `ApiError`. `ApiStatus.tsx` then shows
  its error state: `API unavailable: Request failed with status 502`.

**Why it matters:** the frontend must cope with errors that *don't* come from our API, such as
proxies, networks and timeouts. That's why `client.ts` has a fallback, and why
`ApiStatus.test.tsx` tests a failed network request separately.

---

### Question 6: no timeout on a cold GPU

**A good answer includes:**

- **Without a timeout:** the API waits as long as inference takes, 90 seconds here, or forever if
  inference hangs. The user sees a spinner and probably gives up or retries, which sends *another*
  slow request. Meanwhile, the API holds a connection and a worker for each waiting request. Enough
  of those and the API itself stops responding, even for `/health`. One slow dependency has taken
  the whole product down.
- **With a 30-second timeout:** after 30 seconds the API stops waiting and returns a clear error:
  `504` with a stable code (in our error envelope, with a `request_id`). The frontend can show "the
  model is warming up, try again in a minute". The API stays healthy.
- **Going further:** the real fix for cold starts is a product and infrastructure decision, such as
  a minimum number of warm instances (which costs money), loading weights faster, or switching to a
  background job and polling. Each of those is an ADR-sized trade-off.

---

### Question 7: a Hugging Face token in `VITE_HF_TOKEN`

**Any two of these:**

- **Every `VITE_*` value is embedded in the JavaScript bundle**, so anyone visiting the site can
  read the token, then use it, abuse it, or run up costs on our account.
- **It skips every check the API does:** file type and size validation, EXIF stripping (users' GPS
  locations would leave the device), and later authentication and per-user limits.
- **No control over the model:** the frontend would call whatever the Hub serves, instead of our
  pinned, evaluated model version in `services/inference`. Results would no longer be reproducible
  or comparable.
- **No logs, no request IDs, no single place to fix things**, and the frontend becomes coupled to
  one model provider.

---

### Question 8: the upload journey

**A good answer covers:**

1. The browser sends `POST` (for example to `/items`) with the photo as `multipart/form-data`.
   Locally it goes through the Vite proxy; deployed, it goes to the API's URL with CORS.
2. The API validates what the client can't be trusted with: type by magic bytes and a size limit
   (`415` or `413` otherwise, in the error envelope). It strips EXIF (privacy), then stores the image
   in a private bucket under a random id.
3. The API calls inference over HTTP **with a timeout**, sending the image or a reference to it.
4. Inference preprocesses, prompts the VLM, parses the output into structured JSON, and returns it
   with the model version.
5. The API saves and returns the result as JSON (`200`). The frontend renders the attributes.
6. If inference is down or too slow, the API returns `503` or `504` with a stable code and a
   `request_id`, and the frontend shows a friendly message. The request ID links the log lines
   across both services.

Bonus points: pointing out what's still open (endpoint names, whether inference gets bytes or a
storage reference, where results are saved, authentication), and that the flow is synchronous for
now.

---

### Challenge: add an endpoint

One good solution. It was checked with `uv run pytest` (15 passed), `ruff`, `mypy`, `npm run
typecheck` and real `curl` requests. Yours may differ and still be right. Compare the *structure*:
schema, service, route, tests, regenerated contract.

**`services/api/app/schemas/attributes.py`**, the contract:

```python
from typing import Literal

from pydantic import BaseModel, Field

AttributeField = Literal["category", "colour", "material", "pattern"]


class AttributeValue(BaseModel):
    field: AttributeField = Field(description="Which garment attribute this value describes.")
    value: str = Field(
        min_length=1, max_length=100, description="The value as typed, e.g. '  Navy Blue '."
    )


class NormalisedAttribute(BaseModel):
    field: AttributeField
    value: str = Field(description="Lower-case, with single spaces, e.g. 'navy blue'.")
```

**`services/api/app/services/attributes.py`**, business logic with no FastAPI imports (plus an
empty `app/services/__init__.py`):

```python
"""Business logic for garment attributes. No FastAPI imports here."""


def normalise_value(value: str) -> str:
    """Lower-case and collapse whitespace, so 'Navy  Blue ' and 'navy blue' compare equal."""
    return " ".join(value.lower().split())
```

**`services/api/app/api/attributes.py`**, a thin route:

```python
from fastapi import APIRouter

from app.schemas.attributes import AttributeValue, NormalisedAttribute
from app.services.attributes import normalise_value

router = APIRouter(prefix="/attributes", tags=["attributes"])


@router.post("/normalise", summary="Normalise an attribute value")
def normalise(body: AttributeValue) -> NormalisedAttribute:
    """Returns the value in the canonical form used for comparison and search."""
    return NormalisedAttribute(field=body.field, value=normalise_value(body.value))
```

**`services/api/app/main.py`**: import the router and register it:

```python
from app.api import attributes, health
...
    app.include_router(health.router)
    app.include_router(attributes.router)
```

**`services/api/tests/test_attributes.py`**:

```python
import pytest
from fastapi.testclient import TestClient

from app.services.attributes import normalise_value


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("Navy Blue", "navy blue"), ("  navy   BLUE ", "navy blue"), ("denim", "denim")],
)
def test_normalise_value(raw: str, expected: str) -> None:
    assert normalise_value(raw) == expected


def test_normalise_endpoint_returns_the_canonical_value(client: TestClient) -> None:
    response = client.post(
        "/attributes/normalise", json={"field": "colour", "value": " Navy Blue "}
    )

    assert response.status_code == 200
    assert response.json() == {"field": "colour", "value": "navy blue"}


def test_unknown_field_is_a_validation_error(client: TestClient) -> None:
    response = client.post("/attributes/normalise", json={"field": "price", "value": "cheap"})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["loc"] == ["body", "field"]


def test_empty_value_is_a_validation_error(client: TestClient) -> None:
    response = client.post("/attributes/normalise", json={"field": "colour", "value": ""})

    assert response.status_code == 422
```

**Step 3, the test you didn't write:** `tests/test_contract.py` fails with
`openapi.json is stale: run uv run python -m app.contract and npm run gen:api`. Running
`uv run python -m app.contract` fixes it. The skill also says to bump `__version__` in
`app/__init__.py` (`0.1.0` → `0.2.0`, a minor bump, because adding an endpoint doesn't break anyone);
regenerate after bumping, because the version is part of `openapi.json`.

**Step 4:** `npm run gen:api` adds `"/attributes/normalise"`, `AttributeValue` and
`NormalisedAttribute` to `schema.gen.ts`, including
`field: "category" | "colour" | "material" | "pattern";`.

**Step 5:** real responses:

```bash
curl -i -X POST http://localhost:8000/attributes/normalise \
  -H "Content-Type: application/json" -d '{"field": "colour", "value": "  Navy   Blue "}'
```

```
HTTP/1.1 200 OK
...
{"field":"colour","value":"navy blue"}
```

```bash
curl -i -X POST http://localhost:8000/attributes/normalise \
  -H "Content-Type: application/json" -d '{"field": "price", "value": "cheap"}'
```

```
HTTP/1.1 422 Unprocessable Entity
...
{"error":{"code":"validation_error","message":"Request validation failed.","request_id":"125d18dd431b4c8da086f60226e1398c","details":[{"loc":["body","field"],"msg":"Input should be 'category', 'colour', 'material' or 'pattern'","type":"literal_error"}]}}
```

Notice that the `422` lists *where* the problem is (`["body", "field"]`) but doesn't echo your input
back. That's deliberate (see `app/core/errors.py`).

**Extension, the frontend client:**

```ts
export type AttributeValue = components['schemas']['AttributeValue']
export type NormalisedAttribute = components['schemas']['NormalisedAttribute']

export function normaliseAttribute(
  body: AttributeValue,
  signal?: AbortSignal,
): Promise<NormalisedAttribute> {
  return request<NormalisedAttribute>('/attributes/normalise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  })
}
```

Calling it with `field: 'price'` fails `npm run typecheck`:

```
error TS2322: Type '"price"' is not assignable to type '"category" | "colour" | "material" | "pattern"'.
```

That's the contract chain at work: a rule written once in Python (`Literal[...]`) is enforced in
TypeScript at compile time, before any request is sent.

**Common mistakes:**

- Putting the logic in the route function. It works, but you can't unit-test it without HTTP, and
  the next endpoint that needs it will copy it.
- Regenerating `openapi.json` but not `schema.gen.ts` (or the reverse).
- Returning a plain `dict` instead of a response model. The endpoint still works, but `/docs` and
  the generated types lose the response shape.
