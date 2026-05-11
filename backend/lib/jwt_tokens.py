"""JWT issue + verify helpers.

- Access tokens: short-lived (default 30 min), carry user_id + workspace_id + role.
- Refresh tokens: long-lived opaque values; their hash is stored in
  auth_refresh_tokens so we can revoke server-side.

Settings (from env, all optional except JWT_SECRET when SIOP_AUTH_MODE=jwt):
    JWT_SECRET                       — required when auth mode is jwt
    JWT_ACCESS_TOKEN_MINUTES         — default 30
    JWT_REFRESH_TOKEN_DAYS           — default 14
    JWT_ISSUER                       — default "siop-tool"
"""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

ALGORITHM = "HS256"


def _secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not set; required when SIOP_AUTH_MODE=jwt"
        )
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters")
    return secret


def _access_minutes() -> int:
    return int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "30"))


def _refresh_days() -> int:
    return int(os.getenv("JWT_REFRESH_TOKEN_DAYS", "14"))


def _issuer() -> str:
    return os.getenv("JWT_ISSUER", "siop-tool")


def issue_access_token(*, user_id: str, workspace_id: str, role: str) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=_access_minutes())
    payload: dict[str, Any] = {
        "iss": _issuer(),
        "sub": user_id,
        "wsp": workspace_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM), exp


def decode_access_token(token: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError subclasses on failure (callers convert to 401)."""
    return jwt.decode(
        token,
        _secret(),
        algorithms=[ALGORITHM],
        issuer=_issuer(),
        options={"require": ["exp", "iat", "sub", "wsp"]},
    )


# ---- Refresh tokens (opaque) ------------------------------------------------
# We DON'T issue JWTs for refresh — opaque + stored hash gives us instant
# server-side revocation. The client treats the value as a black box.

def generate_refresh_token() -> tuple[str, str, datetime]:
    """Returns (raw_token, sha256_hex_hash, expires_at)."""
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    exp = datetime.now(timezone.utc) + timedelta(days=_refresh_days())
    return raw, hashed, exp


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
