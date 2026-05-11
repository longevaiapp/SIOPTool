from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="LongevAI SIOP Tool API",
    description="AIaaS HealthTech Factory OS — Juntify Platform",
    version="0.1.0",
)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3002,https://siop.juntify.com",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


from routers import (  # noqa: E402
    action_items,
    analytics,
    approvals,
    audit_log,
    auth,
    capacity,
    change_orders,
    clients,
    compose,
    contracts,
    copilot,
    deals,
    documents,
    insights,
    invoices,
    meetings,
    messages,
    notifications,
    portal,
    programs,
    projects,
    proposals,
    quotes,
    rfq_sessions,
    risk_compliance,
    siop_engine,
    siop_scenarios,
    sprints,
    suppliers,
    support_tickets,
    system,
    tasks,
    timesheets,
)

app.include_router(clients.router)
app.include_router(deals.router)
app.include_router(contracts.router)
app.include_router(projects.router)
app.include_router(sprints.router)
app.include_router(tasks.router)
app.include_router(meetings.router)
app.include_router(action_items.router)
app.include_router(rfq_sessions.router)
app.include_router(suppliers.router)
app.include_router(invoices.router)
app.include_router(approvals.router)
app.include_router(messages.router)
app.include_router(support_tickets.router)
app.include_router(system.router)
app.include_router(programs.router)
app.include_router(insights.router)
app.include_router(siop_scenarios.router)
app.include_router(capacity.role_capacity_router)
app.include_router(capacity.demand_forecast_router)
app.include_router(risk_compliance.risks_router)
app.include_router(risk_compliance.compliance_router)
app.include_router(documents.router)
app.include_router(quotes.router)
app.include_router(proposals.router)
app.include_router(change_orders.router)
app.include_router(copilot.router)
app.include_router(audit_log.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(siop_engine.router)
app.include_router(timesheets.ops_router)
app.include_router(timesheets.crud_router)
app.include_router(portal.router)
app.include_router(auth.router)
app.include_router(compose.router)
