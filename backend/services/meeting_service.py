from lib.crud import CrudResource

resource = CrudResource(
    table="meetings",
    module="meetings",
    columns=(
        "title", "meeting_type", "status", "scheduled_at", "duration_minutes",
        "client_id", "deal_id", "project_id", "participants",
        "transcript", "audio_url", "notes", "ai_outputs",
    ),
    json_columns=("participants", "ai_outputs"),
)
