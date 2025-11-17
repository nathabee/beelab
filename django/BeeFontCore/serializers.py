from rest_framework import serializers
from .models import Job, TemplateSlot


class TemplateSlotOut(serializers.ModelSerializer):
    class Meta:
        model = TemplateSlot
        fields = (
            "id",
            "template_code",
            "page_index",
            "status",
            "scan_original_path",
            "scan_processed_path",
            "last_error_message",
            "created_at",
            "updated_at",
        )


class JobOut(serializers.ModelSerializer):
    ttf_url = serializers.SerializerMethodField()
    zip_url = serializers.SerializerMethodField()
    slots = TemplateSlotOut(many=True, read_only=True)

    class Meta:
        model = Job
        fields = (
            "sid",
            "status",
            "family",
            "language",
            "page_format",
            "characters",
            "ttf_url",
            "zip_url",
            "log",
            "created_at",
            "updated_at",
            "slots",
        )

    def get_ttf_url(self, obj):
        request = self.context.get("request")
        if not obj.ttf_path:
            return None
        try:
            url = obj.ttf_path.url
        except ValueError:
            return None
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_zip_url(self, obj):
        request = self.context.get("request")
        if not obj.zip_path:
            return None
        try:
            url = obj.zip_path.url
        except ValueError:
            return None
        if request is not None:
            return request.build_absolute_uri(url)
        return url
