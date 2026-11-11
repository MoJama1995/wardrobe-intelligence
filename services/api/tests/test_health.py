from fastapi.testclient import TestClient


def test_health_reports_environment_and_build(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "api",
        "environment": "test",
        "build": "test-sha",
    }


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get("/health")

    assert len(response.headers["X-Request-ID"]) == 32


def test_a_sane_inbound_request_id_is_propagated(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "from-frontend-123"})

    assert response.headers["X-Request-ID"] == "from-frontend-123"


def test_an_oversized_inbound_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "x" * 500})

    assert response.headers["X-Request-ID"] != "x" * 500
