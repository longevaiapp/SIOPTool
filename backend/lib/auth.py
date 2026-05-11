"""Auth principal resolver.

Operates in one of three modes, controlled by env var ``SIOP_AUTH_MODE``:

* ``demo``   (default) — every request runs as DEMO_PRINCIPAL. Required for
  local dev, CI smoke tests, and the existing demo workspace until JWT
  rolls out everywhere.
* ``hybrid`` — if the request carries a valid Bearer JWT we use it;
  otherwise we fall back to DEMO_PRINCIPAL. Useful while migrating the
  frontend module-by-module.
* ``jwt``    — request MUST carry ``Authorization: Bearer <jwt>`` or the
  call is rejected with 401.

Switching the mode does not require any router/service changes — they all
just depend on ``get_current_principal`` and receive a Principal.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import jwt as _jwt
from fastapi import Header, HTTPException, status

from .jwt_tokens import decode_access_token


@dataclass(frozen=True)
class Principal:
    user_id: str
    workspace_id: str
    role: str = "admin"          # default keeps demo mode + legacy callers happy
    email: Optional[str] = None


DEMO_PRINCIPAL = Principal(
    user_id="usr-demo",
    workspace_id="ws-demo",
    role="admin",
    email="demo@siop.local",
)


def _auth_mode() -> str:
    return (os.getenv("SIOP_AUTH_MODE") or "demo").strip().lower()


def _principal_from_token(token: str) -> Principal:
    try:
        claims = decode_access_token(token)
    except _jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except _jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if claims.get("typ") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="wrong token type",
        )
    return Principal(
        user_id=str(claims["sub"]),
        workspace_id=str(claims["wsp"]),
        role=str(claims.get("role") or "viewer"),
        email=claims.get("email"),
    )


def get_current_principal(
    authorization: Optional[str] = Header(default=None),
) -> Principal:
    mode = _auth_mode()
    has_bearer = bool(authorization and authorization.lower().startswith("bearer "))

    if mode == "demo":
        # Demo mode honours a Bearer token if present so the login flow
        # can be exercised without flipping the global mode, but never
        # rejects callers that omit it.
        if has_bearer:
            token = authorization.split(" ", 1)[1].strip()
            try:
                return _principal_from_token(token)
            except HTTPException:
                # Bad/expired token in demo mode → still allow demo access.
                return DEMO_PRINCIPAL
        return DEMO_PRINCIPAL

    if mode == "hybrid":
        if has_bearer:
            token = authorization.split(" ", 1)[1].strip()
            return _principal_from_token(token)
        return DEMO_PRINCIPAL

    if mode != "jwt":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"unknown SIOP_AUTH_MODE: {mode!r}",
        )

    if not has_bearer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    return _principal_from_token(token)

