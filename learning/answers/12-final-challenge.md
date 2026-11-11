# Lesson 12 answer key: Final challenge

> **Finish the milestone first.** This is a complete reference implementation. Reading it before
> you've tried teaches much less than comparing afterwards. Your names and structure can differ: what
> matters is that the acceptance criteria hold.

The reference was built and checked while this course was written:

- `make check` passed: 27 API tests, 12 inference tests and 6 frontend tests, plus the existing
  projects
- all three services ran together, and real `curl` requests went through the API, through the Vite
  proxy and directly to inference (outputs below)

**Not verified:** the Docker commands in Milestone 6 (Docker wasn't available) and any real model in
Milestone 5 (that choice is yours).

The reference lives only in this answer key. It isn't in the application code.

---

### Milestone 0: Run what exists

```bash
make setup && make check
cd services/api && uv run uvicorn app.main:app --reload --port 8000        # terminal 1
cd services/inference && uv run uvicorn app.main:app --reload --port 8001  # terminal 2
cd apps/web && npm run dev                                                 # terminal 3
curl http://localhost:8000/health
curl http://localhost:8001/health
```

```
{"status":"ok","service":"api","environment":"local","build":"local"}
{"status":"ok","service":"inference","model_id":null,"model_revision":null,"model_loaded":false,"build":"local"}
```

### Question 1: Who answers `/api/health`?

**A good answer includes:**

- The browser sends the request to the **Vite dev server** on :5173. Its proxy
  (`apps/web/vite.config.ts`) removes `/api` and forwards it to the **API** on :8000, which answers.
  Vite passes the answer back.
- To the browser, everything comes from one origin (`localhost:5173`), so the same-origin rule never
  applies and no CORS headers are needed. When deployed, the frontend and API live on different
  origins, and that's when `API_CORS_ORIGINS` (or a shared domain) matters.

**Misconception:** *"The frontend calls the API directly."* Locally it calls its own dev server, which
acts as a middleman.

---

### Milestone 1: The contract

`POST /analyses` (API): a `multipart/form-data` request with one field, `file`. Success, **200**:

```json
{
  "image_id": "a67a5792ab0440bcbbfa526749f04dc7",
  "attributes": { "category": null, "colour": "red", "pattern": null, "material": null },
  "model": { "id": "fake", "revision": "v1" }
}
```

`POST /predict` (inference): the same `file` field. It returns
`{"attributes": {...}, "model_id": "...", "model_revision": "..."}`. It's deliberately **not** the
same shape as the API's response. Inference knows nothing about image ids or storage, and the API can
reshape its answer for the frontend without changing the inference service.

| Failure | Status | `code` |
| --- | --- | --- |
| no `file` field | 422 | `validation_error` (the existing handler) |
| empty file | 422 | `empty_file` |
| over 10 MB | 413 | `image_too_large` |
| not JPEG, PNG or WebP (by magic bytes) | 415 | `unsupported_media_type` |
| right magic bytes, but corrupt | 422 | `invalid_image` |
| inference unreachable | 503 | `inference_unavailable` |
| inference too slow | 504 | `inference_timeout` |
| inference answered with an error or nonsense | 502 | `inference_error` |

Field names match `packages/ai-evaluation` and the README: `category`, `colour`, `pattern`,
`material`. A `null` means the model abstained, which is exactly what `score_attributes` counts as an
abstention.

### Question 2: Why the contract first?

**A good answer includes:**

- The contract is what the *other* side depends on: the frontend, the generated TypeScript types,
  evaluation scripts, and later other clients. Deciding it first means you design what callers need,
  rather than whatever the implementation happened to produce.
- Renaming `colour` later is a **breaking change**. The frontend, every stored result and every
  evaluation script expect the old name. It needs a coordinated change, a major version bump
  (`app.__version__`), and possibly a migration of stored data. Before anyone uses the contract, a
  rename costs a minute.

---

### Milestone 2: Inference with a fake model

```bash
cd services/inference
uv add pillow python-multipart
```

`app/preprocessing.py`: one function, shared with the notebook later:

```python
"""Image preprocessing: the same steps must run in the notebook and in this service."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_SIDE_PX = 1024


class InvalidImageError(ValueError):
    """The bytes could not be decoded as an image."""


def load_image(data: bytes, max_side_px: int = MAX_SIDE_PX) -> Image.Image:
    """Decode, apply EXIF orientation, convert to RGB and shrink so the longest side fits."""
    try:
        decoded = Image.open(BytesIO(data))
        decoded.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("not a decodable image") from exc
    image = ImageOps.exif_transpose(decoded).convert("RGB")
    image.thumbnail((max_side_px, max_side_px))
    return image
```

`app/predictor.py`: the model boundary:

```python
"""The model boundary. Everything model-specific hides behind ``Predictor``.

``FakePredictor`` lets the whole system run without weights or a GPU. A real
model is another class with the same interface, selected in ``get_predictor``.
"""

from functools import lru_cache
from typing import Protocol

from PIL import Image
from pydantic import BaseModel


class GarmentAttributes(BaseModel):
    """Structured attributes. ``None`` means the model abstained (not visible / unsure)."""

    category: str | None
    colour: str | None
    pattern: str | None
    material: str | None


class Predictor(Protocol):
    model_id: str
    model_revision: str

    def predict(self, image: Image.Image) -> GarmentAttributes: ...


_BASIC_COLOURS: dict[str, tuple[int, int, int]] = {
    "black": (0, 0, 0),
    "white": (255, 255, 255),
    "grey": (128, 128, 128),
    "red": (200, 30, 30),
    "green": (30, 150, 60),
    "blue": (30, 60, 200),
    "yellow": (230, 210, 40),
}


def nearest_colour_name(rgb: tuple[int, int, int]) -> str:
    def distance(name: str) -> int:
        return sum((a - b) ** 2 for a, b in zip(rgb, _BASIC_COLOURS[name], strict=True))

    return min(_BASIC_COLOURS, key=distance)


class FakePredictor:
    """Deterministic stand-in: names the image's average colour and abstains on the rest."""

    model_id = "fake"
    model_revision = "v1"

    def predict(self, image: Image.Image) -> GarmentAttributes:
        average = image.resize((1, 1)).getpixel((0, 0))
        if not isinstance(average, tuple):  # pragma: no cover - load_image always returns RGB
            raise TypeError("expected an RGB image")
        r, g, b = (int(channel) for channel in average[:3])
        return GarmentAttributes(
            category=None, colour=nearest_colour_name((r, g, b)), pattern=None, material=None
        )


@lru_cache
def get_predictor() -> Predictor:
    # Load the model once per process. A real predictor is chosen here (see the README).
    return FakePredictor()
```

`app/main.py`: the endpoint:

```python
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.predictor import GarmentAttributes, Predictor, get_predictor
from app.preprocessing import InvalidImageError, load_image


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["inference"]
    model_id: str | None
    model_revision: str | None
    model_loaded: bool
    build: str


class PredictResponse(BaseModel):
    attributes: GarmentAttributes
    model_id: str
    model_revision: str


def create_app() -> FastAPI:
    app = FastAPI(title="Wardrobe Intelligence Inference", version="0.1.0")

    @app.get("/health", tags=["system"])
    def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
        # model_loaded becomes real once model loading exists; until then it is honest.
        return HealthResponse(
            status="ok",
            service="inference",
            model_id=settings.model_id,
            model_revision=settings.model_revision,
            model_loaded=False,
            build=settings.build_sha,
        )

    @app.post("/predict", tags=["inference"])
    def predict(
        file: Annotated[UploadFile, File(description="A garment photo (JPEG, PNG or WebP).")],
        predictor: Annotated[Predictor, Depends(get_predictor)],
    ) -> PredictResponse:
        """Extract garment attributes from one image."""
        try:
            image = load_image(file.file.read())
        except InvalidImageError as exc:
            raise HTTPException(status_code=422, detail="The file is not a valid image.") from exc
        return PredictResponse(
            attributes=predictor.predict(image),
            model_id=predictor.model_id,
            model_revision=predictor.model_revision,
        )

    return app


app = create_app()
```

`tests/test_predict.py`: test images are generated in code, so the tests need no fixture files and
have no licence questions:

```python
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.predictor import FakePredictor, GarmentAttributes, get_predictor, nearest_colour_name
from app.preprocessing import load_image


def png_bytes(
    colour: tuple[int, int, int], size: tuple[int, int] = (8, 8), mode: str = "RGB"
) -> bytes:
    buffer = BytesIO()
    Image.new(mode, size, colour).save(buffer, format="PNG")
    return buffer.getvalue()


def test_load_image_converts_to_rgb_and_shrinks_the_longest_side() -> None:
    rgba = BytesIO()
    Image.new("RGBA", (2000, 500), (10, 20, 30, 128)).save(rgba, format="PNG")

    image = load_image(rgba.getvalue(), max_side_px=1024)

    assert image.mode == "RGB"
    assert image.size == (1024, 256)


def test_nearest_colour_name() -> None:
    assert nearest_colour_name((210, 25, 35)) == "red"
    assert nearest_colour_name((5, 5, 5)) == "black"


def test_fake_predictor_names_the_average_colour_and_abstains_on_the_rest() -> None:
    image = load_image(png_bytes((25, 55, 210)))

    assert FakePredictor().predict(image) == GarmentAttributes(
        category=None, colour="blue", pattern=None, material=None
    )


def test_predict_endpoint_returns_attributes_and_model_identity() -> None:
    app = create_app()
    app.dependency_overrides[get_predictor] = FakePredictor

    response = TestClient(app).post(
        "/predict", files={"file": ("shirt.png", png_bytes((200, 30, 30)), "image/png")}
    )

    assert response.status_code == 200
    assert response.json() == {
        "attributes": {"category": None, "colour": "red", "pattern": None, "material": None},
        "model_id": "fake",
        "model_revision": "v1",
    }


def test_predict_endpoint_rejects_bytes_that_are_not_an_image() -> None:
    response = TestClient(create_app()).post(
        "/predict", files={"file": ("notes.txt", b"hello", "text/plain")}
    )

    assert response.status_code == 422
```

Check it by hand:

```bash
uv run python -c "from PIL import Image; Image.new('RGB', (64, 48), (200, 30, 30)).save('red.png')"
curl -F "file=@red.png" http://localhost:8001/predict
```

```
{"attributes":{"category":null,"colour":"red","pattern":null,"material":null},"model_id":"fake","model_revision":"v1"}
```

(Delete `red.png` afterwards, or keep test images outside the repository.)

### Question 3: Why keep the `FakePredictor`?

**Any two of these:**

- **It decouples the work.** The API and the frontend can be built and demonstrated before any model
  works, and your teammate can work on them without downloading weights.
- **Fast, deterministic tests.** `make test` and CI run in seconds, with no GPU and no gigabytes of
  weights. Real-model tests are kept separate (`@pytest.mark.model`).
- **It pins down the interface.** Your real model has to fit the same `Predictor` shape, so swapping
  models never touches the API.
- **A cheap deployment smoke test.** You can deploy the whole path on CPU, with no GPU costs, before
  committing to a GPU (see the optional extension).

---

### Milestone 3: The API

```bash
cd services/api
uv add python-multipart pillow httpx2
uv remove --dev httpx2          # now a runtime dependency, so the dev-only entry goes
```

Where everything lives (following the api-development skill):

```
services/api/app/
├── api/analyses.py          route: wires the dependencies, reads the upload, calls the service
├── schemas/analyses.py      the contract (Pydantic)
├── services/images.py       validation + EXIF stripping: pure functions
├── services/analyses.py     business logic: validate → strip → store → infer
├── repositories/images.py   storage interface + local implementation
└── clients/inference.py     HTTP client for services/inference
```

New settings in `app/core/config.py` (documented in `.env.example` too):

```python
    # Base URL of services/inference. Locally it runs on :8001.
    inference_url: str = "http://localhost:8001"
    # A cold GPU can take a minute or more to answer the first request.
    inference_timeout_seconds: float = 60.0
    max_upload_bytes: int = 10 * 1024 * 1024
    # Local development only: photos are written here (gitignored). Deployed: a private GCS bucket.
    upload_dir: Path = Path("local-uploads")
```

…and in the root `.gitignore`: `local-uploads/`. Wardrobe photos are personal data.

`app/schemas/analyses.py`:

```python
from pydantic import BaseModel, Field


class GarmentAttributes(BaseModel):
    """Attributes extracted from one photo. ``null`` means the model abstained."""

    category: str | None = Field(description="e.g. `shirt`, `trousers`.")
    colour: str | None = Field(description="Dominant colour, e.g. `navy`.")
    pattern: str | None = Field(description="e.g. `striped`, `plain`.")
    material: str | None = Field(description="e.g. `denim`. Often not visible: expect `null`.")


class ModelInfo(BaseModel):
    """Which model produced the attributes, so results can always be traced to a version."""

    id: str
    revision: str


class AnalysisResponse(BaseModel):
    image_id: str = Field(description="Server-generated id of the stored photo.")
    attributes: GarmentAttributes
    model: ModelInfo
```

`app/services/images.py`:

```python
"""Upload validation and metadata stripping. Pure functions: no HTTP, no storage."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import AppError

_FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


def detect_image_type(data: bytes) -> str | None:
    """Identify the type from the first bytes (magic bytes), never from the filename."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_upload(data: bytes, max_bytes: int) -> str:
    """Return the content type, or raise AppError with a stable code."""
    if not data:
        raise AppError(422, "empty_file", "The uploaded file is empty.")
    if len(data) > max_bytes:
        raise AppError(
            413, "image_too_large", f"Images must be {max_bytes // 1_000_000} MB or less."
        )
    content_type = detect_image_type(data)
    if content_type is None:
        raise AppError(
            415, "unsupported_media_type", "Only JPEG, PNG and WebP images are supported."
        )
    return content_type


def strip_metadata(data: bytes, content_type: str) -> bytes:
    """Apply EXIF orientation, then re-encode without any metadata (EXIF can hold GPS)."""
    try:
        with Image.open(BytesIO(data)) as decoded:
            image = ImageOps.exif_transpose(decoded)
            if content_type == "image/jpeg" and image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            buffer = BytesIO()
            image.save(buffer, format=_FORMATS[content_type])
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError(422, "invalid_image", "The image could not be read.") from exc
    return buffer.getvalue()
```

`app/repositories/images.py`:

```python
"""Where photos are stored. Local folder now; a private GCS bucket when deployed."""

from pathlib import Path
from typing import Protocol

_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


class ImageStore(Protocol):
    def save(self, image_id: str, data: bytes, content_type: str) -> None: ...


class LocalImageStore:
    """Development only. The folder is gitignored: wardrobe photos are personal data."""

    def __init__(self, directory: Path) -> None:
        self._directory = directory

    def save(self, image_id: str, data: bytes, content_type: str) -> None:
        self._directory.mkdir(parents=True, exist_ok=True)
        (self._directory / f"{image_id}{_EXTENSIONS[content_type]}").write_bytes(data)
```

`app/clients/inference.py`: note that the timeout is caught **before** the general transport error,
because it's a subclass of it:

```python
"""HTTP client for services/inference. Every failure becomes an AppError with a stable code."""

import logging
from typing import Protocol

import httpx2
from pydantic import BaseModel, ValidationError

from app.core.errors import AppError
from app.schemas.analyses import GarmentAttributes

logger = logging.getLogger(__name__)


class InferencePrediction(BaseModel):
    """What services/inference returns from POST /predict (the api↔inference contract)."""

    attributes: GarmentAttributes
    model_id: str
    model_revision: str


class InferenceClient(Protocol):
    def predict(self, image: bytes, content_type: str) -> InferencePrediction: ...


class HttpInferenceClient:
    def __init__(
        self,
        base_url: str,
        timeout_seconds: float,
        transport: httpx2.BaseTransport | None = None,  # tests pass a MockTransport
    ) -> None:
        self._base_url = base_url
        self._timeout = timeout_seconds
        self._transport = transport

    def predict(self, image: bytes, content_type: str) -> InferencePrediction:
        try:
            with httpx2.Client(
                base_url=self._base_url, timeout=self._timeout, transport=self._transport
            ) as client:
                response = client.post("/predict", files={"file": ("image", image, content_type)})
        except httpx2.TimeoutException as exc:
            raise AppError(504, "inference_timeout", "The model took too long to answer.") from exc
        except httpx2.TransportError as exc:
            raise AppError(
                503, "inference_unavailable", "The model service is unavailable."
            ) from exc

        if response.status_code != 200:
            logger.warning("inference_error", extra={"upstream_status": response.status_code})
            raise AppError(502, "inference_error", "The model service returned an error.")
        try:
            return InferencePrediction.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            raise AppError(502, "inference_error", "The model service returned an error.") from exc
```

`app/services/analyses.py`:

```python
"""Business logic for analysing one garment photo."""

import logging
import uuid

from app.clients.inference import InferenceClient
from app.repositories.images import ImageStore
from app.schemas.analyses import AnalysisResponse, ModelInfo
from app.services.images import strip_metadata, validate_upload

logger = logging.getLogger(__name__)


def analyse_image(
    data: bytes, *, max_bytes: int, store: ImageStore, inference: InferenceClient
) -> AnalysisResponse:
    content_type = validate_upload(data, max_bytes)
    clean = strip_metadata(data, content_type)
    image_id = uuid.uuid4().hex  # never the user's filename
    store.save(image_id, clean, content_type)
    prediction = inference.predict(clean, content_type)
    logger.info(
        "analysis_completed",
        extra={
            "image_id": image_id,
            "model_id": prediction.model_id,
            "model_revision": prediction.model_revision,
        },
    )
    return AnalysisResponse(
        image_id=image_id,
        attributes=prediction.attributes,
        model=ModelInfo(id=prediction.model_id, revision=prediction.model_revision),
    )
```

`app/api/analyses.py`:

```python
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile

from app.clients.inference import HttpInferenceClient, InferenceClient
from app.core.config import Settings, get_settings
from app.repositories.images import ImageStore, LocalImageStore
from app.schemas.analyses import AnalysisResponse
from app.schemas.errors import ErrorResponse
from app.services.analyses import analyse_image

router = APIRouter(tags=["analyses"])


def get_image_store(settings: Annotated[Settings, Depends(get_settings)]) -> ImageStore:
    return LocalImageStore(settings.upload_dir)


def get_inference_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> InferenceClient:
    return HttpInferenceClient(settings.inference_url, settings.inference_timeout_seconds)


_ERRORS: dict[int | str, dict[str, Any]] = {
    413: {"model": ErrorResponse, "description": "`image_too_large`"},
    415: {"model": ErrorResponse, "description": "`unsupported_media_type`"},
    502: {"model": ErrorResponse, "description": "`inference_error`"},
    503: {"model": ErrorResponse, "description": "`inference_unavailable`"},
    504: {"model": ErrorResponse, "description": "`inference_timeout`"},
}


@router.post("/analyses", summary="Analyse a garment photo", responses=_ERRORS)
def create_analysis(
    file: Annotated[UploadFile, File(description="A garment photo: JPEG, PNG or WebP.")],
    settings: Annotated[Settings, Depends(get_settings)],
    store: Annotated[ImageStore, Depends(get_image_store)],
    inference: Annotated[InferenceClient, Depends(get_inference_client)],
) -> AnalysisResponse:
    """Validates the photo, removes its metadata, stores it and returns the extracted attributes.

    422 covers `validation_error` (no file), `empty_file` and `invalid_image`.
    """
    # Read at most one byte more than the limit, so an oversized upload is never fully read.
    data = file.file.read(settings.max_upload_bytes + 1)
    return analyse_image(
        data, max_bytes=settings.max_upload_bytes, store=store, inference=inference
    )
```

Register it in `app/main.py` (`from app.api import analyses, health` and
`app.include_router(analyses.router)`), bump `__version__` in `app/__init__.py` to `0.2.0` (an
additive change, so a minor bump), then regenerate the contract: `uv run python -m app.contract`.

`tests/test_analyses.py`: fakes at the boundaries, every error code covered. There's also
`tests/test_images.py`, with unit tests for the magic bytes, each validation code, EXIF removal and
orientation, and a corrupt image.

```python
"""POST /analyses with fakes at the boundaries: no real inference service, no disk."""

from collections.abc import Callable
from io import BytesIO

import httpx2
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.api.analyses import get_image_store, get_inference_client
from app.clients.inference import HttpInferenceClient, InferencePrediction
from app.core.errors import AppError
from app.schemas.analyses import GarmentAttributes

PREDICTION = InferencePrediction(
    attributes=GarmentAttributes(category="shirt", colour="red", pattern=None, material=None),
    model_id="fake",
    model_revision="v1",
)


def png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), (200, 30, 30)).save(buffer, format="PNG")
    return buffer.getvalue()


class MemoryStore:
    def __init__(self) -> None:
        self.saved: dict[str, tuple[bytes, str]] = {}

    def save(self, image_id: str, data: bytes, content_type: str) -> None:
        self.saved[image_id] = (data, content_type)


class FakeInference:
    def __init__(self, error: AppError | None = None) -> None:
        self.error = error
        self.calls = 0

    def predict(self, image: bytes, content_type: str) -> InferencePrediction:
        self.calls += 1
        if self.error:
            raise self.error
        return PREDICTION


@pytest.fixture
def store(app: FastAPI) -> MemoryStore:
    memory = MemoryStore()
    app.dependency_overrides[get_image_store] = lambda: memory
    return memory


def use_inference(app: FastAPI, inference: FakeInference) -> None:
    app.dependency_overrides[get_inference_client] = lambda: inference


def upload(client: TestClient, data: bytes, name: str = "shirt.png") -> httpx2.Response:
    return client.post("/analyses", files={"file": (name, data, "image/png")})


def test_analyses_stores_the_photo_and_returns_attributes(
    app: FastAPI, client: TestClient, store: MemoryStore
) -> None:
    use_inference(app, FakeInference())

    response = upload(client, png())

    assert response.status_code == 200
    body = response.json()
    assert body["attributes"] == {
        "category": "shirt",
        "colour": "red",
        "pattern": None,
        "material": None,
    }
    assert body["model"] == {"id": "fake", "revision": "v1"}
    assert list(store.saved) == [body["image_id"]]
    assert store.saved[body["image_id"]][1] == "image/png"


def test_unsupported_file_is_rejected_before_inference(
    app: FastAPI, client: TestClient, store: MemoryStore
) -> None:
    inference = FakeInference()
    use_inference(app, inference)

    response = upload(client, b"%PDF-1.7 not an image", name="shirt.png")

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"
    assert inference.calls == 0
    assert store.saved == {}


def test_missing_file_is_a_validation_error(client: TestClient) -> None:
    response = client.post("/analyses")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(
    ("status", "code"),
    [(503, "inference_unavailable"), (504, "inference_timeout"), (502, "inference_error")],
)
def test_inference_failures_use_the_error_envelope(
    app: FastAPI, client: TestClient, store: MemoryStore, status: int, code: str
) -> None:
    use_inference(app, FakeInference(error=AppError(status, code, "message")))

    response = upload(client, png())

    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert response.json()["error"]["request_id"] == response.headers["X-Request-ID"]


def client_with(handler: Callable[[httpx2.Request], httpx2.Response]) -> HttpInferenceClient:
    return HttpInferenceClient("http://inference", 1.0, transport=httpx2.MockTransport(handler))


def test_http_client_parses_a_prediction() -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        assert request.url.path == "/predict"
        return httpx2.Response(200, json=PREDICTION.model_dump())

    assert client_with(handler).predict(png(), "image/png") == PREDICTION


def test_http_client_maps_a_timeout_to_504() -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ReadTimeout("slow", request=request)

    with pytest.raises(AppError) as excinfo:
        client_with(handler).predict(png(), "image/png")

    assert (excinfo.value.status_code, excinfo.value.code) == (504, "inference_timeout")


def test_http_client_maps_an_upstream_error_to_502() -> None:
    with pytest.raises(AppError) as excinfo:
        client_with(lambda _: httpx2.Response(500)).predict(png(), "image/png")

    assert excinfo.value.code == "inference_error"
```

Real requests against the running services:

```
$ curl -i -F "file=@red-shirt.png" http://localhost:8000/analyses
HTTP/1.1 200 OK
content-type: application/json
x-request-id: f397e9a4cb4f456b984bc6dc198fa70c

{"image_id":"a67a5792ab0440bcbbfa526749f04dc7","attributes":{"category":null,"colour":"red","pattern":null,"material":null},"model":{"id":"fake","revision":"v1"}}

$ curl -F "file=@notes.txt" http://localhost:8000/analyses
{"error":{"code":"unsupported_media_type","message":"Only JPEG, PNG and WebP images are supported.","request_id":"04c84a51ea5a434ea9bd2e4ed01bb540"}}

$ # with the inference service stopped:
$ curl -i -F "file=@red-shirt.png" http://localhost:8000/analyses
HTTP/1.1 503 Service Unavailable
{"error":{"code":"inference_unavailable","message":"The model service is unavailable.","request_id":"9eceb6e7705c440e9adf9f1024746834"}}
```

The API log shows one JSON line per event, with the request id on each. There are no image bytes and
no filenames:

```
{"severity": "INFO", "message": "analysis_completed", "logger": "app.services.analyses", ..., "request_id": "6c07…", "image_id": "116a…", "model_id": "fake", "model_revision": "v1"}
```

### Question 4: Inference is down

**Answer: b).** It's an *expected* failure of a dependency, so it gets its own status and stable
code. The frontend can then say "try again later" instead of "something broke", and logs and alerts
can tell "our bug" (500) apart from "the model service is down" (503). Option c) is the worst: an
empty success looks like the model abstaining, which silently corrupts results and evaluation.

### Question 5: Magic bytes and EXIF

**A good answer includes:**

- The file name and `Content-Type` come from the client and can say anything: renaming `invoice.pdf`
  to `shirt.png` changes both. The first bytes are the file's actual format. That protects the
  decoder, keeps garbage away from the GPU, and gives the user a clear 415.
- EXIF can contain the **GPS location** where the photo was taken, usually someone's home. If we
  stored the original, every copy, backup and log of it would carry that personal data. Stripping it
  *before* storage means the sensitive data never exists on our side. Removing it at display time
  would protect the browser but not our buckets.
- Applying the EXIF *orientation* before stripping keeps photos the right way up for the model.

---

### Milestone 4: The frontend

```bash
cd apps/web
npm run gen:api                                    # new types from openapi.json
npm install -D @testing-library/user-event
```

Added to `src/lib/api/client.ts` (plus
`export type AnalysisResponse = components['schemas']['AnalysisResponse']` with the other types):

```ts
/** Uploads one garment photo; the API validates, stores and analyses it. */
export function analyseImage(
  file: File,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const body = new FormData()
  body.append('file', file)
  // No Content-Type header: the browser sets multipart/form-data with its boundary.
  return request<AnalysisResponse>('/analyses', {
    method: 'POST',
    body,
    ...(signal ? { signal } : {}),
  })
}
```

`src/features/garment-analysis/useImageAnalysis.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  analyseImage,
  ApiError,
  type AnalysisResponse,
} from '../../lib/api/client.ts'

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'success'; data: AnalysisResponse }
  | { status: 'error'; message: string; requestId: string | null }

/** Sends one photo to the API. Aborts the request on unmount or when a new one starts. */
export function useImageAnalysis(): {
  state: AnalysisState
  analyse: (file: File) => void
} {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const analyse = useCallback((file: File) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ status: 'uploading' })
    analyseImage(file, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          requestId: error instanceof ApiError ? error.requestId : null,
        })
      })
  }, [])

  return { state, analyse }
}
```

`src/features/garment-analysis/GarmentAnalysis.tsx`, rendered in `App.tsx` under `<ApiStatus />`:

```tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useImageAnalysis, type AnalysisState } from './useImageAnalysis.ts'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export function GarmentAnalysis() {
  const { state, analyse } = useImageAnalysis()
  const [selected, setSelected] = useState<{ file: File; url: string } | null>(
    null,
  )
  const [problem, setProblem] = useState<string | null>(null)

  // An object URL keeps the image in memory until it is revoked: revoke it when
  // the selection changes or the component unmounts.
  useEffect(() => {
    if (!selected) return
    const { url } = selected
    return () => URL.revokeObjectURL(url)
  }, [selected])

  function select(file: File | null) {
    setSelected(file ? { file, url: URL.createObjectURL(file) } : null)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setProblem(null)
    if (file && !ACCEPTED_TYPES.includes(file.type)) {
      setProblem('Choose a JPEG, PNG or WebP image.')
      select(null)
    } else if (file && file.size > MAX_BYTES) {
      setProblem('Images must be 10 MB or less.')
      select(null)
    } else {
      select(file)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected && state.status !== 'uploading') analyse(selected.file)
  }

  return (
    <section aria-labelledby="garment-analysis-heading">
      <h2 id="garment-analysis-heading">Analyse a garment</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="garment-photo">Garment photo</label>{' '}
        <input
          id="garment-photo"
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={onFileChange}
        />{' '}
        <button
          type="submit"
          disabled={!selected || state.status === 'uploading'}
        >
          Analyse
        </button>
      </form>
      {problem && <p role="alert">{problem}</p>}
      {selected && (
        <img
          src={selected.url}
          alt="Preview of the selected garment"
          width={160}
        />
      )}
      <AnalysisResult state={state} />
    </section>
  )
}

function AnalysisResult({ state }: { state: AnalysisState }) {
  switch (state.status) {
    case 'idle':
      return null
    case 'uploading':
      return <p role="status">Analysing…</p>
    case 'error':
      return (
        <p role="alert">
          Analysis failed: {state.message}
          {state.requestId && ` (request ${state.requestId})`}
        </p>
      )
    case 'success': {
      const { attributes, model } = state.data
      return (
        <div role="status">
          <dl>
            <dt>Category</dt>
            <dd>{attributes.category ?? 'not visible'}</dd>
            <dt>Colour</dt>
            <dd>{attributes.colour ?? 'not visible'}</dd>
            <dt>Pattern</dt>
            <dd>{attributes.pattern ?? 'not visible'}</dd>
            <dt>Material</dt>
            <dd>{attributes.material ?? 'not visible'}</dd>
          </dl>
          <p>
            Model {model.id} · revision {model.revision}
          </p>
        </div>
      )
    }
  }
}
```

`src/features/garment-analysis/GarmentAnalysis.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GarmentAnalysis } from './GarmentAnalysis.tsx'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const shirt = new File([new Uint8Array([137, 80, 78, 71])], 'shirt.png', {
  type: 'image/png',
})

describe('GarmentAnalysis', () => {
  beforeEach(() => {
    // jsdom has no object URLs.
    URL.createObjectURL = vi.fn<typeof URL.createObjectURL>(
      () => 'blob:preview',
    )
    URL.revokeObjectURL = vi.fn<typeof URL.revokeObjectURL>()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads the photo and shows the extracted attributes', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        image_id: 'abc',
        attributes: {
          category: null,
          colour: 'red',
          pattern: null,
          material: null,
        },
        model: { id: 'fake', revision: 'v1' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<GarmentAnalysis />)

    await user.upload(screen.getByLabelText('Garment photo'), shirt)
    await user.click(screen.getByRole('button', { name: 'Analyse' }))

    expect(await screen.findByText('red')).toBeInTheDocument()
    expect(screen.getByText('Model fake · revision v1')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/analyses')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
  })

  it('shows the API error message and request id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'inference_unavailable',
              message: 'The model service is unavailable.',
              request_id: 'req-42',
            },
          },
          503,
        ),
      ),
    )
    const user = userEvent.setup()
    render(<GarmentAnalysis />)

    await user.upload(screen.getByLabelText('Garment photo'), shirt)
    await user.click(screen.getByRole('button', { name: 'Analyse' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Analysis failed: The model service is unavailable. (request req-42)',
    )
  })

  it('rejects a file that is not an image without calling the API', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ applyAccept: false })
    render(<GarmentAnalysis />)

    await user.upload(
      screen.getByLabelText('Garment photo'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a JPEG, PNG or WebP image.',
    )
    expect(screen.getByRole('button', { name: 'Analyse' })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

---

### Milestone 5: Your model

There's no reference model: choosing it is your call. Here are the model-agnostic parts.

**Choosing the predictor** (a sketch to adapt; not run, because it depends on your model):

```python
@lru_cache
def get_predictor() -> Predictor:
    settings = get_settings()
    if settings.model_id is None:
        return FakePredictor()          # tests, CI and `make test` never need weights
    if settings.model_revision is None:
        raise RuntimeError("INFERENCE_MODEL_REVISION must be an immutable revision, not empty")
    from app.vlm import VlmPredictor    # imported lazily: ML libraries are slow to import
    return VlmPredictor(settings.model_id, settings.model_revision)
```

**Parsing the reply** (tested in the reference): it works for any model that's asked to answer in
JSON:

```python
"""Turn a VLM's text reply into GarmentAttributes. Model-agnostic and unit-tested."""

import json

from app.predictor import GarmentAttributes

_FIELDS = ("category", "colour", "pattern", "material")
_ABSTAIN = {"", "unknown", "n/a", "none", "not visible"}


def parse_attributes(text: str) -> GarmentAttributes:
    """Read the first JSON object in ``text``. Anything unusable becomes ``None`` (abstain)."""
    start, end = text.find("{"), text.rfind("}")
    try:
        raw = json.loads(text[start : end + 1]) if 0 <= start < end else {}
    except json.JSONDecodeError:
        raw = {}
    if not isinstance(raw, dict):
        raw = {}

    def clean(field: str) -> str | None:
        value = raw.get(field)
        if not isinstance(value, str):
            return None
        normalised = " ".join(value.lower().split())
        return None if normalised in _ABSTAIN else normalised

    return GarmentAttributes(**{field: clean(field) for field in _FIELDS})
```

```python
import pytest

from app.parsing import parse_attributes
from app.predictor import GarmentAttributes

NOTHING = GarmentAttributes(category=None, colour=None, pattern=None, material=None)


def test_parses_json_wrapped_in_prose_and_normalises_values() -> None:
    reply = (
        'Sure! {"category": "Shirt", "colour": " Navy  Blue", "pattern": "plain"} Hope this helps.'
    )

    assert parse_attributes(reply) == GarmentAttributes(
        category="shirt", colour="navy blue", pattern="plain", material=None
    )


def test_unknown_values_become_abstentions() -> None:
    reply = '{"category": "dress", "colour": "red", "pattern": "", "material": "unknown"}'

    assert parse_attributes(reply).material is None
    assert parse_attributes(reply).pattern is None


@pytest.mark.parametrize(
    "reply",
    ["I can't see a garment.", '{"category": ', "[1, 2, 3]", '{"category": 42}'],
)
def test_malformed_replies_abstain_instead_of_crashing(reply: str) -> None:
    assert parse_attributes(reply) == NOTHING
```

**Scoring a handful of photos** with `packages/ai-evaluation`, for example from a script in
`experiments/`. This snippet was run while the course was written; its output is below:

```python
from ai_evaluation import score_attributes

predictions = [
    {"category": "shirt", "colour": "navy", "pattern": "plain", "material": "cotton"},
    {"category": "jeans", "colour": "blue", "pattern": None, "material": "denim"},
]
references = [  # what a careful human says; None = not determinable from the photo
    {"category": "shirt", "colour": "navy", "pattern": "plain", "material": None},
    {"category": "trousers", "colour": "blue", "pattern": "plain", "material": "denim"},
]
scores = score_attributes(predictions, references, fields=["category", "colour", "pattern", "material"])
for field, s in scores.items():
    print(f"{field:9} accuracy={s.accuracy} coverage={s.coverage} unsupported_rate={s.unsupported_rate}")
```

```
category  accuracy=0.5 coverage=1.0 unsupported_rate=None
colour    accuracy=1.0 coverage=1.0 unsupported_rate=None
pattern   accuracy=0.5 coverage=0.5 unsupported_rate=None
material  accuracy=1.0 coverage=1.0 unsupported_rate=1.0
```

`material` has `unsupported_rate=1.0`: the model claimed "cotton" where a human said the fabric
can't be seen. That's the hallucination signal this project tracks separately from accuracy.

**What your teammate will look for in review:** the revision is a SHA; the licence is noted; ML
dependencies are only in `services/inference`; there's no `trust_remote_code`; the prompt is a
versioned constant; parsing tests include malformed replies; the `@pytest.mark.model` test is skipped
by `make test`; and the `.env` holding your settings isn't committed.

### Question 6: A 90-second first request

**A good answer includes:**

- The API gives up after `API_INFERENCE_TIMEOUT_SECONDS` (60 s) and returns **504
  `inference_timeout`**. The browser shows "Analysis failed: The model took too long to answer.",
  with a request id. Meanwhile, inference keeps working and finishes for nobody. Requests after that
  are fast, because the model is now in memory.
- The 90 seconds is mostly **model loading** (the cached `get_predictor` loads on first use), plus
  downloading weights if they aren't cached yet.
- Ways to fix it:
  - **Load at startup:** call `get_predictor()` when the app starts (a FastAPI lifespan handler), so
    the first *request* doesn't pay for loading. On Cloud Run, a startup probe keeps traffic away
    until loading is done.
  - **Raise the timeout:** it hides the problem and keeps users waiting.
  - **Keep an instance warm** (`min_instances=1`): fast, but an always-on L4 costs roughly
    $770/month (cost reference).
  - **Go asynchronous** (upload now, poll for the result): the right answer if it stays slow, but
    the architecture overview says that needs measurements and an ADR.
- For Cloud Run: load at startup with a startup probe, measure the cold start, and only then decide
  on minimum instances or asynchronous processing.

---

### Milestone 6: Inference in a container (not verified: Docker wasn't available)

```bash
docker build -t inference services/inference
docker run --rm -p 8001:8080 inference          # the container listens on 8080; your laptop's 8001 maps to it

# API on your laptop as usual. Its default API_INFERENCE_URL is already http://localhost:8001
cd services/api && uv run uvicorn app.main:app --reload --port 8000
curl -F "file=@red-shirt.png" http://localhost:8000/analyses
```

Stretch, with both services in containers:

```bash
docker network create wardrobe
docker run --rm -d --name inference --network wardrobe inference
docker build -t api services/api
docker run --rm -p 8000:8080 --network wardrobe -e API_INFERENCE_URL=http://inference:8080 api
```

What to notice:

- The Dockerfile copies `pyproject.toml` and `uv.lock`, runs `uv sync --frozen`, then copies `app/`.
  Your new modules and dependencies are included automatically, and a lockfile that's out of date
  fails the build instead of silently installing something else.
- Inside the API container, `local-uploads/` disappears when the container stops. Cloud Run disks
  behave the same way, which is why deployed photos go to a bucket.
- The image has no weights. Weights are large, versioned separately and personal to the model
  release. In the cloud they come from the model registry bucket (or are baked in, if cold-start
  measurements say so, recorded in an ADR). Locally, you could mount your Hugging Face cache into
  the container instead of downloading again.
- On Apple Silicon you can run images built natively. Images for Cloud Run must be built with
  `--platform linux/amd64` (see the comment at the top of the Dockerfile).

### Question 7: Where do weights come from?

**Answer: b).** Weights never go in Git (a), `main` changes under you, so results can't be
reproduced (c), and a laptop isn't infrastructure (d). Whether to bake them into the image or download
them from the versioned registry at startup is a trade-off between image size, build time and cold
start. It's decided by measurement and recorded in an ADR (`services/inference/README.md`).

---

### Milestone 7: An example deployment plan

Yours can be organised differently. This one shows the level of detail to aim for.

```
 developer ──PR──▶ GitHub Actions: test every PR; on merge, build linux/amd64 images
                                 │ push api:<sha>, inference:<sha>
                                 ▼
                         Artifact Registry ──deploy (human-approved)──▶ both Cloud Run services

 browser ──HTTPS──▶ frontend hosting (an open decision)
    │
    └── POST /analyses ──▶ ┌──────────────────────────────────┐
                           │ Cloud Run: api                   │
                           │ CPU · scale to zero              │
                           │ SA: write uploads, call inference│
                           └──────┬────────────────┬──────────┘
              photo, EXIF removed │                │ POST /predict (with timeout)
                                  ▼                ▼
                 GCS: uploads bucket       ┌──────────────────────────────┐
                 private · lifecycle rule  │ Cloud Run: inference         │
                                           │ L4 GPU · min 0 · max capped  │
                                           │ SA: read model registry      │
                                           └──────────────┬───────────────┘
                                                          │ weights at startup
                                                          ▼
                                           GCS: model registry (versioned)

 Pulumi (infrastructure/) defines every box; a human runs `pulumi preview`, then `pulumi up`.
```

1. **What runs where:** the API on CPU Cloud Run (cheap, scales to zero); inference on Cloud Run with
   an L4 GPU (scale to zero in dev, maximum instances capped); photos in a private uploads bucket;
   weights in the versioned model registry bucket; images in Artifact Registry. The region must
   offer L4 (for example `europe-west1` or `europe-west4`; London isn't listed).
2. **Code:** on each pull request, GitHub Actions runs `make check`. On merge to `main`, it builds both
   images for `linux/amd64` with `--build-arg BUILD_SHA=<git sha>` and pushes them. `/health` then
   reports which commit is running.
3. **Infrastructure:** Pulumi (Python) in `infrastructure/`. A human runs `pulumi preview`, reads it
   with the other developer, then runs `pulumi up -s dev`. The coding agent never runs Pulumi. Prod
   is changed only by a human, after review.
4. **Laptop compared with the cloud:** `API_INFERENCE_URL` (localhost:8001 becomes the inference
   service's URL); storage (a local folder becomes a GCS bucket, through the same `ImageStore`
   interface); `API_CORS_ORIGINS` (or a shared domain); `INFERENCE_MODEL_ID` and
   `INFERENCE_MODEL_REVISION` point to a registry version; `API_ENVIRONMENT=dev`.
5. **Permissions:** the API's service account can write to the uploads bucket and invoke the
   inference service. Inference's account can read the model registry. Neither has Owner or Editor,
   and neither uses keys (Workload Identity).
6. **Cost at idle:** close to zero if both services scale to zero (plus pennies for storage and
   images). One minimum GPU instance costs about $770/month, so in dev: scale to zero, and accept the
   cold starts.
7. **A prompt change:** *development:* edit the versioned prompt constant, run the parsing tests and
   an evaluation against the baseline, then open a PR. *Deployment:* merge, CI builds a new inference
   image, and the human-approved deploy rolls it out. *Runtime:* new instances load the new prompt.
   The response's model identity (and the prompt version, once you add it) shows which version produced it.

### Question 8: Development, deployment and runtime for a prompt change

**A good answer includes:**

- **Development** (laptop or Colab): change the prompt, which lives in code as a versioned constant.
  Measure it against the baseline on the evaluation set with `ai-evaluation`. Write up the result,
  then review the PR.
- **Deployment** (CI/CD): the merge triggers tests, an image build tagged with the commit, a push to
  Artifact Registry, and an approved rollout to Cloud Run. Nothing changes for users until this
  step.
- **Runtime** (in the cloud): instances start from the new image, load the model and serve requests
  with the new prompt. Logs and responses carry the versions, so every result can be traced back.
- Mixing up the phases is what causes "it worked on my laptop": the evaluation must describe exactly
  what will run.

---

### Optional extension: notes

- Start with the CPU-only, `FakePredictor` version: it exercises building, the registry, Cloud Run,
  IAM and buckets without any GPU cost.
- Cloud Run's disk doesn't last, so uploads must go to the bucket (a `GcsImageStore` that implements
  the same `ImageStore` interface).
- Before anything is created: a cost estimate in writing, a budget alert, and a teardown plan.

### Question 9: The whole journey

**A good answer covers:**

1. **Browser:** checks type and size early (fast feedback, no wasted upload), shows a preview, and
   blocks double submits. *Skipping it:* slow, confusing errors.
2. **Vite proxy** (locally): makes `/api` same-origin. *Skipping it:* CORS errors.
3. **API, validation:** magic bytes and size limit. *Skipping it:* crashes or abuse, and garbage
   reaching the GPU.
4. **API, EXIF stripping:** removes GPS and other metadata. *Skipping it:* storing people's home
   locations.
5. **API, storage:** a random id in a private store. *Skipping it:* guessable paths, or users'
   filenames (which can be personal) leaking.
6. **API → inference, with a timeout:** *skipping the timeout:* requests hang forever on a cold GPU.
7. **Inference:** preprocessing identical to the notebook, the model behind `Predictor`, defensive
   parsing. *Skipping these:* "worse in production" bugs, and crashes on odd replies.
8. **Back through the API:** the response includes the model id and revision. *Skipping it:*
   results that can't be traced to a model version.
9. **Browser:** renders success, abstentions ("not visible") and errors with a request id. *Skipping
   it:* users and developers can't report or debug problems.
