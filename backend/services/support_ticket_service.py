from lib.crud import CrudResource

resource = CrudResource(
    table="support_tickets",
    module="portal.tickets",
    columns=(
        "number", "title", "description", "priority", "status",
        "client_id", "project_id", "reporter_id", "assignee_id", "resolved_at",
    ),
)
