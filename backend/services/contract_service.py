from lib.crud import CrudResource

resource = CrudResource(
    table="contracts",
    module="contracts",
    columns=(
        "contract_type", "title", "client_id", "project_id", "deal_id", "status",
        "value", "signed_date", "expiry_date", "signers", "compliance_controls",
        "document_url", "hipaa_required", "baa_signed", "notes",
    ),
    json_columns=("signers", "compliance_controls"),
)
