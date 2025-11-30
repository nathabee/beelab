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
    JobDetail,              # GET: detail, DELETE: delete

    # Job pages (scan pages)
    JobPageListCreate,      # GET: list pages for job
    JobPageDetail,          # GET: detail of one page, DELETE: remove page
    analyse_page,           # POST: run OCR / segmentation to create glyphs
    retry_page_analysis,    # POST: rerun analysis if needed
    create_page,            # POST: upload scan file and create associated page

    # Glyphs (logical variants, formattype-agnostic)
    list_glyphs,            # GET: all glyphs for a job, optional filter via query (?letter=...)
    glyph_detail,           # GET: all variants for a letter in a job
    select_glyph_variant,   # POST: mark one variant as default
    delete_glyph_variant,   # DELETE : remove a variante

    # Single-glyph upload (formattype-specific)
    upload_glyph_from,
    download_default_glyphs_zip,
    download_all_glyphs_zip,
    upload_glyphs_zip,

    # Font builds
    list_builds,            # GET : list of all builds for a job
    build_ttf,              # POST: build font for a given language + formattype
    download_ttf,           # GET: download TTF for job+language
    download_job_zip,       # GET: zip of all builds + metadata for a job

    # Status per language (formattype-specific)
    job_languages_status,   # GET: overview per language (ready/missing chars) for given formattype
    job_language_status,    # GET: status for one language for given formattype 
)

  


app_name = "beefont"

urlpatterns = [

    # ------------------------------------------------------------------
    # Status per language
    # ------------------------------------------------------------------
    path(
        #"jobs/<str:sid>/languages/status/<str:formattype>/",
        "jobs/<str:sid>/missingcharstatus/<str:formattype>/",
        job_languages_status,
        name="job_languages_status",
    ),
    path(
        #"jobs/<str:sid>/languages/<str:language>/status/<str:formattype>/",
        "jobs/<str:sid>/missingcharstatus/<str:language>/<str:formattype>/",
        job_language_status,
        name="job_language_status",
    ),

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
    path("jobs/<str:sid>/", JobDetail.as_view(), name="job_detail"),

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
    # Glyph ZIP upload/download (formattype-specific)
    # ------------------------------------------------------------------
    # PNG-based glyph assets
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/download/default-zip/",
        download_default_glyphs_zip,
        name="download_default_glyphs_zip",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/download/all-zip/",
        download_all_glyphs_zip,
        name="download_all_glyphs_zip",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/upload-zip/",
        upload_glyphs_zip,
        name="upload_glyphs_zip",
    ),

 

    # ------------------------------------------------------------------
    # Single glyph upload from editor (formattype-specific)
    # ------------------------------------------------------------------
    # PNG editor → uploads bitmap glyph for a letter
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/upload/",
        upload_glyph_from,
        name="upload_glyph_from",
    ),
 
    # ------------------------------------------------------------------
    # Glyphs (logical variants + selection, per formattype)
    # ------------------------------------------------------------------
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/<str:letter>/select/",
        select_glyph_variant,
        name="select_glyph_variant",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/<int:glyph_id>/delete/",
        delete_glyph_variant,
        name="delete_glyph_variant",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/<str:letter>/",
        glyph_detail,
        name="glyph_detail",
    ),
    path(
        "jobs/<str:sid>/glyphs/<str:formattype>/",
        list_glyphs,
        name="list_glyphs",
    ),

    # ------------------------------------------------------------------
    # Font builds + downloads
    # ------------------------------------------------------------------
    path("jobs/<str:sid>/builds/", list_builds, name="list_builds"),
    # POST /jobs/<sid>/build-ttf/<language>/<formattype>/ with formattype ∈ {"png", "svg"}
    path(
        "jobs/<str:sid>/build-ttf/<str:language>/<str:formattype>/",
        build_ttf,
        name="build_ttf",
    ),
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

 


]




 