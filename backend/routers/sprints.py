from lib.router_factory import make_router
from models.sprint import SprintCreate, SprintOut, SprintUpdate
from services.sprint_service import resource

router = make_router(
    prefix="/api/sprints",
    tag="sprints",
    resource=resource,
    create_model=SprintCreate,
    update_model=SprintUpdate,
    out_model=SprintOut,
)
