from fastapi import Depends
from sqlalchemy import text

from lib.auth import Principal, get_current_principal
from lib.db import SessionLocal
from lib.router_factory import make_router
from models.deal import DealCreate, DealOut, DealUpdate
from services.deal_service import resource

router = make_router(
    prefix="/api/deals",
    tag="deals",
    resource=resource,
    create_model=DealCreate,
    update_model=DealUpdate,
    out_model=DealOut,
)


@router.get("/{deal_id}/related")
def get_deal_related(
    deal_id: str,
    principal: Principal = Depends(get_current_principal),
):
    """Aggregate of related artifact ids for a deal — used by the
    Pipeline timeline to determine which stages have evidence.

    Returns the **most recent** id for each linked entity.
    """
    with SessionLocal() as db:
        ws = principal.workspace_id

        def one(sql: str) -> str | None:
            row = db.execute(text(sql), {"did": deal_id, "ws": ws}).first()
            return row[0] if row else None

        latest_quote = one(
            "SELECT id FROM quotes "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        latest_quote_folio = one(
            "SELECT folio FROM quotes "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        latest_proposal = one(
            "SELECT id FROM proposals "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        latest_contract = one(
            "SELECT id FROM contracts "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        latest_project = one(
            "SELECT id FROM projects "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        # Prefer rfq_sessions linked by deal_id; fall back to client_id.
        latest_rfq = one(
            "SELECT id FROM rfq_sessions "
            "WHERE deal_id = :did AND workspace_id = :ws AND is_deleted = FALSE "
            "ORDER BY created_at DESC LIMIT 1"
        )
        client_id = one(
            "SELECT client_id FROM deals "
            "WHERE id = :did AND workspace_id = :ws AND is_deleted = FALSE"
        )
        if not latest_rfq and client_id:
            row = db.execute(
                text(
                    "SELECT id FROM rfq_sessions "
                    "WHERE client_id = :cid AND workspace_id = :ws AND is_deleted = FALSE "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"cid": client_id, "ws": ws},
            ).first()
            latest_rfq = row[0] if row else None

        return {
            "deal_id":      deal_id,
            "quote_id":     latest_quote,
            "quote_folio":  latest_quote_folio,
            "proposal_id":  latest_proposal,
            "contract_id":  latest_contract,
            "project_id":   latest_project,
            "rfq_id":       latest_rfq,
        }
