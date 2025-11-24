from django.urls import path

from .views import (
    # Templates
    list_templates,
    template_image,

    # Languages
    list_languages,
    language_alphabet,

    # Jobs
    JobListCreate,          # GET: list, POST: create
    JobDetailDelete,        # GET: detail, DELETE: delete

    # Job pages (scan pages)
    JobPageListCreate,      # GET: list pages for job
    JobPageDetail,          # GET: detail of one page, DELETE: remove page
    analyse_page,           # POST: run OCR / segmentation to create glyphs
    retry_page_analysis,    # POST: rerun analysis if needed
    create_page,            # POST: upload scan file and create associated page

    # Glyphs
    list_glyphs,            # GET: all glyphs for a job, optional filter via query (?letter=...)
    glyph_detail,           # GET: all variants for a letter in a job
    select_glyph_variant,   # POST: mark one variant as default

    # Font builds
    list_builds,            # GET : list of all build for a job
    build_ttf,              # POST: build font for a given language
    download_ttf,           # GET: download TTF for job+language
    download_job_zip,       # GET: zip of all builds + metadata for a job

    # Status per language
    job_languages_status,   # GET: overview per language (ready/missing chars)
    job_language_status,    # GET: status for one language
)

app_name = "beefont"

urlpatterns = [
    # ------------------------------------------------------------------
    # Template catalogue
    # ------------------------------------------------------------------
    path("templates/", list_templates, name="list_templates"),
    path("templates/<str:code>/image/", template_image, name="template_image"),

    # ------------------------------------------------------------------
    # Languages (supported alphabets)
    # ------------------------------------------------------------------
    path("languages/", list_languages, name="list_languages"),
    path(
        "languages/<str:code>/alphabet/",
        language_alphabet,
        name="language_alphabet",
    ),

    # ------------------------------------------------------------------
    # Jobs
    # ------------------------------------------------------------------
    path("jobs/", JobListCreate.as_view(), name="jobs"),
    path("jobs/<str:sid>/", JobDetailDelete.as_view(), name="job_detail"),

    # ------------------------------------------------------------------
    # Job pages (scan pages)
    # ------------------------------------------------------------------
    # GET  /jobs/<sid>/pages/ → list pages for job
    path("jobs/<str:sid>/pages/", JobPageListCreate.as_view(), name="job_pages"),

    # GET    /jobs/<sid>/pages/<int:page_id>/ → detail
    # DELETE /jobs/<sid>/pages/<int:page_id>/ → delete page
    path(
        "jobs/<str:sid>/pages/<int:page_id>/",
        JobPageDetail.as_view(),
        name="job_page_detail",
    ),

    # POST /jobs/<sid>/pages/<int:page_id>/analyse/
    path(
        "jobs/<str:sid>/pages/<int:page_id>/analyse/",
        analyse_page,
        name="analyse_page",
    ),

    # POST /jobs/<sid>/pages/<int:page_id>/retry-analysis/
    path(
        "jobs/<str:sid>/pages/<int:page_id>/retry-analysis/",
        retry_page_analysis,
        name="retry_page_analysis",
    ),

    # High-Level: POST /jobs/<sid>/pages/create/
    path(
        "jobs/<str:sid>/pages/create/",
        create_page,
        name="create_page",
    ),
 
    # ------------------------------------------------------------------
    # Glyphs (variants + selection)
    # ------------------------------------------------------------------
    path("jobs/<str:sid>/glyphs/", list_glyphs, name="list_glyphs"),
    path(
        "jobs/<str:sid>/glyphs/<str:letter>/",
        glyph_detail,
        name="glyph_detail",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:letter>/select/",
        select_glyph_variant,
        name="select_glyph_variant",
    ),

    # ------------------------------------------------------------------
    # Font builds + downloads
    # ------------------------------------------------------------------
    path("jobs/<str:sid>/builds/", list_builds, name="list_builds"),
    path("jobs/<str:sid>/build-ttf/", build_ttf, name="build_ttf"),
    path(
        "jobs/<str:sid>/download/ttf/<str:language>/",
        download_ttf,
        name="download_ttf",
    ),
    path(
        "jobs/<str:sid>/download/zip/",
        download_job_zip,
        name="download_job_zip",
    ),

    # ------------------------------------------------------------------
    # Status per language
    # ------------------------------------------------------------------
    path(
        "jobs/<str:sid>/languages/status/",
        job_languages_status,
        name="job_languages_status",
    ),
    path(
        "jobs/<str:sid>/languages/<str:language>/status/",
        job_language_status,
        name="job_language_status",
    ),
]
