from lib.crud import CrudResource

resource = CrudResource(
    table="tasks",
    module="pm.tasks",
    columns=(
        "project_id", "sprint_id", "title", "description", "status",
        "task_type", "assignee_id", "story_points", "wip_column",
        "is_clinical_safety", "clinical_lead_approval",
    ),
)
