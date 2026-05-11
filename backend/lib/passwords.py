"""bcrypt password hashing helpers.

Centralised so the rest of the app never imports bcrypt directly.
"""
from __future__ import annotations

import bcrypt

# Cost factor 12 ≈ 250-400ms on a typical VPS — balances UX vs brute-force cost.
_ROUNDS = 12


def hash_password(plain: str) -> str:
    if not plain:
        raise ValueError("password must be non-empty")
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str | None) -> bool:
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
