from typing import Any

from fastapi import Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from lib.auth import Principal, get_current_principal
from lib.developer_profile import (
    detect_missing_client_fields,
    get_developer_profile,
)
from lib.db import SessionLocal
from lib.router_factory import make_router
from models.document import DocumentCreate, DocumentOut, DocumentUpdate
from services.document_service import resource
from services.pdf_service import (
    PdfGenerationError,
    generate_pdf as _generate_pdf,
    read_pdf_bytes as _read_pdf_bytes,
)
from sqlalchemy import text

router = make_router(
    prefix="/api/documents",
    tag="documents",
    resource=resource,
    create_model=DocumentCreate,
    update_model=DocumentUpdate,
    out_model=DocumentOut,
)


class _GenerateBody(BaseModel):
    kind: str
    source_id: str
    overrides: dict[str, Any] | None = None


@router.post("/generate")
def generate_pdf_endpoint(
    body: _GenerateBody,
    principal: Principal = Depends(get_current_principal),
):
    try:
        return _generate_pdf(
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
            kind=body.kind,
            source_id=body.source_id,
            overrides=body.overrides,
        )
    except PdfGenerationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/developer-profile")
def get_developer_profile_endpoint(
    principal: Principal = Depends(get_current_principal),  # noqa: ARG001 (auth gate)
):
    """Return the hardcoded developer profile (LongevAI / CERO UNO CERO).

    Used by the contract wizard as the default for the Developer step.
    """
    return get_developer_profile()


@router.get("/contracts/{contract_id}/wizard-data")
def contract_wizard_data(
    contract_id: str,
    principal: Principal = Depends(get_current_principal),
):
    """Pre-load wizard with developer profile + client snapshot + missing-field hints."""
    with SessionLocal() as db:
        contract = db.execute(
            text(
                "SELECT id, client_id, project_id, deal_id, contract_type, value, "
                "       hipaa_required, status "
                "FROM contracts "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"id": contract_id, "ws": principal.workspace_id},
        ).mappings().first()
        if not contract:
            raise HTTPException(404, "Contract not found")

        client_row: dict[str, Any] = {}
        if contract["client_id"]:
            cr = db.execute(
                text("SELECT * FROM clients WHERE id = :id AND workspace_id = :ws"),
                {"id": contract["client_id"], "ws": principal.workspace_id},
            ).mappings().first()
            if cr:
                client_row = dict(cr)

    return {
        "developer": get_developer_profile(),
        "client": client_row,
        "missing_client_fields": detect_missing_client_fields(client_row),
        "contract": dict(contract),
    }


@router.get("/{document_id}/pdf")
def download_pdf(
    document_id: str,
    principal: Principal = Depends(get_current_principal),
):
    try:
        data, fname, ctype = _read_pdf_bytes(document_id, principal.workspace_id)
    except PdfGenerationError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(
        content=data,
        media_type=ctype,
        headers={"Content-Disposition": f'inline; filename="{fname}"'},
    )
