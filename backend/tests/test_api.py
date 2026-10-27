def test_health(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_available"] is True
    assert body["dataset"] == {
        "source": "synthetic",
        "seed": 42,
        "rows": 600,
        "accounts": 5,
        "start": "2026-01-19",
        "end": "2026-05-18",
    }
    assert body["database"] in {"sqlite", "postgresql"}
    assert body["version"]


def test_cors_allows_local_frontend(client) -> None:
    response = client.options(
        "/api/accounts",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_rejects_unknown_origin(client) -> None:
    response = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers
