from lib.folio_crud import FolioCrudResource

resource = FolioCrudResource(
    table="proposals",
    module="proposals",
    folio_kind="proposal",
    columns=(
        "folio", "deal_id", "client_id", "rfq_session_id", "quote_id",
        "title", "version", "status", "commercial_model",
        "executive_summary", "scope_md", "approach_md",
        "timeline_md", "team_md", "assumptions_md", "terms_md",
        "valid_until", "sent_at", "accepted_at", "rejected_at",
    ),
)
