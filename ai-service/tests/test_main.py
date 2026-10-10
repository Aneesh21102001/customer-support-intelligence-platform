from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient

from app import main

import os

os.environ.setdefault("OPENAI_API_KEY", "test-api-key")


client = TestClient(main.app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-service",
    }


def test_analyze_ticket_returns_analysis():
    fake_rag_results = {
        "documents": [["Use the password reset link."]],
        "metadatas": [[{"source": "account-access.md"}]],
        "distances": [[0.4]],
    }

    fake_openai_response = MagicMock()
    fake_openai_response.output_text = (
        '{"category":"ACCOUNT",'
        '"priority":"HIGH",'
        '"sentiment":"FRUSTRATED",'
        '"suggested_response":"Please use the password reset link."}'
    )

    with (
        patch.object(main, "get_rag_results", return_value=fake_rag_results),
        patch.object(main, "build_rag_context", return_value="Password reset guidance"),
        patch.object(main, "get_knowledge_sources", return_value=["account-access.md"]),
        patch.object(main.client.responses, "create", return_value=fake_openai_response),
    ):
        response = client.post(
            "/analyze-ticket",
            json={
                "subject": "Cannot log in",
                "description": "I need help resetting my password.",
            },
        )

    assert response.status_code == 200

    data = response.json()
    assert data["category"] == "ACCOUNT"
    assert data["priority"] == "HIGH"
    assert data["sentiment"] == "FRUSTRATED"
    assert data["suggested_response"] == "Please use the password reset link."
    assert data["sources"] == ["account-access.md"]


def test_analyze_ticket_requires_subject_and_description():
    response = client.post(
        "/analyze-ticket",
        json={"subject": "Cannot log in"},
    )

    assert response.status_code == 422
