from lib.lifecycle import on_task_changed
from lib.router_factory import make_router
from models.task import TaskCreate, TaskOut, TaskUpdate
from services.task_service import resource


def _after_task_write(db, principal, result, _payload):
    if not result:
        return
    on_task_changed(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        task_row=result,
    )


router = make_router(
    prefix="/api/tasks",
    tag="tasks",
    resource=resource,
    create_model=TaskCreate,
    update_model=TaskUpdate,
    out_model=TaskOut,
    after_create=_after_task_write,
    after_update=_after_task_write,
)
