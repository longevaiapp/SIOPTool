"""Business logic for clients (M01 CRM scope)."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from lib.crud import CrudResource
from models.client import ClientCreate, ClientUpdate

resource = CrudResource(
    table="clients",
    module="crm.clients",
    columns=(
        "name", "industry", "segment", "status", "health_score",
        "arr", "mrr", "contract_value", "csat", "nps",
        "primary_contact_name", "primary_contact_email", "primary_contact_role",
        "account_manager_id", "notes",
    ),
)


def list_clients(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    return resource.list(db, workspace_id)


def get_client(db: Session, workspace_id: str, client_id: str) -> dict[str, Any]:
    return resource.get(db, workspace_id, client_id)


def create_client(db: Session, *, workspace_id: str, user_id: str, payload: ClientCreate) -> dict[str, Any]:
    return resource.create(db, workspace_id=workspace_id, user_id=user_id, data=payload.model_dump())


def update_client(db: Session, *, workspace_id: str, user_id: str, client_id: str, payload: ClientUpdate) -> dict[str, Any]:
    return resource.update(
        db, workspace_id=workspace_id, user_id=user_id,
        record_id=client_id, data=payload.model_dump(exclude_unset=True),
    )


def soft_delete_client(db: Session, *, workspace_id: str, user_id: str, client_id: str) -> None:
    resource.soft_delete(db, workspace_id=workspace_id, user_id=user_id, record_id=client_id)
