"""Project service.

Adds the HIPAA / BAA gate on top of the generic CRUD helper:
when phi_involved is TRUE, status cannot be set to 'active' unless
baa_confirmed is also TRUE.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from lib.crud import CrudResource
from models.project import ProjectCreate, ProjectUpdate

resource = CrudResource(
    table="projects",
    module="pm.projects",
    columns=(
        "name", "client_name", "client_id", "deal_id", "contract_id",
        "pm_id", "status", "phi_involved", "baa_confirmed",
        "methodology", "health_score", "budget", "phase",
    ),
)


def _enforce_baa_gate(*, phi_involved: bool, baa_confirmed: bool, status_value: str | None) -> None:
    if (status_value or "").lower() == "active" and phi_involved and not baa_confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot set PHI project to 'active' before baa_confirmed = TRUE",
        )


def list_projects(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    return resource.list(db, workspace_id)


def get_project(db: Session, workspace_id: str, project_id: str) -> dict[str, Any]:
    return resource.get(db, workspace_id, project_id)


def create_project(
    db: Session, *, workspace_id: str, user_id: str, payload: ProjectCreate
) -> dict[str, Any]:
    data = payload.model_dump()
    _enforce_baa_gate(
        phi_involved=bool(data.get("phi_involved")),
        baa_confirmed=bool(data.get("baa_confirmed")),
        status_value=data.get("status"),
    )
    result = resource.create(db, workspace_id=workspace_id, user_id=user_id, data=data)
    # Lifecycle: ensure linked deal advances to 'won' (best-effort).
    if result and result.get("deal_id"):
        try:
            from lib.lifecycle import on_project_changed
            on_project_changed(
                db,
                workspace_id=workspace_id,
                user_id=user_id,
                project_row=result,
            )
            db.commit()
        except Exception:
            db.rollback()
    return result


def update_project(
    db: Session, *, workspace_id: str, user_id: str, project_id: str, payload: ProjectUpdate
) -> dict[str, Any]:
    current = resource.get(db, workspace_id, project_id)
    changes = payload.model_dump(exclude_unset=True)
    merged = {**current, **changes}
    _enforce_baa_gate(
        phi_involved=bool(merged.get("phi_involved")),
        baa_confirmed=bool(merged.get("baa_confirmed")),
        status_value=merged.get("status"),
    )
    result = resource.update(
        db, workspace_id=workspace_id, user_id=user_id,
        record_id=project_id, data=changes,
    )
    if result and result.get("deal_id"):
        try:
            from lib.lifecycle import on_project_changed
            on_project_changed(
                db,
                workspace_id=workspace_id,
                user_id=user_id,
                project_row=result,
            )
            db.commit()
        except Exception:
            db.rollback()
    return result


def soft_delete_project(db: Session, *, workspace_id: str, user_id: str, project_id: str) -> None:
    resource.soft_delete(db, workspace_id=workspace_id, user_id=user_id, record_id=project_id)
