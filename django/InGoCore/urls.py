from django.urls import path

from .views import import_project


app_name = "ingo"

urlpatterns = [
    path("projects/import/", import_project, name="import_project"),
]
