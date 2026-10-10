import os
from unittest.mock import patch, MagicMock

os.environ.setdefault("OPENAI_API_KEY", "test-api-key")

from fastapi.testclient import TestClient

from app import main

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

def test_payment_safety_blocks_retry_when_money_was_deducted():
    response = main.enforce_payment_safety(
        subject="Payment deducted but order not confirmed",
        description=(
            "The payment was deducted from my bank account, "
            "but the order page still shows payment pending. "
            "I have not received an order confirmation email."
        ),
        suggested_response="Please retry the payment after a few minutes.",
    )

    assert "avoid making another payment" in response.lower()
    assert "payment and order status need to be verified" in response.lower()
    assert "retry the payment" not in response.lower()
    assert "cannot confirm whether a refund is due" in response.lower()

def test_payment_safety_preserves_normal_failed_payment_response():
    original_response = "Please retry the payment after checking the billing address."

    response = main.enforce_payment_safety(
        subject="Payment failed",
        description="My checkout payment failed. Please help me resolve the issue.",
        suggested_response=original_response,
    )

    assert response == original_response

def test_payment_safety_does_not_promise_a_refund():
    response = main.enforce_payment_safety(
        subject="Payment deducted but order not confirmed",
        description=(
            "The payment was deducted from my bank account, "
            "but the order still shows payment pending."
        ),
        suggested_response="Your refund is guaranteed.",
    )

    assert "refund is guaranteed" not in response.lower()
    assert "cannot confirm whether a refund is due" in response.lower()