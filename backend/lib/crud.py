"""Generic CRUD helper.

Centralises the boilerplate that was hand-written in client_service.py:
  - workspace_id filtering
  - soft delete
  - audit_log on every write

Specific services compose a `CrudResource` and add domain rules
(e.g. BAA gate on projects) on top.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable
import json
import uuid

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from .audit import record_audit


def jsonable(value: Any) -> Any:
    """Make Decimals / datetimes JSON-serialisable for audit payloads."""
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [jsonable(v) for v in value]
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _encode_for_db(value: Any) -> Any:
    """Encode list/dict values as JSON strings so they survive the
    mysql-connector parameter binding into JSON columns."""
    if isinstance(value, (list, dict)):
        return json.dumps(jsonable(value))
    return value


class CrudResource:
    """One instance per table.

    `columns` is the list of writable columns (excludes id, timestamps,
    workspace_id, is_deleted, deleted_at — all of which are managed here).
    """

    BASE_COLS = ("id", "created_at", "updated_at", "workspace_id", "is_deleted", "deleted_at")

    def __init__(
        self,
        table: str,
        module: str,
        columns: Iterable[str],
        json_columns: Iterable[str] = (),
    ):
        self.table = table
        self.module = module
        self.columns: tuple[str, ...] = tuple(columns)
        self.json_columns: frozenset[str] = frozenset(json_columns)
        self.select_cols = ", ".join(self.BASE_COLS + self.columns)

    def _decode_row(self, row_mapping) -> dict[str, Any]:
        out = dict(row_mapping)
        for col in self.json_columns:
            v = out.get(col)
            if isinstance(v, (str, bytes, bytearray)):
                try:
                    out[col] = json.loads(v)
                except (ValueError, TypeError):
                    pass
        return out

    # ---------------------- read ----------------------

    def list(
        self,
        db: Session,
        workspace_id: str,
        *,
        where: str | None = None,
        params: dict[str, Any] | None = None,
        order_by: str = "created_at DESC",
    ) -> list[dict[str, Any]]:
        sql = (
            f"SELECT {self.select_cols} FROM {self.table} "
            "WHERE workspace_id = :ws AND is_deleted = FALSE"
        )
        if where:
            sql += f" AND {where}"
        sql += f" ORDER BY {order_by}"
        rows = db.execute(text(sql), {"ws": workspace_id, **(params or {})}).fetchall()
        return [self._decode_row(r._mapping) for r in rows]

    def get(self, db: Session, workspace_id: str, record_id: str) -> dict[str, Any]:
        row = db.execute(
            text(
                f"SELECT {self.select_cols} FROM {self.table} "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"id": record_id, "ws": workspace_id},
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.table[:-1] if self.table.endswith('s') else self.table} not found",
            )
        return self._decode_row(row._mapping)

    # ---------------------- write ---------------------

    def create(
        self,
        db: Session,
        *,
        workspace_id: str,
        user_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        new_id = str(uuid.uuid4())
        now = datetime.utcnow()
        clean = {k: v for k, v in data.items() if k in self.columns}
        encoded = {k: _encode_for_db(v) for k, v in clean.items()}

        cols = ["id", "created_at", "updated_at", "workspace_id", "is_deleted", *clean.keys()]
        placeholders = [":id", ":created_at", ":updated_at", ":ws", "FALSE", *(f":{k}" for k in clean.keys())]
        params = {"id": new_id, "created_at": now, "updated_at": now, "ws": workspace_id, **encoded}

        db.execute(
            text(f"INSERT INTO {self.table} ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"),
            params,
        )
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id=user_id,
            module=self.module,
            action="create",
            record_id=new_id,
            payload_delta=jsonable(clean),
        )
        db.commit()
        return self.get(db, workspace_id, new_id)

    def update(
        self,
        db: Session,
        *,
        workspace_id: str,
        user_id: str,
        record_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        before = self.get(db, workspace_id, record_id)
        clean = {k: v for k, v in data.items() if k in self.columns}
        if not clean:
            return before

        set_clause = ", ".join(f"{k} = :{k}" for k in clean.keys())
        encoded = {k: _encode_for_db(v) for k, v in clean.items()}
        params = {**encoded, "id": record_id, "ws": workspace_id, "updated_at": datetime.utcnow()}
        db.execute(
            text(
                f"UPDATE {self.table} SET {set_clause}, updated_at = :updated_at "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            params,
        )
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id=user_id,
            module=self.module,
            action="update",
            record_id=record_id,
            payload_delta={
                "before": jsonable({k: before.get(k) for k in clean}),
                "after": jsonable(clean),
            },
        )
        db.commit()
        return self.get(db, workspace_id, record_id)

    def soft_delete(
        self,
        db: Session,
        *,
        workspace_id: str,
        user_id: str,
        record_id: str,
    ) -> None:
        before = self.get(db, workspace_id, record_id)
        db.execute(
            text(
                f"UPDATE {self.table} SET is_deleted = TRUE, deleted_at = :now, updated_at = :now "
                "WHERE id = :id AND workspace_id = :ws"
            ),
            {"now": datetime.utcnow(), "id": record_id, "ws": workspace_id},
        )
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id=user_id,
            module=self.module,
            action="delete",
            record_id=record_id,
            payload_delta={"before": jsonable(before)},
        )
        db.commit()
