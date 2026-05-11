from lib.crud import CrudResource

resource = CrudResource(
    table="suppliers",
    module="suppliers",
    columns=(
        "name", "category", "status", "contact_name", "contact_email",
        "spend_ytd", "contract_value", "performance_score",
        "risk_level", "compliance_certs", "notes",
    ),
    json_columns=("compliance_certs",),
)
