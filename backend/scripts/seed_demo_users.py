"""Seed one demo user per role in the demo workspace.

Usage (from backend/ with the venv active):
    SIOP_SEED_PASSWORD=1234567 python -m scripts.seed_demo_users

⚠️  Demo only — passwords are intentionally weak. Do NOT use in production
    workspaces. Replace or disable these accounts before going live.

Idempotent: if a user with the same (workspace_id, email) exists, only
updates password_hash + role + full_name + is_active=TRUE.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime

from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.db import SessionLocal  # noqa: E402
from lib.passwords import hash_password  # noqa: E402


# (email, full_name, role)
DEMO_USERS: list[tuple[str, str, str]] = [
    ("admin@siop.app",            "Admin",            "admin"),
    ("sales@siop.app",            "Sales",            "sales"),
    ("delivery.pm@siop.app",      "Delivery PM",      "delivery_pm"),
    ("tech.lead@siop.app",        "Tech Lead",        "tech_lead"),
    ("cs@siop.app",               "Customer Success", "customer_success"),
    ("procurement@siop.app",      "Procurement",      "procurement"),
    ("finance@siop.app",          "Finance",          "finance"),
    ("compliance@siop.app",       "Compliance",       "compliance"),
    ("client@siop.app",           "Client",           "client"),
    ("viewer@siop.app",           "Viewer",           "viewer"),
]


def main() -> int:
    password = os.getenv("SIOP_SEED_PASSWORD") or ""
    workspace_id = (os.getenv("SIOP_SEED_WORKSPACE_ID") or "ws-demo").strip()

    if not password:
        print("ERROR: SIOP_SEED_PASSWORD must be set.", file=sys.stderr)
        return 2

    pwd_hash = hash_password(password)
    db = SessionLocal()
    try:
        ws = db.execute(
            text("SELECT id FROM workspaces WHERE id = :id AND is_deleted = FALSE"),
            {"id": workspace_id},
        ).first()
        if not ws:
            print(f"ERROR: workspace_id {workspace_id!r} not found.", file=sys.stderr)
            return 3

        now = datetime.utcnow()
        for email, full_name, role in DEMO_USERS:
            existing = db.execute(
                text("SELECT id FROM users "
                     "WHERE workspace_id = :ws AND email = :email "
                     "  AND is_deleted = FALSE"),
                {"ws": workspace_id, "email": email},
            ).first()

            if existing:
                db.execute(
                    text(
                        "UPDATE users SET password_hash = :ph, role = :role, "
                        "       full_name = :fn, is_active = TRUE, "
                        "       failed_attempts = 0, updated_at = :now "
                        "WHERE id = :id"
                    ),
                    {"ph": pwd_hash, "role": role, "fn": full_name,
                     "now": now, "id": existing[0]},
                )
                print(f"OK update  {role:<18} {email}")
            else:
                uid = str(uuid.uuid4())
                db.execute(
                    text(
                        "INSERT INTO users "
                        "(id, workspace_id, email, full_name, role, "
                        " password_hash, is_active) "
                        "VALUES (:id, :ws, :email, :fn, :role, :ph, TRUE)"
                    ),
                    {"id": uid, "ws": workspace_id, "email": email,
                     "fn": full_name, "role": role, "ph": pwd_hash},
                )
                print(f"OK create  {role:<18} {email}  (id={uid})")
        db.commit()
        print(f"\nDone — {len(DEMO_USERS)} demo users seeded in {workspace_id}.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
