from lib.folio_crud import FolioCrudResource

resource = FolioCrudResource(
    table="documents",
    module="documents",
    columns=(
        "folio", "kind", "source_table", "source_id",
        "client_id", "project_id", "deal_id",
        "version", "status", "title", "storage_path",
        "pdf_size_bytes", "metadata_json",
        "generated_by", "sent_at", "signed_at",
        "accepted_at", "rejected_at", "voided_at",
    ),
    json_columns=("metadata_json",),
    # folio_kind=None → derived from data["kind"] on each create
)
