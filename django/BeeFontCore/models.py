from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import Q




def generate_sid():
    return uuid4().hex


class SupportedLanguage(models.Model):
    code = models.CharField(max_length=8, primary_key=True)  # 'de', 'fr', 'en', 'de-CH'...
    name = models.CharField(max_length=64)
    alphabet = models.TextField()  # z.B. "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"

    class Meta:
        verbose_name = "Supported language"
        verbose_name_plural = "Supported languages"
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} – {self.name}"


class TemplateDefinition(models.Model):
    code = models.CharField(max_length=50, primary_key=True)  # z.B. 'A4_6x5'
    description = models.CharField(max_length=200)
    page_format = models.CharField(max_length=16, default="A4")
    dpi = models.IntegerField(default=300)
    rows = models.IntegerField()
    cols = models.IntegerField()

    # Papiergröße (in mm)
    paper_width_mm = models.FloatField(default=210.0)
    paper_height_mm = models.FloatField(default=297.0)

    # Zellengeometrie (in mm)
    cell_width_mm = models.FloatField(default=30.0)
    cell_height_mm = models.FloatField(default=30.0)

    # Abstand vom linken / oberen Rand (in mm)
    margin_left_mm = models.FloatField(default=20.0)
    margin_top_mm = models.FloatField(default=20.0)

    # Fiducials (in mm)
    fiducial_size_mm = models.FloatField(default=10.0)
    fiducial_margin_mm = models.FloatField(default=5.0)

    # optionale Gaps zwischen Zellen (in mm)
    gap_x_mm = models.FloatField(default=0.0)
    gap_y_mm = models.FloatField(default=0.0)

    class Meta:
        verbose_name = "Template definition"
        verbose_name_plural = "Template definitions"
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} ({self.rows}x{self.cols}, {self.page_format})"

    @property
    def capacity(self) -> int:
        return self.rows * self.cols


class FontJob(models.Model):
    id = models.AutoField(primary_key=True)
    sid = models.CharField(
        max_length=32,
        unique=True,
        default=generate_sid,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="font_jobs",
    )

    name = models.CharField(max_length=200)
    base_family = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Font job"
        verbose_name_plural = "Font jobs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} [{self.sid}]"


class JobPage(models.Model):
    """
    Eine konkrete gescannte Seite eines Jobs,
    inkl. Template, vorgesehenen Buchstaben und Scan-Datei.
    """

    id = models.AutoField(primary_key=True)
    job = models.ForeignKey(FontJob, on_delete=models.CASCADE, related_name="pages")

    # Welche Seite innerhalb dieses Jobs? (1 = erste gescannte Seite)
    page_index = models.IntegerField()

    # Welches Raster?
    template = models.ForeignKey(TemplateDefinition, on_delete=models.PROTECT)

    # Welche Buchstaben waren vorgesehen (in Raster-Reihenfolge)?
    letters = models.TextField(blank=True)  # z.B. "BD" oder gesamtes Alphabet

    # Datei des hochgeladenen Scans
    scan_image_path = models.CharField(max_length=512, blank=True)

    analysed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Job page"
        verbose_name_plural = "Job pages"
        ordering = ["job", "page_index"]
        unique_together = ("job", "page_index")

    def __str__(self) -> str:
        return f"Job {self.job.sid} – Page {self.page_index} ({self.template.code})"


class GlyphFormatType(models.TextChoices):
    PNG = "png", "PNG bitmap"
    SVG = "svg", "SVG vector"


class Glyph(models.Model):
    """
    Eine konkrete Glyph-Variante für einen Buchstaben eines Jobs,
    geschnitten aus einer bestimmten JobPage und Zelle.
    """

    id = models.AutoField(primary_key=True)
    job = models.ForeignKey(FontJob, on_delete=models.CASCADE, related_name="glyphs")

    # aus welcher JobPage?
    page = models.ForeignKey(
        JobPage,
        on_delete=models.CASCADE,
        related_name="glyphs",
        null=True,
        blank=True,
    )

    # welche Zelle in der Raster-Seite (0..N-1)
    cell_index = models.IntegerField()

    # welcher Buchstabe ist hier gezeichnet?
    letter = models.CharField(max_length=8)  # 'B', 'D', 'Ä', 'É', etc.

    variant_index = models.IntegerField()
    image_path = models.CharField(max_length=512)

    formattype = models.CharField(
        max_length=8,
        choices=GlyphFormatType.choices,
        default=GlyphFormatType.PNG,
    )

    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Glyph"
        verbose_name_plural = "Glyphs"
        ordering = ["job", "letter", "formattype", "variant_index"]
        unique_together = ("job", "letter", "formattype", "variant_index")
        constraints = [
            models.UniqueConstraint(
                fields=["job", "letter", "formattype"],
                condition=Q(is_default=True),
                name="unique_default_glyph_per_job_letter_formattype",
            )
        ]


class FontBuild(models.Model):
    """
    Ein konkreter Font-Build für einen Job und eine Sprache.
    Ab V3 wird zusätzlich gespeichert, ob der Build aus PNG- oder SVG-Glyphs
    erzeugt wurde (glyph_formattype).
    """

    job = models.ForeignKey(FontJob, on_delete=models.CASCADE, related_name="builds")
    language = models.ForeignKey(SupportedLanguage, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    ttf_path = models.CharField(max_length=512)
    log = models.TextField(blank=True)
    success = models.BooleanField(default=True)

    # Welches Glyphen-FormatType lag dem Build zugrunde?
    glyph_formattype = models.CharField(
        max_length=8,
        choices=GlyphFormatType.choices,
        default=GlyphFormatType.PNG,
    )

    class Meta:
        verbose_name = "Font build"
        verbose_name_plural = "Font builds"
        ordering = ["-created_at"]
        # Pro Job/Sprache/Formattype nur ein aktueller Build-Eintrag
        unique_together = ("job", "language", "glyph_formattype")

    def __str__(self) -> str:
        status = "ok" if self.success else "failed"
        return f"Build {self.job.sid} [{self.language.code}, {self.glyph_formattype}] – {status}"
