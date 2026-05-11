from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from lib.router_factory import make_router
from models.program import (
    ProgramCreate,
    ProgramOut,
    ProgramProjectLink,
    ProgramProjectOut,
    ProgramUpdate,
)
from services.program_service import link_resource, resource

router = make_router(
    prefix="/api/programs",
    tag="programs",
    resource=resource,
    create_model=ProgramCreate,
    update_model=ProgramUpdate,
    out_model=ProgramOut,
)


# Extra endpoints for the M:N program ↔ project link table.
@router.get("/{program_id}/projects", response_model=list[ProgramProjectOut])
def list_program_projects(
    program_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return link_resource.list(
        db, principal.workspace_id,
        where="program_id = :pid", params={"pid": program_id},
    )


@router.post(
    "/{program_id}/projects",
    response_model=ProgramProjectOut,
    status_code=status.HTTP_201_CREATED,
)
def link_project_to_program(
    program_id: str,
    payload: ProgramProjectLink,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return link_resource.create(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        data={"program_id": program_id, "project_id": payload.project_id},
    )
