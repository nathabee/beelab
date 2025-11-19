# BeeFontCore/serializers.py

from rest_framework import serializers

from .models import (
    SupportedLanguage,
    TemplateDefinition,
    FontJob,
    JobPage,
    Glyph,
    FontBuild,
)


class SupportedLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportedLanguage
        fields = ["code", "name"]


class SupportedLanguageAlphabetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportedLanguage
        fields = ["code", "name", "alphabet"]


class TemplateDefinitionSerializer(serializers.ModelSerializer):
    capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = TemplateDefinition
        fields = [
            "code",
            "description",
            "page_format",
            "dpi",
            "rows",
            "cols",
            "capacity",
        ]



class FontJobSerializer(serializers.ModelSerializer):
    page_count = serializers.IntegerField(read_only=True)
    glyph_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = FontJob
        fields = [
            "id",
            "sid",
            "name",
            "base_family",
            "created_at",
            "page_count",
            "glyph_count",
        ]
        read_only_fields = ["id", "sid", "created_at", "page_count", "glyph_count"]

 
class JobPageSerializer(serializers.ModelSerializer):
    page_index = serializers.IntegerField(required=False, allow_null=True) 

    template_code = serializers.SlugRelatedField(
        slug_field="code",
        source="template",
        queryset=TemplateDefinition.objects.all(),
        write_only=True,
    )
    template = TemplateDefinitionSerializer(read_only=True)

    class Meta:
        model = JobPage
        fields = [
            "id",
            "page_index",
            "template",
            "template_code",
            "letters",
            "scan_image_path",
            "analysed_at",
            "created_at",
        ]
        read_only_fields = ["id", "scan_image_path", "analysed_at", "created_at"]




class GlyphSerializer(serializers.ModelSerializer):
    page_index = serializers.IntegerField(source="page.page_index", read_only=True)

    class Meta:
        model = Glyph
        fields = [
            "id",
            "letter",
            "variant_index",
            "cell_index",
            "page_index",
            "image_path",
            "is_default",
        ]
        read_only_fields = ["id", "page_index", "image_path"]


class GlyphVariantSelectionSerializer(serializers.Serializer):
    glyph_id = serializers.IntegerField(required=False)
    variant_index = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if not attrs.get("glyph_id") and not attrs.get("variant_index"):
            raise serializers.ValidationError(
                "Entweder 'glyph_id' oder 'variant_index' muss gesetzt sein."
            )
        return attrs


class FontBuildSerializer(serializers.ModelSerializer):
    language_code = serializers.SlugRelatedField(
        slug_field="code",
        source="language",
        read_only=True,
    )

    class Meta:
        model = FontBuild
        fields = [
            "id",
            "language_code",
            "created_at",
            "ttf_path",
            "success",
        ]
        read_only_fields = ["id", "created_at", "ttf_path", "success"]


class BuildRequestSerializer(serializers.Serializer):
    language = serializers.SlugRelatedField(
        slug_field="code",
        queryset=SupportedLanguage.objects.all(),
    )


class LanguageStatusSerializer(serializers.Serializer):
    language = serializers.CharField()
    ready = serializers.BooleanField()
    required_chars = serializers.CharField()
    missing_chars = serializers.CharField()
    missing_count = serializers.IntegerField()
