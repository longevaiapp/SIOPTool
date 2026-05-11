from lib.crud import CrudResource

resource = CrudResource(
    table="siop_scenarios",
    module="siop.scenarios",
    columns=(
        "name", "description", "horizon_weeks",
        "assumptions", "results", "is_baseline", "created_by",
    ),
    json_columns=("assumptions", "results"),
)
