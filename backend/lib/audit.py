"""Audit log helper.

Project rule: every DB write must also insert into audit_log.
audit_log columns: id, created_at, workspace_id, user_id, action,
module, record_id, payload_delta, timestamp.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def record_audit(
    db: Session,
    *,
    workspace_id: str,
    user_id: str | None,
    module: str,
    action: str,
    record_id: str | None = None,
    payload_delta: dict[str, Any] | None = None,
) -> None:
    """Insert one row into audit_log. Caller is responsible for db.commit()."""
    now = datetime.utcnow()
    db.execute(
        text(
            """
            INSERT INTO audit_log
                (id, created_at, workspace_id, user_id, action,
                 module, record_id, payload_delta, `timestamp`)
            VALUES
                (:id, :created_at, :ws, :uid, :action,
                 :module, :rid, :payload, :ts)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "created_at": now,
            "ws": workspace_id,
            "uid": user_id,
            "action": action,
            "module": module,
            "rid": record_id,
            "payload": json.dumps(payload_delta) if payload_delta is not None else None,
            "ts": now,
        },
    )
