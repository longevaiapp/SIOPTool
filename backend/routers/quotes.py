from lib.lifecycle import on_quote_changed
from lib.router_factory import make_router
from models.quote import QuoteCreate, QuoteOut, QuoteUpdate
from services.quote_service import resource


def _after_quote_write(db, principal, result, _payload):
    if not result:
        return
    on_quote_changed(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        quote_row=result,
    )


router = make_router(
    prefix="/api/quotes",
    tag="quotes",
    resource=resource,
    create_model=QuoteCreate,
    update_model=QuoteUpdate,
    out_model=QuoteOut,
    after_create=_after_quote_write,
    after_update=_after_quote_write,
)
