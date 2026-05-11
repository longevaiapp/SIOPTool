"""Auth service — user authentication, token issuance, refresh + revoke."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.audit import record_audit
from lib.jwt_tokens import (
    generate_refresh_token,
    hash_refresh_token,
    issue_access_token,
)
from lib.passwords import verify_password
from models.auth import TokenPair


# ---- Internal helpers ------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _fetch_user_by_email(
    db: Session, email: str, workspace_id: Optional[str]
) -> Optional[dict]:
    """Return the user row (as a dict) or None.

    If ``workspace_id`` is None we require the email to be unique across
    non-deleted users — ambiguous logins are rejected.
    """
    if workspace_id:
        rows = db.execute(
            text(
                "SELECT id, workspace_id, email, full_name, role, "
                "       password_hash, is_active, failed_attempts, last_login_at "
                "FROM users "
                "WHERE email = :email AND workspace_id = :ws "
                "  AND is_deleted = FALSE LIMIT 2"
            ),
            {"email": email, "ws": workspace_id},
        ).mappings().all()
    else:
        rows = db.execute(
            text(
                "SELECT id, workspace_id, email, full_name, role, "
                "       password_hash, is_active, failed_attempts, last_login_at "
                "FROM users WHERE email = :email AND is_deleted = FALSE LIMIT 2"
            ),
            {"email": email},
        ).mappings().all()

    if not rows:
        return None
    if len(rows) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email exists in multiple workspaces — provide workspace_id",
        )
    return dict(rows[0])


def _store_refresh_token(
    db: Session,
    *,
    user_id: str,
    workspace_id: str,
    token_hash: str,
    expires_at: datetime,
    user_agent: Optional[str],
    ip: Optional[str],
) -> None:
    db.execute(
        text(
            "INSERT INTO auth_refresh_tokens "
            "(id, workspace_id, user_id, token_hash, expires_at, user_agent, ip_address) "
            "VALUES (:id, :ws, :uid, :h, :exp, :ua, :ip)"
        ),
        {
            "id": str(uuid.uuid4()),
            "ws": workspace_id,
            "uid": user_id,
            "h": token_hash,
            "exp": expires_at.replace(tzinfo=None) if expires_at.tzinfo else expires_at,
            "ua": (user_agent or "")[:255] or None,
            "ip": (ip or "")[:64] or None,
        },
    )


def _build_token_pair(
    db: Session,
    user: dict,
    *,
    user_agent: Optional[str],
    ip: Optional[str],
) -> TokenPair:
    access, access_exp = issue_access_token(
        user_id=user["id"],
        workspace_id=user["workspace_id"],
        role=str(user["role"]),
    )
    raw_refresh, refresh_hash, refresh_exp = generate_refresh_token()
    _store_refresh_token(
        db,
        user_id=user["id"],
        workspace_id=user["workspace_id"],
        token_hash=refresh_hash,
        expires_at=refresh_exp,
        user_agent=user_agent,
        ip=ip,
    )
    return TokenPair(
        access_token=access,
        refresh_token=raw_refresh,
        access_expires_at=access_exp,
        refresh_expires_at=refresh_exp,
    )


# ---- Public API ------------------------------------------------------------

MAX_FAILED_ATTEMPTS = 8


def login(
    db: Session,
    *,
    email: str,
    password: str,
    workspace_id: Optional[str],
    user_agent: Optional[str],
    ip: Optional[str],
) -> TokenPair:
    user = _fetch_user_by_email(db, email.lower(), workspace_id)

    # Constant-ish wall time: still call verify_password on a dummy when the
    # user doesn't exist, to avoid leaking which emails are registered.
    if user is None:
        verify_password(password, "$2b$12$" + "x" * 53)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials",
        )

    if not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user disabled")

    if int(user.get("failed_attempts") or 0) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="account locked — contact an admin",
        )

    if not verify_password(password, user.get("password_hash")):
        db.execute(
            text("UPDATE users SET failed_attempts = failed_attempts + 1, "
                 "       updated_at = :now "
                 "WHERE id = :id"),
            {"id": user["id"], "now": _utcnow()},
        )
        record_audit(
            db,
            workspace_id=user["workspace_id"],
            user_id=user["id"],
            module="auth",
            action="login.failed",
            record_id=user["id"],
            payload_delta={"ip": ip},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials",
        )

    pair = _build_token_pair(db, user, user_agent=user_agent, ip=ip)

    db.execute(
        text("UPDATE users SET failed_attempts = 0, last_login_at = :now, "
             "       updated_at = :now WHERE id = :id"),
        {"id": user["id"], "now": _utcnow()},
    )
    record_audit(
        db,
        workspace_id=user["workspace_id"],
        user_id=user["id"],
        module="auth",
        action="login.success",
        record_id=user["id"],
        payload_delta={"ip": ip},
    )
    db.commit()
    return pair


def refresh(
    db: Session,
    *,
    refresh_token: str,
    user_agent: Optional[str],
    ip: Optional[str],
) -> TokenPair:
    h = hash_refresh_token(refresh_token)
    row = db.execute(
        text(
            "SELECT t.id, t.user_id, t.workspace_id, t.expires_at, t.revoked_at, "
            "       u.email, u.full_name, u.role, u.is_active "
            "FROM auth_refresh_tokens t "
            "JOIN users u ON u.id = t.user_id "
            "WHERE t.token_hash = :h AND t.is_deleted = FALSE LIMIT 1"
        ),
        {"h": h},
    ).mappings().first()

    if not row:
        raise HTTPException(401, "invalid refresh token")
    if row["revoked_at"] is not None:
        raise HTTPException(401, "refresh token revoked")
    if row["expires_at"] < _utcnow():
        raise HTTPException(401, "refresh token expired")
    if not row["is_active"]:
        raise HTTPException(403, "user disabled")

    # Rotate: revoke the presented token and issue a new pair.
    db.execute(
        text("UPDATE auth_refresh_tokens SET revoked_at = :now, updated_at = :now "
             "WHERE id = :id"),
        {"id": row["id"], "now": _utcnow()},
    )
    pair = _build_token_pair(
        db,
        {
            "id": row["user_id"],
            "workspace_id": row["workspace_id"],
            "role": row["role"],
        },
        user_agent=user_agent,
        ip=ip,
    )
    record_audit(
        db,
        workspace_id=row["workspace_id"],
        user_id=row["user_id"],
        module="auth",
        action="token.refreshed",
        record_id=row["user_id"],
        payload_delta={"ip": ip},
    )
    db.commit()
    return pair


def logout(db: Session, *, refresh_token: str, principal_user_id: str) -> None:
    h = hash_refresh_token(refresh_token)
    db.execute(
        text(
            "UPDATE auth_refresh_tokens SET revoked_at = :now, updated_at = :now "
            "WHERE token_hash = :h AND user_id = :uid AND revoked_at IS NULL"
        ),
        {"h": h, "uid": principal_user_id, "now": _utcnow()},
    )
    db.commit()


def get_me(db: Session, *, user_id: str, workspace_id: str) -> dict:
    row = db.execute(
        text(
            "SELECT id, workspace_id, email, full_name, role, is_active, last_login_at "
            "FROM users WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
        ),
        {"id": user_id, "ws": workspace_id},
    ).mappings().first()
    if not row:
        raise HTTPException(404, "user not found")
    return {
        "user_id": row["id"],
        "workspace_id": row["workspace_id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": str(row["role"]),
        "is_active": bool(row["is_active"]),
        "last_login_at": row["last_login_at"],
    }
