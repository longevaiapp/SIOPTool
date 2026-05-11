"""Generic router factory.

Implementation note: we deliberately do NOT type-annotate the `payload`
parameter of the create/update endpoints with a factory parameter name
(e.g. `payload: create_model`) — Pydantic's schema generator under
Python 3.13 fails to resolve those forward refs at runtime. Instead we
attach concrete class objects to `func.__annotations__` after the
function is defined, so FastAPI's `get_type_hints` sees the real class.
"""
from __future__ import annotations

from typing import Callable, Type

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import Principal, get_current_principal
from .crud import CrudResource
from .db import get_db


def make_router(
    *,
    prefix: str,
    tag: str,
    resource: CrudResource,
    create_model: Type[BaseModel],
    update_model: Type[BaseModel],
    out_model: Type[BaseModel],
    after_create: Callable[[Session, Principal, dict, dict], None] | None = None,
    after_update: Callable[[Session, Principal, dict, dict], None] | None = None,
) -> APIRouter:
    """Generic CRUD router.

    `after_create` and `after_update` callbacks (if supplied) are invoked
    AFTER the resource write succeeds, with the signature
    `(db, principal, result_dict, payload_dict)`. Use them to propagate
    side-effects (e.g. lifecycle stage transitions). Failures inside the
    callback are swallowed so they never break the primary write.
    """
    router = APIRouter(prefix=prefix, tags=[tag])
    list_out = list[out_model]

    def _list(
        db: Session = Depends(get_db),
        principal: Principal = Depends(get_current_principal),
    ):
        return resource.list(db, principal.workspace_id)

    def _get(
        record_id: str,
        db: Session = Depends(get_db),
        principal: Principal = Depends(get_current_principal),
    ):
        return resource.get(db, principal.workspace_id, record_id)

    def _create(
        payload,
        db: Session = Depends(get_db),
        principal: Principal = Depends(get_current_principal),
    ):
        data = payload.model_dump()
        result = resource.create(
            db,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
            data=data,
        )
        if after_create is not None:
            try:
                after_create(db, principal, dict(result) if result else {}, data)
                db.commit()
            except Exception:
                db.rollback()
        return result
    _create.__annotations__["payload"] = create_model

    def _update(
        record_id: str,
        payload,
        db: Session = Depends(get_db),
        principal: Principal = Depends(get_current_principal),
    ):
        data = payload.model_dump(exclude_unset=True)
        result = resource.update(
            db,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
            record_id=record_id,
            data=data,
        )
        if after_update is not None:
            try:
                after_update(db, principal, dict(result) if result else {}, data)
                db.commit()
            except Exception:
                db.rollback()
        return result
    _update.__annotations__["payload"] = update_model

    def _delete(
        record_id: str,
        db: Session = Depends(get_db),
        principal: Principal = Depends(get_current_principal),
    ):
        resource.soft_delete(
            db,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
            record_id=record_id,
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    # Annotate the return as Response so FastAPI does NOT try to build a
    # response_model from a None / empty annotation (which would crash on
    # the 204 status_code assertion in fastapi.routing.APIRoute).
    _delete.__annotations__["return"] = Response

    router.add_api_route("", _list, methods=["GET"], response_model=list_out)
    router.add_api_route("/{record_id}", _get, methods=["GET"], response_model=out_model)
    router.add_api_route(
        "", _create, methods=["POST"],
        response_model=out_model,
        status_code=status.HTTP_201_CREATED,
    )
    router.add_api_route(
        "/{record_id}", _update, methods=["PATCH"], response_model=out_model,
    )
    router.add_api_route(
        "/{record_id}", _delete, methods=["DELETE"],
        status_code=status.HTTP_204_NO_CONTENT,
        response_class=Response,
        response_model=None,
    )
    return router
