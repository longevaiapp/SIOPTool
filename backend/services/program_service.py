from lib.crud import CrudResource

resource = CrudResource(
    table="programs",
    module="pmo.programs",
    columns=(
        "name", "description", "lead_id", "strategic_priority",
        "status", "risk", "progress", "portfolio_value",
    ),
)

link_resource = CrudResource(
    table="program_projects",
    module="pmo.program_projects",
    columns=("program_id", "project_id"),
)
