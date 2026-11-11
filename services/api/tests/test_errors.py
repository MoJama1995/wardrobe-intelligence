"""Every failure mode must produce the same ErrorResponse envelope with a request ID."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import AppError


def _add_failing_routes(app: FastAPI) -> None:
    @app.get("/_test/items/{item_id}")
    def get_item(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    @app.get("/_test/app-error")
    def raise_app_error() -> None:
        raise AppError(415, "unsupported_media_type", "Only JPEG and PNG images are supported.")

    @app.get("/_test/bug")
    def raise_bug() -> None:
        raise RuntimeError("secret internal detail")


def _client(app: FastAPI) -> TestClient:
    _add_failing_routes(app)
    return TestClient(app)


def test_unknown_route_returns_not_found_envelope(client: TestClient) -> None:
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["request_id"] == response.headers["X-Request-ID"]


def test_validation_error_lists_fields_without_echoing_input(app: FastAPI) -> None:
    response = _client(app).get("/_test/items/not-a-number")

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["loc"] == ["path", "item_id"]
    assert "not-a-number" not in response.text


def test_app_error_maps_to_its_status_and_code(app: FastAPI) -> None:
    response = _client(app).get("/_test/app-error")

    assert response.status_code == 415
    assert response.json()["error"] == {
        "code": "unsupported_media_type",
        "message": "Only JPEG and PNG images are supported.",
        "request_id": response.headers["X-Request-ID"],
    }


def test_unexpected_exception_returns_generic_500_without_leaking_details(app: FastAPI) -> None:
    response = _client(app).get("/_test/bug")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "secret internal detail" not in response.text
    assert response.headers["X-Request-ID"]
