from lib.folio_crud import FolioCrudResource

resource = FolioCrudResource(
    table="change_orders",
    module="change_orders",
    folio_kind="change_order",
    columns=(
        "folio", "project_id", "contract_id", "client_id", "meeting_id",
        "title", "reason", "description",
        "status", "scope_impact", "timeline_impact_days",
        "budget_impact", "currency",
        "requested_by", "approved_by",
        "approved_at", "rejected_at", "applied_at",
    ),
)
