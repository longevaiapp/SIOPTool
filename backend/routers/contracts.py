from lib.lifecycle import on_contract_changed
from lib.router_factory import make_router
from models.contract import ContractCreate, ContractOut, ContractUpdate
from services.contract_service import resource


def _after_contract_write(db, principal, result, _payload):
    if not result:
        return
    on_contract_changed(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        contract_row=result,
    )


router = make_router(
    prefix="/api/contracts",
    tag="contracts",
    resource=resource,
    create_model=ContractCreate,
    update_model=ContractUpdate,
    out_model=ContractOut,
    after_create=_after_contract_write,
    after_update=_after_contract_write,
)


# ── Generar contrato (SOW DRAFT) a partir de una cotización ────────────
import uuid
from datetime import datetime

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from lib.audit import record_audit
from lib.auth import Principal, get_current_principal
from lib.db import SessionLocal
from lib.lifecycle import on_contract_changed as _lifecycle_on_contract


class ContractFromQuoteIn(BaseModel):
    contract_type: str = "SOW"
    title: str | None = None
    notes: str | None = None
    hipaa_required: bool = False


class ContractFromQuoteOut(BaseModel):
    id: str
    title: str
    contract_type: str
    status: str
    value: float
    deal_id: str | None = None
    client_id: str
    quote_id: str
    quote_folio: str


@router.post(
    "/from-quote/{quote_id}",
    response_model=ContractFromQuoteOut,
    status_code=status.HTTP_201_CREATED,
)
def create_contract_from_quote(
    quote_id: str,
    payload: ContractFromQuoteIn | None = None,
    principal: Principal = Depends(get_current_principal),
):
    """Genera un contrato (SOW por defecto) en estado DRAFT a partir de una
    cotización aceptada/enviada. Hereda value, client_id, deal_id, terms.

    Requisitos: la quote debe existir, no estar borrada y tener `client_id`.
    """
    payload = payload or ContractFromQuoteIn()

    ctype = (payload.contract_type or "SOW").upper()
    if ctype not in {"MSA", "SOW", "BAA", "NDA", "AMENDMENT"}:
        raise HTTPException(status_code=400, detail="Invalid contract_type")

    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT id, folio, deal_id, client_id, total, currency, terms, notes "
                "FROM quotes "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"id": quote_id, "ws": principal.workspace_id},
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Quote not found")
        quote = dict(row._mapping)

        if not quote.get("client_id"):
            raise HTTPException(
                status_code=400,
                detail="Quote tiene client_id vacío; no se puede crear contrato",
            )

        new_id = str(uuid.uuid4())
        now = datetime.utcnow()
        title = (payload.title
                 or f"{ctype} — Cotización {quote['folio']}")[:500]
        # Compose notes: cotización origen + terms + notas adicionales
        notes_parts = [f"Generado desde cotización {quote['folio']} "
                       f"(total {quote['total']} {quote['currency']})."]
        if quote.get("terms"):
            notes_parts.append(f"\n## Términos heredados\n{quote['terms']}")
        if payload.notes:
            notes_parts.append(f"\n## Notas\n{payload.notes}")
        notes_blob = "\n".join(notes_parts)[:65000]

        db.execute(
            text(
                "INSERT INTO contracts "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " contract_type, title, client_id, deal_id, status, value, "
                " hipaa_required, baa_signed, notes) "
                "VALUES (:id, :now, :now, :ws, FALSE, "
                " :ct, :title, :cid, :did, 'DRAFT', :val, "
                " :hipaa, FALSE, :notes)"
            ),
            {
                "id": new_id, "now": now, "ws": principal.workspace_id,
                "ct": ctype, "title": title,
                "cid": quote["client_id"], "did": quote.get("deal_id"),
                "val": quote.get("total") or 0,
                "hipaa": bool(payload.hipaa_required),
                "notes": notes_blob,
            },
        )
        record_audit(
            db,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
            module="contracts",
            action="create.from_quote",
            record_id=new_id,
            payload_delta={
                "quote_id": quote["id"],
                "quote_folio": quote["folio"],
                "value": str(quote.get("total") or 0),
                "currency": quote.get("currency"),
            },
        )
        db.commit()

        # Propagate to deal lifecycle (best-effort)
        try:
            _lifecycle_on_contract(
                db,
                workspace_id=principal.workspace_id,
                user_id=principal.user_id,
                contract_row={
                    "id": new_id,
                    "deal_id": quote.get("deal_id"),
                    "status": "DRAFT",
                    "value": quote.get("total") or 0,
                },
            )
            db.commit()
        except Exception:
            db.rollback()

        return ContractFromQuoteOut(
            id=new_id,
            title=title,
            contract_type=ctype,
            status="DRAFT",
            value=float(quote.get("total") or 0),
            deal_id=quote.get("deal_id"),
            client_id=quote["client_id"],
            quote_id=quote["id"],
            quote_folio=quote["folio"],
        )
