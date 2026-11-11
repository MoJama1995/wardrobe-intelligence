from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app


def test_health_reports_the_configured_model_identity() -> None:
    settings = Settings(
        environment="test",
        model_id="org/model",
        model_revision="0123abcd",
        build_sha="test-sha",
        _env_file=None,
    )
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "inference",
        "model_id": "org/model",
        "model_revision": "0123abcd",
        "model_loaded": False,
        "build": "test-sha",
    }
