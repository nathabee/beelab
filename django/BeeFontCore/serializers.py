
from rest_framework import serializers
from .models import Job

class JobOut(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ("sid","status","family","ttf_path","zip_path","log")
