import os
import json
from fastapi import FastAPI
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from app.rag import (
    ingest_documents,
    get_rag_results,
    build_rag_context,
    get_knowledge_sources
)

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Customer Support AI Service",
    version="1.0.0"
)

ingest_documents()

class TicketRequest(BaseModel):
    subject: str
    description: str

class TicketAnalysis(BaseModel):
    category: str
    priority: str
    sentiment: str
    suggested_response: str
    sources: list[str]

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service"
    }


def enforce_payment_safety(subject: str, description: str, suggested_response: str) -> str:
    ticket_text = f"{subject}\n{description}".lower()

    reports_deduction = any(
        phrase in ticket_text
        for phrase in [
            "money was deducted",
            "payment was deducted",
            "amount was deducted",
            "amount deducted",
            "money deducted",
            "charged my account",
            "charged my bank account",
            "debited from my account",
            "deducted from my bank account",
        ]
    )

    order_unconfirmed = any(
        phrase in ticket_text
        for phrase in [
            "order pending",
            "payment pending",
            "order not confirmed",
            "order unconfirmed",
            "no order confirmation",
            "not received an order confirmation",
        ]
    )

    if reports_deduction and order_unconfirmed:
        return (
            "I'm sorry for the inconvenience. I understand that the payment "
            "was deducted from your bank account, but your order is still "
            "showing as pending and you haven't received a confirmation email. "
            "The payment and order status need to be verified before we can "
            "confirm the outcome. Please avoid making another payment while "
            "this transaction is being checked. We cannot confirm whether a "
            "refund is due until the payment and order status are established."
        )

    return suggested_response

@app.post("/analyze-ticket", response_model=TicketAnalysis)
def analyze_ticket(ticket: TicketRequest):

    query = f"{ticket.subject}\n{ticket.description}"

    rag_results = get_rag_results(query)

    context = build_rag_context(rag_results)

    sources = get_knowledge_sources(rag_results)

    prompt = f"""
You are a customer support AI assistant.

Use the knowledge base below to help analyze the customer ticket.

KNOWLEDGE BASE:
{context}

CUSTOMER TICKET:

Subject:
{ticket.subject}

Description:
{ticket.description}

Return ONLY valid JSON in exactly this format:

{{
  "category": "BILLING",
  "priority": "HIGH",
  "sentiment": "FRUSTRATED",
  "suggested_response": "A helpful response to the customer based only on the knowledge base."
}}

Rules:
- category must be one of BILLING, ACCOUNT, NOTIFICATIONS, TECHNICAL, GENERAL
- priority must be one of LOW, MEDIUM, HIGH, URGENT
- sentiment must be one of POSITIVE, NEUTRAL, FRUSTRATED, ANGRY
- suggested_response must be a professional, empathetic, customer-facing response grounded in the provided knowledge base and ticket information
- Acknowledge the customer's specific problem and any important details they have already provided. Do not ask them to repeat information already present in the ticket.
- For payments reported as deducted while an order remains pending or unconfirmed, acknowledge the reported deduction and explain that the payment and order status need to be verified before determining the outcome.
- CRITICAL PAYMENT SAFETY RULE: If the customer says money was deducted but the order is pending or unconfirmed, NEVER recommend retrying the payment, checking card funds, or re-entering card details. This restriction takes precedence over any generic troubleshooting advice in the knowledge base.
- Instead, acknowledge the reported deduction and explain that the existing transaction and order status must be checked first. Do not claim that verification has happened, because this AI service has not actually checked the payment provider or order system.
- Do not claim that a payment succeeded, failed, or will be refunded unless that conclusion is supported by the available information and knowledge base.
- If the knowledge base does not specify a resolution, refund policy, or timeline, do not invent one. Explain what remains unconfirmed and offer an appropriate next step without promising an outcome.
- Use retrieved knowledge-base content when relevant, but do not force unrelated troubleshooting instructions into the response.
- Return only valid JSON matching the requested format, without Markdown fences or additional text.
"""

    response = client.responses.create(
        model="gpt-5.4-mini",
        input=prompt
    )

    result = response.output_text

    print("AI response:", result)

    result = json.loads(result)

    return TicketAnalysis(
        category=result["category"],
        priority=result["priority"],
        sentiment=result["sentiment"],
        suggested_response=enforce_payment_safety(
            ticket.subject,
            ticket.description,
            result["suggested_response"]
        ),
        sources=sources
    )