from django.conf import settings
from django.db import models


class Job(models.Model):
    """
    BeeFont V2 Job
    ==============
    One font project.

    - user: owner (nullable for now, so old data / demo flow doesn't explode)
    - language: e.g. 'DE', 'EN', 'FR'
    - page_format: e.g. 'A4'
    - characters: plain string with required characters, e.g. 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'
    - status: coarse state of the project
    """

    STATUS_DRAFT = "draft"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_READY_FOR_FONT = "ready_for_font"
    STATUS_FONT_GENERATED = "font_generated"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "DRAFT"),
        (STATUS_IN_PROGRESS, "IN_PROGRESS"),
        (STATUS_READY_FOR_FONT, "READY_FOR_FONT"),
        (STATUS_FONT_GENERATED, "FONT_GENERATED"),
        (STATUS_CANCELLED, "CANCELLED"),
    ]

    # old V1 had sid + upload etc.; we keep sid, drop upload/template_name/segments_dir
    sid = models.CharField(max_length=40, unique=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="beefont_jobs",
    )

    family = models.CharField(max_length=80, default="MyHand")

    language = models.CharField(max_length=8, default="DE")
    page_format = models.CharField(max_length=16, default="A4")

    # full charset for this job, as a plain string
    characters = models.TextField(blank=True, default="")

    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )

    # Where the final artifacts live (relative to MEDIA_ROOT)
    ttf_path = models.FileField(
        upload_to="beefont/builds/",
        blank=True,
        null=True,
    )
    zip_path = models.FileField(
        upload_to="beefont/builds/",
        blank=True,
        null=True,
    )

    # optional: any pipeline log / error text
    log = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    segments_dir = models.CharField(max_length=255, blank=True, default="")
    template_name = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"BeeFont Job {self.sid} ({self.status})"

    @property
    def is_done(self) -> bool:
        return self.status == self.STATUS_FONT_GENERATED


class TemplateSlot(models.Model):
    """
    One logical template sheet inside a Job.

    - template_code: e.g. 'DE_A4_1', 'DE_A4_2'
    - page_index: 0,1,2,... per template_code for this job
      (increments every time we retry this sheet)
    - status: NO_SCAN / ANALYZED / ERROR / APPROVED
    - scan_*_path: relative paths under MEDIA_ROOT, managed by the pipeline
    """

    STATUS_NO_SCAN = "no_scan"
    STATUS_ANALYZED = "analyzed"
    STATUS_ERROR = "error"
    STATUS_APPROVED = "approved"
    STATUS_UPLOADED = "uploaded" 

    STATUS_CHOICES = [
        (STATUS_NO_SCAN, "NO_SCAN"),
        (STATUS_ANALYZED, "ANALYZED"),
        (STATUS_ERROR, "ERROR"),
        (STATUS_APPROVED, "APPROVED"),
        (STATUS_UPLOADED, "UPLOADED"),
    ]

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="slots",
    )

    template_code = models.CharField(max_length=64)

    # how many attempts for this template within this job
    page_index = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_NO_SCAN,
    )

    # Stored as relative paths (e.g. 'beefont/pages/42/DE_A4_1_0_raw.png')
    scan_original_path = models.CharField(max_length=255, blank=True, default="")
    scan_processed_path = models.CharField(max_length=255, blank=True, default="")

    last_error_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("job", "template_code", "page_index")

    def __str__(self):
        return f"Slot {self.template_code} [job={self.job.sid} idx={self.page_index}]"
