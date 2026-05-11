from lib.crud import CrudResource

risk_resource = CrudResource(
    table="risk_items",
    module="pm.risks",
    columns=(
        "project_id", "title", "category", "probability", "impact",
        "score", "status", "response_strategy", "owner_id", "trend",
    ),
)

compliance_resource = CrudResource(
    table="compliance_controls",
    module="contracts.compliance",
    columns=(
        "project_id", "framework", "control_name",
        "status", "score", "evidence_url", "deadline", "owner_id",
    ),
)
