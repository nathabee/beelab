from django.db import models


class InGoImportedProject(models.Model):
    project_number = models.CharField(max_length=150, unique=True)
    project_name = models.CharField(max_length=150)
    project_shared_id = models.CharField(max_length=200, unique=True)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "project_number"]

    def __str__(self):
        return f"{self.project_number} -> {self.project_shared_id}"
