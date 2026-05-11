from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from models.project import ProjectCreate, ProjectOut, ProjectUpdate
from services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return project_service.list_projects(db, principal.workspace_id)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return project_service.get_project(db, principal.workspace_id, project_id)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return project_service.create_project(
        db, workspace_id=principal.workspace_id, user_id=principal.user_id, payload=payload,
    )


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return project_service.update_project(
        db, workspace_id=principal.workspace_id, user_id=principal.user_id,
        project_id=project_id, payload=payload,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    project_service.soft_delete_project(
        db, workspace_id=principal.workspace_id, user_id=principal.user_id, project_id=project_id,
    )
    return None
