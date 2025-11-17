# BeeFontCore/urls.py
from django.urls import path

from .views import (
    # templates
    list_templates,
    template_image,
    # jobs
    JobListCreate,
    JobDetailDelete,
    build_ttf,
    download_ttf,
    download_zip,
    # template slots
    list_slots,
    upload_slot_scan,
    analyse_slot,
    retry_slot,
    # glyphs
    list_glyphs,
    glyph_detail,
    select_glyph_variant,
)

urlpatterns = [
    # Template catalogue
    path("templates", list_templates, name="beefont_list_templates"),
    path("templates/<str:name>/image", template_image, name="beefont_template_image"),

    # Jobs
    path("jobs", JobListCreate.as_view(), name="beefont_jobs"),  # GET list, POST create
    path("jobs/<str:sid>", JobDetailDelete.as_view(), name="beefont_job_detail"),
    path("jobs/<str:sid>/build-ttf", build_ttf, name="beefont_build_ttf"),
    path("jobs/<str:sid>/download/ttf", download_ttf, name="beefont_dl_ttf"),
    path("jobs/<str:sid>/download/zip", download_zip, name="beefont_dl_zip"),

    # Template slots (per-page handling)
    path("jobs/<str:sid>/slots", list_slots, name="beefont_list_slots"),
    path("slots/<int:slot_id>/upload-scan", upload_slot_scan, name="beefont_upload_slot_scan"),
    path("slots/<int:slot_id>/analyse", analyse_slot, name="beefont_analyse_slot"),
    path("slots/<int:slot_id>/retry", retry_slot, name="beefont_retry_slot"),

    # Glyphs (variants + selection)
    path("jobs/<str:sid>/glyphs", list_glyphs, name="beefont_list_glyphs"),
    path("jobs/<str:sid>/glyphs/<str:letter>", glyph_detail, name="beefont_glyph_detail"),
    path(
        "jobs/<str:sid>/glyphs/<str:letter>/select",
        select_glyph_variant,
        name="beefont_select_glyph_variant",
    ),
]
