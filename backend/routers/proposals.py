from lib.router_factory import make_router
from models.proposal import ProposalCreate, ProposalOut, ProposalUpdate
from services.proposal_service import resource

router = make_router(
    prefix="/api/proposals",
    tag="proposals",
    resource=resource,
    create_model=ProposalCreate,
    update_model=ProposalUpdate,
    out_model=ProposalOut,
)
