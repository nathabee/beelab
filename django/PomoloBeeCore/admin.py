from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count

from .models import Farm, Field, Row, Fruit, Image, Estimation


# ------- Inlines -------------------------------------------------
class FieldInline(admin.TabularInline):
    model = Field
    extra = 0
    show_change_link = True


# ------- Farm ----------------------------------------------------
 

@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "fields_count")
    search_fields = ("name", "owner__username", "owner__email", "owner__first_name", "owner__last_name")
    list_filter = ("owner",)
    inlines = [FieldInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # use the reverse relation name: 'fields'
        return qs.select_related("owner").annotate(_fields_count=Count("fields", distinct=True))

    def fields_count(self, obj):
        return obj._fields_count
    fields_count.short_description = "Fields"
    fields_count.admin_order_field = "_fields_count"



# ------- Field ---------------------------------------------------
@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
    list_display = ("name", "short_name", "orientation", "description", "svg_preview")
    search_fields = ("name", "short_name")
    list_filter = ("orientation",)

    @admin.display(description="SVG Map")
    def svg_preview(self, obj):
        # allow both FileField and CharField-style storage of path
        svg = getattr(obj, "svg_map", None)
        if not svg:
            return "No SVG"
        url = getattr(svg, "url", svg)  # FileField.url if present, else raw string
        return format_html("<a href='{}' target='_blank'>Preview</a>", url)


# ------- Row -----------------------------------------------------
@admin.register(Row)
class RowAdmin(admin.ModelAdmin):
    list_display = ("name", "short_name", "nb_plant", "field", "fruit")
    search_fields = ("name", "short_name", "field__name", "fruit__name")
    list_filter = ("field", "fruit")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("field", "fruit")


# ------- Fruit ---------------------------------------------------
@admin.register(Fruit)
class FruitAdmin(admin.ModelAdmin):
    list_display = ("name", "short_name", "yield_start_date", "yield_end_date", "yield_avg_kg", "fruit_avg_kg")
    search_fields = ("name", "short_name")
    list_filter = ("yield_start_date", "yield_end_date")


# ------- Image ---------------------------------------------------
@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("image_file", "row", "date", "xy_location", "processed", "processed_at")
    search_fields = ("image_file", "row__name")
    list_filter = ("processed", "row")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("row")


# ------- Estimation ----------------------------------------------
@admin.register(Estimation)
class EstimationAdmin(admin.ModelAdmin):
    list_display = ("image", "date", "row", "plant_kg", "row_kg",
                    "maturation_grade", "fruit_plant", "confidence_score", "source")
    search_fields = ("row__name",)
    list_filter = ("date", "row", "source")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("row", "image")
