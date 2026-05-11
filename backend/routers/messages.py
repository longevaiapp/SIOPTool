from lib.router_factory import make_router
from models.message import MessageCreate, MessageOut, MessageUpdate
from services.message_service import resource

router = make_router(
    prefix="/api/messages",
    tag="messages",
    resource=resource,
    create_model=MessageCreate,
    update_model=MessageUpdate,
    out_model=MessageOut,
)
