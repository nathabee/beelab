
from django.db import models


class Job(models.Model):
    STATUS = [
        ("queued","queued"),("processing","processing"),
        ("done","done"),("failed","failed")
    ]
    sid = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=12, choices=STATUS, default="queued")
    family = models.CharField(max_length=80, default="MyHand")
    upload = models.FileField(upload_to="beefont/uploads/")
    template_name = models.CharField(max_length=64, default="A4_10x10")
    log = models.TextField(blank=True, default="")
    segments_dir = models.CharField(max_length=255, blank=True, default="")
    ttf_path = models.FileField(upload_to="beefont/builds/", blank=True, null=True)
    zip_path = models.FileField(upload_to="beefont/builds/", blank=True, null=True)

    def __str__(self):
        return f"BeeFont Job {self.sid} ({self.status})"
