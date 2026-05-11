from lib.folio_crud import FolioCrudResource

resource = FolioCrudResource(
    table="quotes",
    module="quotes",
    folio_kind="quote",
    columns=(
        "folio", "deal_id", "client_id", "rfq_session_id",
        "status", "currency",
        "subtotal", "tax_rate", "tax", "total",
        "valid_until", "terms", "notes",
        "sent_at", "accepted_at", "rejected_at",
    ),
)
