from lib.router_factory import make_router
from models.risk_compliance import (
    ComplianceCreate,
    ComplianceOut,
    ComplianceUpdate,
    RiskCreate,
    RiskOut,
    RiskUpdate,
)
from services.risk_compliance_service import compliance_resource, risk_resource

risks_router = make_router(
    prefix="/api/risks",
    tag="risks",
    resource=risk_resource,
    create_model=RiskCreate,
    update_model=RiskUpdate,
    out_model=RiskOut,
)

compliance_router = make_router(
    prefix="/api/compliance-controls",
    tag="compliance",
    resource=compliance_resource,
    create_model=ComplianceCreate,
    update_model=ComplianceUpdate,
    out_model=ComplianceOut,
)
