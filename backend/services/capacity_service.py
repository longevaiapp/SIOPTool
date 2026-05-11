from lib.crud import CrudResource

role_capacity = CrudResource(
    table="role_capacity",
    module="siop.role_capacity",
    columns=("role", "available_fte", "committed_fte", "forecast_demand", "week_start"),
)

demand_forecast = CrudResource(
    table="demand_forecast",
    module="siop.demand_forecast",
    columns=("week_start", "project_id", "role", "demand_fte"),
)
