from lib.crud import CrudResource

resource = CrudResource(
    table="rfq_sessions",
    module="rfq",
    columns=("deal_id", "client_id", "responses", "completion_pct", "status"),
    json_columns=("responses",),
)
