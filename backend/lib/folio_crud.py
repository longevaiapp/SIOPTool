"""CrudResource variant that auto-assigns a folio on create.

The wrapped table must have a unique ``folio`` column and a corresponding
row in ``document_sequences`` (created lazily by ``next_folio``).

If ``folio_kind`` is ``None``, the folio kind is read from ``data['kind']``
on each create call (used by the ``documents`` table where each row has
its own kind).
"""
from __future__ import annotations

from typing import Any, Iterable, Optional

from sqlalchemy.orm import Session

from .crud import CrudResource
from .folio import next_folio


class FolioCrudResource(CrudResource):
    def __init__(
        self,
        table: str,
        module: str,
        columns: Iterable[str],
        *,
        folio_kind: Optional[str] = None,
        json_columns: Iterable[str] = (),
    ):
        super().__init__(table=table, module=module, columns=columns, json_columns=json_columns)
        self.folio_kind = folio_kind

    def create(
        self,
        db: Session,
        *,
        workspace_id: str,
        user_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        if not data.get("folio"):
            kind = self.folio_kind or data.get("kind")
            if not kind:
                raise ValueError(
                    f"{self.table}: cannot generate folio without a kind"
                )
            data = {**data, "folio": next_folio(db, workspace_id, kind)}
        return super().create(db, workspace_id=workspace_id, user_id=user_id, data=data)
