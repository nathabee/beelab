from django.urls import path
from .views import (
  CreateJob, GetJob, list_templates, template_image,
  list_jobs, download_ttf, download_zip, list_segments, delete_job
)

urlpatterns = [
    path("templates", list_templates, name="beefont_list_templates"),
    path("templates/<str:name>/image", template_image, name="beefont_template_image"),
    path("jobs", CreateJob.as_view(), name="beefont_create_job"),
    path("jobs/<str:sid>", GetJob.as_view(), name="beefont_get_job"),
    path("jobs/<str:sid>/download/ttf", download_ttf, name="beefont_dl_ttf"),
    path("jobs/<str:sid>/download/zip", download_zip, name="beefont_dl_zip"),
    path("jobs/<str:sid>/segments", list_segments, name="beefont_list_segments"),
    path("jobs", list_jobs, name="beefont_list_jobs"),          # GET list (same path, different method)
    path("jobs/<str:sid>", delete_job, name="beefont_delete_job"),  # DELETE
]
