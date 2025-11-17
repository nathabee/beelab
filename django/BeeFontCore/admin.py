from django.contrib import admin
from .models import Job, TemplateSlot


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "sid",
        "family",
        "language",
        "page_format",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "status",
        "language",
        "page_format",
    )
    search_fields = ("sid", "family")
    ordering = ("-created_at",)


@admin.register(TemplateSlot)
class TemplateSlotAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "job",
        "template_code",
        "page_index",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = ("status", "template_code")
    search_fields = ("job__sid", "template_code")
    ordering = ("job", "template_code", "page_index")
