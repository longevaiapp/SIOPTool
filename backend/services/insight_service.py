from lib.crud import CrudResource

resource = CrudResource(
    table="insights",
    module="ai.insights",
    columns=(
        "module", "insight_type", "title", "description", "severity",
        "related_entity_type", "related_entity_id", "payload",
        "acknowledged", "acknowledged_at",
    ),
    json_columns=("payload",),
)
