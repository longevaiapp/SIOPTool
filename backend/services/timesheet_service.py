from lib.crud import CrudResource

resource = CrudResource(
    table="time_entries",
    module="siop.timesheet",
    columns=(
        "user_id", "user_name", "role", "project_id",
        "week_start", "hours", "notes",
    ),
)
