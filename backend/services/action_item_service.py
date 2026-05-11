from lib.crud import CrudResource

resource = CrudResource(
    table="action_items",
    module="meetings.action_items",
    columns=(
        "meeting_id", "text", "assignee_id", "assignee_name",
        "due_date", "priority", "module_target", "accepted",
    ),
)
