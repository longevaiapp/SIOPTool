from lib.crud import CrudResource

resource = CrudResource(
    table="messages",
    module="portal.messages",
    columns=(
        "project_id", "client_id", "sender_id", "sender_name",
        "sender_role", "body", "read_at",
    ),
)
