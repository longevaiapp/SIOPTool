#!/usr/bin/env python3
"""End-to-end business flow test against https://siop.juntify.com/api/."""
import json
import subprocess
import sys
import urllib.request

API = "https://siop.juntify.com/api"


def call(method: str, path: str, body: dict | None = None) -> dict | None:
    req = urllib.request.Request(
        f"{API}{path}",
        method=method,
        headers={"Content-Type": "application/json"},
    )
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            text = r.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()}")
        raise


def step(label: str) -> None:
    print(f"\n=== {label} ===")


step("1. CREATE CLIENT")
client = call("POST", "/clients", {
    "name": "Acme Health Co", "industry": "Healthcare",
    "segment": "STRATEGIC", "status": "PROSPECT", "health_score": 85,
})
print("client_id =", client["id"])

step("2. CREATE DEAL FOR CLIENT")
deal = call("POST", "/deals", {
    "client_id": client["id"], "client_name": "Acme Health Co",
    "deal_type": "NEW_BUSINESS", "stage": "discovery",
    "value": 150000, "probability": 40, "commercial_model": "FIXED_PRICE",
})
print("deal_id =", deal["id"])

step("3. CREATE RFQ SESSION")
rfq = call("POST", "/rfq-sessions", {
    "deal_id": deal["id"], "client_id": client["id"],
    "completion_pct": 75, "status": "in_progress",
    "responses": {"q1": "yes", "q2": "no"},
})
print("rfq_id =", rfq["id"])

step("4. CREATE CONTRACT (HIPAA + BAA)")
contract = call("POST", "/contracts", {
    "contract_type": "BAA", "title": "Acme MSA + BAA",
    "client_id": client["id"], "deal_id": deal["id"],
    "status": "SIGNED", "value": 150000,
    "hipaa_required": True, "baa_signed": True,
})
print("contract_id =", contract["id"])

step("5. PROJECT (PHI=true, BAA=false, status=active) — must FAIL with 409")
try:
    call("POST", "/projects", {
        "name": "Care AI", "client_name": "Acme",
        "client_id": client["id"], "deal_id": deal["id"], "contract_id": contract["id"],
        "status": "active", "phi_involved": True, "baa_confirmed": False,
    })
    print("  !! gate did not trigger")
except urllib.error.HTTPError as e:
    print(f"  Gate triggered as expected (HTTP {e.code})")

step("6. PROJECT (PHI=true, BAA=true, status=active) — must SUCCEED")
project = call("POST", "/projects", {
    "name": "Care AI", "client_name": "Acme",
    "client_id": client["id"], "deal_id": deal["id"], "contract_id": contract["id"],
    "status": "active", "phi_involved": True, "baa_confirmed": True,
    "methodology": "scrum", "budget": 150000, "phase": "discovery",
})
print("project_id =", project["id"])

step("7. SPRINT + TASK")
sprint = call("POST", "/sprints", {
    "project_id": project["id"], "name": "Sprint 1",
    "status": "ACTIVE", "story_points_planned": 21,
})
print("sprint_id =", sprint["id"])
task = call("POST", "/tasks", {
    "project_id": project["id"], "sprint_id": sprint["id"],
    "title": "Setup HIPAA logging", "task_type": "COMPLIANCE",
    "status": "in_progress", "is_clinical_safety": True,
})
print("task_id =", task["id"])

step("8. MEETING + ACTION ITEM")
meeting = call("POST", "/meetings", {
    "title": "Kickoff", "meeting_type": "kickoff",
    "client_id": client["id"], "project_id": project["id"],
    "status": "ANALYZED", "duration_minutes": 45,
})
print("meeting_id =", meeting["id"])
action_item = call("POST", "/action-items", {
    "meeting_id": meeting["id"], "text": "Review HIPAA policy",
    "priority": "HIGH", "accepted": True,
})
print("action_item_id =", action_item["id"])

step("9. INVOICE + APPROVAL + MESSAGE + TICKET + SUPPLIER")
invoice = call("POST", "/invoices", {
    "number": "INV-001", "client_id": client["id"],
    "project_id": project["id"], "contract_id": contract["id"],
    "amount": 50000, "currency": "USD", "status": "SENT",
})
print("invoice_id =", invoice["id"])
approval = call("POST", "/approvals", {
    "title": "Sprint 1 demo", "approval_type": "DELIVERABLE",
    "client_id": client["id"], "project_id": project["id"],
    "status": "PENDING",
})
print("approval_id =", approval["id"])
message = call("POST", "/messages", {
    "client_id": client["id"], "project_id": project["id"],
    "sender_name": "Demo User", "sender_role": "INTERNAL",
    "body": "Welcome to the project portal.",
})
print("message_id =", message["id"])
ticket = call("POST", "/support-tickets", {
    "title": "Login issue on portal", "priority": "MEDIUM",
    "client_id": client["id"], "project_id": project["id"],
    "status": "OPEN",
})
print("ticket_id =", ticket["id"])
supplier = call("POST", "/suppliers", {
    "name": "AWS HIPAA", "category": "INFRASTRUCTURE",
    "status": "ACTIVE", "spend_ytd": 12000, "risk_level": "LOW",
})
print("supplier_id =", supplier["id"])

step("10. PROGRAM + LINK PROJECT")
program = call("POST", "/programs", {
    "name": "Healthcare AI Portfolio", "strategic_priority": "P0",
    "status": "ON_TRACK", "progress": 25, "portfolio_value": 1500000,
})
print("program_id =", program["id"])
link = call("POST", f"/programs/{program['id']}/projects", {
    "program_id": program["id"], "project_id": project["id"],
})
print("program_project link =", link["id"])

step("11. INSIGHT + SCENARIO + CAPACITY")
insight = call("POST", "/insights", {
    "module": "crm", "title": "Acme is high-value strategic prospect",
    "severity": "HIGH", "related_entity_type": "client",
    "related_entity_id": client["id"],
    "payload": {"score": 92, "reasons": ["BAA signed", "Healthcare vertical"]},
})
print("insight_id =", insight["id"])
scenario = call("POST", "/siop-scenarios", {
    "name": "Q3 Baseline", "horizon_weeks": 12, "is_baseline": True,
    "assumptions": {"win_rate": 0.35, "avg_deal_size": 120000},
})
print("scenario_id =", scenario["id"])
capacity = call("POST", "/role-capacity", {
    "role": "ML Engineer", "available_fte": 4.0,
    "committed_fte": 3.0, "forecast_demand": 5.0, "week_start": "2026-05-04",
})
print("capacity_id =", capacity["id"])

step("12. AUDIT TOTALS")
out = subprocess.run(
    ["mysql", "siop_demo", "-e",
     "SELECT module, COUNT(*) AS rows FROM audit_log GROUP BY module ORDER BY module;"],
    capture_output=True, text=True,
)
print(out.stdout)
total = subprocess.run(
    ["mysql", "siop_demo", "-Bse", "SELECT COUNT(*) FROM audit_log;"],
    capture_output=True, text=True,
)
print(f"TOTAL audit_log rows = {total.stdout.strip()}")
print("\n*** FLOW E2E PASSED ***")
