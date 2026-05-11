from fastapi import APIRouter

from lib.router_factory import make_router
from models.capacity import (
    DemandForecastCreate,
    DemandForecastOut,
    DemandForecastUpdate,
    RoleCapacityCreate,
    RoleCapacityOut,
    RoleCapacityUpdate,
)
from services.capacity_service import demand_forecast, role_capacity

role_capacity_router = make_router(
    prefix="/api/role-capacity",
    tag="capacity",
    resource=role_capacity,
    create_model=RoleCapacityCreate,
    update_model=RoleCapacityUpdate,
    out_model=RoleCapacityOut,
)

demand_forecast_router = make_router(
    prefix="/api/demand-forecast",
    tag="capacity",
    resource=demand_forecast,
    create_model=DemandForecastCreate,
    update_model=DemandForecastUpdate,
    out_model=DemandForecastOut,
)
