from lib.router_factory import make_router
from models.scenario import ScenarioCreate, ScenarioOut, ScenarioUpdate
from services.scenario_service import resource

router = make_router(
    prefix="/api/siop-scenarios",
    tag="siop",
    resource=resource,
    create_model=ScenarioCreate,
    update_model=ScenarioUpdate,
    out_model=ScenarioOut,
)
