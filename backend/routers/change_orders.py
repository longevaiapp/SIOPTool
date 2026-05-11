from lib.router_factory import make_router
from models.change_order import ChangeOrderCreate, ChangeOrderOut, ChangeOrderUpdate
from services.change_order_service import resource

router = make_router(
    prefix="/api/change-orders",
    tag="change_orders",
    resource=resource,
    create_model=ChangeOrderCreate,
    update_model=ChangeOrderUpdate,
    out_model=ChangeOrderOut,
)
