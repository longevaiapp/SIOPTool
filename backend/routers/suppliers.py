from lib.router_factory import make_router
from models.supplier import SupplierCreate, SupplierOut, SupplierUpdate
from services.supplier_service import resource

router = make_router(
    prefix="/api/suppliers",
    tag="suppliers",
    resource=resource,
    create_model=SupplierCreate,
    update_model=SupplierUpdate,
    out_model=SupplierOut,
)
