import os
import json
from fastapi import FastAPI
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service"
    }


@app.post("/analyze-ticket", response_model=TicketAnalysis)
def analyze_ticket(ticket: TicketRequest):

    prompt = f"""
Analyze this customer support ticket.

Subject:
{ticket.subject}

Description:
{ticket.description}

Return ONLY valid JSON in exactly this format:

{{
  "category": "BILLING",
  "priority": "HIGH",
  "sentiment": "FRUSTRATED"
}}

Rules:
- category must be one of BILLING, ACCOUNT, NOTIFICATIONS, TECHNICAL, GENERAL
- priority must be one of LOW, MEDIUM, HIGH, URGENT
- sentiment must be one of POSITIVE, NEUTRAL, FRUSTRATED, ANGRY
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
        sentiment=result["sentiment"]
    )