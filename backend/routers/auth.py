"""Auth router — /api/auth/login, /refresh, /logout, /me.

In ``SIOP_AUTH_MODE=demo`` the /me endpoint still works (returns
DEMO_PRINCIPAL info) so the frontend can boot, but /login is always
available so users can sign in once mode flips to ``jwt``.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from models.auth import LoginRequest, MeResponse, RefreshRequest, TokenPair
from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    if request.client and request.client.host:
        return request.client.host
    return request.headers.get("x-forwarded-for")


@router.post("/login", response_model=TokenPair)
def login_endpoint(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenPair:
    return auth_service.login(
        db,
        email=body.email.lower(),
        password=body.password,
        workspace_id=body.workspace_id,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh_endpoint(
    body: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenPair:
    return auth_service.refresh(
        db,
        refresh_token=body.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )


@router.post("/logout")
def logout_endpoint(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> dict[str, bool]:
    auth_service.logout(
        db,
        refresh_token=body.refresh_token,
        principal_user_id=principal.user_id,
    )
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me_endpoint(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> MeResponse:
    # In demo mode the demo user may not be a real DB row — synthesize.
    if principal.user_id == "usr-demo":
        return MeResponse(
            user_id=principal.user_id,
            workspace_id=principal.workspace_id,
            email=principal.email or "demo@siop.local",
            full_name="Demo User",
            role=principal.role,
            is_active=True,
            last_login_at=None,
        )
    data = auth_service.get_me(
        db, user_id=principal.user_id, workspace_id=principal.workspace_id
    )
    return MeResponse(**data)
