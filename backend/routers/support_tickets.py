from lib.router_factory import make_router
from models.support_ticket import TicketCreate, TicketOut, TicketUpdate
from services.support_ticket_service import resource

router = make_router(
    prefix="/api/support-tickets",
    tag="support-tickets",
    resource=resource,
    create_model=TicketCreate,
    update_model=TicketUpdate,
    out_model=TicketOut,
)
