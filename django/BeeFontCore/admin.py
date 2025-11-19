from django.contrib import admin

from .models import (
    SupportedLanguage,
    TemplateDefinition,
    FontJob,
    JobPage,
    Glyph,
    FontBuild,
)


@admin.register(SupportedLanguage)
class SupportedLanguageAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")
    ordering = ("code",)


@admin.register(TemplateDefinition)
class TemplateDefinitionAdmin(admin.ModelAdmin):
    list_display = ("code", "description", "page_format", "rows", "cols", "dpi")
    search_fields = ("code", "description", "page_format")
    list_filter = ("page_format", "dpi")
    ordering = ("code",)


class JobPageInline(admin.TabularInline):
    model = JobPage
    extra = 0
    fields = ("page_index", "template", "letters", "scan_image_path", "analysed_at")
    readonly_fields = ("analysed_at", "created_at")
    ordering = ("page_index",)


class FontBuildInline(admin.TabularInline):
    model = FontBuild
    extra = 0
    fields = ("language", "created_at", "success", "ttf_path")
    readonly_fields = ("created_at", "log")
    ordering = ("-created_at",)


@admin.register(FontJob)
class FontJobAdmin(admin.ModelAdmin):
    list_display = ("name", "sid", "user", "base_family", "created_at", "page_count", "glyph_count")
    search_fields = ("name", "sid", "user__username", "user__email")
    list_filter = ("base_family", "created_at")
    readonly_fields = ("created_at",)
    inlines = [JobPageInline, FontBuildInline]
    ordering = ("-created_at",)

    def page_count(self, obj):
        return obj.pages.count()
    page_count.short_description = "Pages"

    def glyph_count(self, obj):
        return obj.glyphs.count()
    glyph_count.short_description = "Glyphs"


class GlyphInline(admin.TabularInline):
    model = Glyph
    extra = 0
    fields = ("letter", "variant_index", "cell_index", "image_path", "is_default")
    ordering = ("letter", "variant_index")


@admin.register(JobPage)
class JobPageAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "page_index", "template", "scan_image_path", "analysed_at", "created_at")
    list_filter = ("template", "analysed_at", "created_at")
    search_fields = ("job__sid", "job__name", "scan_image_path", "letters")
    readonly_fields = ("created_at",)
    ordering = ("job", "page_index")
    inlines = [GlyphInline]


@admin.register(Glyph)
class GlyphAdmin(admin.ModelAdmin):
    list_display = ("job", "letter", "variant_index", "page", "cell_index", "is_default")
    list_filter = ("job", "letter", "is_default")
    search_fields = ("job__sid", "job__name", "letter", "image_path")
    ordering = ("job", "letter", "variant_index")


@admin.register(FontBuild)
class FontBuildAdmin(admin.ModelAdmin):
    list_display = ("job", "language", "created_at", "success", "ttf_path_short")
    list_filter = ("language", "success", "created_at")
    search_fields = ("job__sid", "job__name", "language__code", "ttf_path", "log")
    readonly_fields = ("created_at",)

    def ttf_path_short(self, obj):
        return obj.ttf_path.split("/")[-1]
    ttf_path_short.short_description = "TTF file"
