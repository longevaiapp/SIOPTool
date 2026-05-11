from lib.crud import CrudResource

resource = CrudResource(
    table="approvals",
    module="portal.approvals",
    columns=(
        "title", "description", "approval_type", "client_id", "project_id",
        "requested_by", "approver_id", "status", "decided_at", "decision_note",
    ),
)
