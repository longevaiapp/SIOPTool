from lib.crud import CrudResource

resource = CrudResource(
    table="sprints",
    module="pm.sprints",
    columns=(
        "project_id", "name", "status", "start_date", "end_date",
        "story_points_planned", "story_points_completed",
    ),
)
