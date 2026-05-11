"""Seed the first admin user.

Usage (from backend/ with the venv active):
    python -m scripts.seed_admin

Reads from env (or prompts):
    SIOP_SEED_EMAIL          (default: admin@siop.local)
    SIOP_SEED_PASSWORD       (REQUIRED — no default)
    SIOP_SEED_FULL_NAME      (default: Admin)
    SIOP_SEED_WORKSPACE_ID   (default: ws-demo — must already exist)
    SIOP_SEED_ROLE           (default: admin)

Idempotent: if a user with the same (workspace_id, email) exists, only
updates password_hash + role + is_active=TRUE.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime

from sqlalchemy import text

# Allow running as `python scripts/seed_admin.py` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.db import SessionLocal  # noqa: E402
from lib.passwords import hash_password  # noqa: E402


def main() -> int:
    email = (os.getenv("SIOP_SEED_EMAIL") or "admin@siop.local").strip().lower()
    password = os.getenv("SIOP_SEED_PASSWORD") or ""
    full_name = (os.getenv("SIOP_SEED_FULL_NAME") or "Admin").strip()
    workspace_id = (os.getenv("SIOP_SEED_WORKSPACE_ID") or "ws-demo").strip()
    role = (os.getenv("SIOP_SEED_ROLE") or "admin").strip()

    if not password or len(password) < 10:
        print("ERROR: SIOP_SEED_PASSWORD must be set and be >= 10 chars.", file=sys.stderr)
        return 2

    pwd_hash = hash_password(password)
    db = SessionLocal()
    try:
        # Verify the workspace exists; we don't auto-create it.
        ws = db.execute(
            text("SELECT id FROM workspaces WHERE id = :id AND is_deleted = FALSE"),
            {"id": workspace_id},
        ).first()
        if not ws:
            print(f"ERROR: workspace_id {workspace_id!r} not found.", file=sys.stderr)
            return 3

        existing = db.execute(
            text("SELECT id FROM users "
                 "WHERE workspace_id = :ws AND email = :email AND is_deleted = FALSE"),
            {"ws": workspace_id, "email": email},
        ).first()

        now = datetime.utcnow()
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
            print(f"OK updated user {existing[0]} ({email}) in {workspace_id}")
        else:
            uid = str(uuid.uuid4())
            db.execute(
                text(
                    "INSERT INTO users "
                    "(id, workspace_id, email, full_name, role, password_hash, is_active) "
                    "VALUES (:id, :ws, :email, :fn, :role, :ph, TRUE)"
                ),
                {"id": uid, "ws": workspace_id, "email": email,
                 "fn": full_name, "role": role, "ph": pwd_hash},
            )
            print(f"OK created user {uid} ({email}) in {workspace_id} role={role}")
        db.commit()
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
