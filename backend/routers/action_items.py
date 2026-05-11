from lib.router_factory import make_router
from models.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate
from services.action_item_service import resource

router = make_router(
    prefix="/api/action-items",
    tag="action-items",
    resource=resource,
    create_model=ActionItemCreate,
    update_model=ActionItemUpdate,
    out_model=ActionItemOut,
)
