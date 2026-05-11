from lib.router_factory import make_router
from models.rfq import RfqCreate, RfqOut, RfqUpdate
from services.rfq_service import resource

router = make_router(
    prefix="/api/rfq-sessions",
    tag="rfq",
    resource=resource,
    create_model=RfqCreate,
    update_model=RfqUpdate,
    out_model=RfqOut,
)
