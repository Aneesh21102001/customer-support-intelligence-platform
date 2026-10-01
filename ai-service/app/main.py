import os
import json
from fastapi import FastAPI
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from app.rag import build_rag_context, get_knowledge_sources

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Customer Support AI Service",
    version="1.0.0"
)

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

@app.post("/analyze-ticket", response_model=TicketAnalysis)
def analyze_ticket(ticket: TicketRequest):

    context = build_rag_context(
        f"{ticket.subject}\n{ticket.description}"
    )

    sources = get_knowledge_sources(
        f"{ticket.subject}\n{ticket.description}"
    )

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
- suggested_response must be a professional customer-facing response based only on the provided knowledge base and ticket information
- Do not invent policies, timelines, or procedures that are not supported by the knowledge base
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
        suggested_response=result["suggested_response"],
        sources=sources
    )