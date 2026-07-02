from django.contrib import admin

from .models import InGoImportedProject


@admin.register(InGoImportedProject)
class InGoImportedProjectAdmin(admin.ModelAdmin):
    list_display = (
        "project_number",
        "project_name",
        "project_shared_id",
        "updated_at",
        "created_at",
    )
    search_fields = ("project_number", "project_name", "project_shared_id")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-updated_at", "project_number")
