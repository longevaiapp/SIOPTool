"""Clients router (M01 CRM)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from models.client import ClientCreate, ClientOut, ClientUpdate
from services import client_service

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return client_service.list_clients(db, principal.workspace_id)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return client_service.get_client(db, principal.workspace_id, client_id)


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return client_service.create_client(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        payload=payload,
    )


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return client_service.update_client(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        client_id=client_id,
        payload=payload,
    )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    client_service.soft_delete_client(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        client_id=client_id,
    )
    return None
