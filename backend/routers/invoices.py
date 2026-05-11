from lib.lifecycle import on_invoice_changed
from lib.router_factory import make_router
from models.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate
from services.invoice_service import resource


def _after_invoice_write(db, principal, result, _payload):
    if not result:
        return
    on_invoice_changed(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        invoice_row=result,
    )


router = make_router(
    prefix="/api/invoices",
    tag="invoices",
    resource=resource,
    create_model=InvoiceCreate,
    update_model=InvoiceUpdate,
    out_model=InvoiceOut,
    after_create=_after_invoice_write,
    after_update=_after_invoice_write,
)
