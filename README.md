# Customer Support Intelligence Platform (CSIP)

A full-stack customer support platform that combines ticket management, AI-powered ticket analysis, retrieval-augmented generation (RAG), and event-driven processing to help support teams manage and investigate customer issues.

## Key Features

- **Ticket Management:** Create, update, search, filter, and paginate support tickets.
- **AI-Powered Analysis:** Classify tickets by category and priority, detect customer sentiment, and generate suggested responses.
- **RAG Knowledge Retrieval:** Retrieve relevant troubleshooting guides and policies to ground AI-generated responses in internal documentation.
- **Event-Driven Processing:** Use Apache Kafka to process ticket events asynchronously.
- **Resilient AI Processing:** Implement Kafka retries, a dead-letter topic (DLT), and manual AI analysis recovery.
- **Agent Assignment:** Assign tickets to support agents and maintain assignment history.
- **Activity Auditing:** Track ticket lifecycle changes and AI-related events.
- **Interactive Dashboard:** View tickets, AI results, knowledge sources, assignment history, and activity logs.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Java 21, Spring Boot 3.5.6 |
| Database | PostgreSQL 16 |
| Messaging | Apache Kafka |
| AI Service | Python, FastAPI, OpenAI |
| Retrieval | ChromaDB, RAG |
| Infrastructure | Docker, Docker Compose |
| Testing and CI | JUnit, MockMvc, Pytest, GitHub Actions |

## Architecture

1. The dashboard sends requests to the Spring Boot backend.
2. The backend persists customers, tickets, assignments, and activity records in PostgreSQL.
3. Ticket events are published to Kafka for asynchronous processing.
4. The Python AI service retrieves relevant knowledge-base content and generates ticket analysis.
5. Failed event processing can be retried, routed to a dead-letter topic, and recovered through manual AI retry.
6. The dashboard displays ticket information, AI recommendations, and relevant knowledge sources.

## Running Locally

### Prerequisites

- Docker Desktop
- Git

### Start the application

Clone the repository and navigate to the project directory.

Build the Spring Boot backend JAR:

```powershell
cd support
.\mvnw.cmd clean package -DskipTests
cd ..
```

Start the complete application stack:

```bash
docker compose up -d --build
```

Configure `OPENAI_API_KEY` in your local environment before starting the AI service. Never commit API keys or secret files.

### Access the services

- Dashboard: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- AI service health: [http://localhost:8000/health](http://localhost:8000/health)

## API Overview

### Customers

- `POST /api/customers` - Create a customer
- `GET /api/customers` - List customers
- `GET /api/customers/{id}` - Get a customer

### Agents

- `POST /api/agents` - Create an agent
- `GET /api/agents` - List agents

### Tickets

- `POST /api/tickets` - Create a ticket
- `GET /api/tickets` - List and filter tickets
- `GET /api/tickets/{id}` - Get ticket details
- `POST /api/tickets/{id}/retry-ai` - Retry AI analysis

## Automated Tests

The project currently has **40 automated tests across the backend and AI service**:

- Backend: 28 tests
- AI service: 12 tests

Both backend and AI service test jobs pass in GitHub Actions.

## Engineering Highlights

- Asynchronous event-driven processing with Kafka.
- Retry and dead-letter handling for failed ticket events.
- RAG-based knowledge retrieval for AI-assisted support.
- Persistent audit history for ticket activities and agent assignments.
- Containerized services and automated CI checks.

## Project Status

Core ticket management, AI analysis, RAG-based knowledge retrieval, Kafka event processing with retry/DLT handling, agent assignment, activity auditing, and the interactive dashboard are implemented and tested. The application runs locally as a Docker Compose stack.

## License

No license has been specified yet.