from lib.folio import next_folio
from lib.folio_crud import FolioCrudResource

resource = FolioCrudResource(
    table="invoices",
    module="invoices",
    folio_kind="invoice",
    columns=(
        "folio", "number", "client_id", "project_id", "contract_id",
        "amount", "currency", "status",
        "issue_date", "due_date", "paid_date", "notes",
    ),
)

# Override to also fill legacy `number` (NOT NULL) from folio when blank.
_orig_create = resource.create

def _create(db, *, workspace_id, user_id, data):
    if not data.get("folio"):
        folio = next_folio(db, workspace_id, "invoice")
        data = {**data, "folio": folio}
    if not data.get("number"):
        data = {**data, "number": data["folio"]}
    return _orig_create(db, workspace_id=workspace_id, user_id=user_id, data=data)

resource.create = _create  # type: ignore[assignment]
