from lib.crud import CrudResource

resource = CrudResource(
    table="deals",
    module="crm.deals",
    columns=(
        "client_id", "client_name", "deal_type", "stage", "value",
        "probability", "owner_id", "ai_score", "commercial_model",
        "last_activity_at", "anomaly_flag",
    ),
)
