# BeeFontCore/views.py

import os
from datetime import datetime

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.core.files.storage import default_storage

from rest_framework import generics, permissions, status 
from rest_framework.response import Response

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser

from django.core.files.base import ContentFile
import io

from rest_framework import generics, permissions
from pathlib import Path

import cv2
import numpy as np

from .models import (
    SupportedLanguage,
    TemplateDefinition,
    FontJob,
    JobPage,
    Glyph,
    FontBuild,
)
from .serializers import (
    SupportedLanguageSerializer,
    SupportedLanguageAlphabetSerializer,
    TemplateDefinitionSerializer,
    FontJobSerializer,
    JobPageSerializer,
    GlyphSerializer,
    GlyphVariantSelectionSerializer,
    FontBuildSerializer,
    BuildRequestSerializer,
    LanguageStatusSerializer,
)
 


 
from BeeFontCore.services import template_utils 
from BeeFontCore.services.segment import analyse_job_page_scan 
from BeeFontCore.services import build_font



# -------------------------------------------------------------------
# Helper
# -------------------------------------------------------------------


#def get_job_or_404_for_user(sid, user):
#    return get_object_or_404(FontJob, sid=sid, user=user)

def get_job_or_404_for_user(sid, user):
    # Vorläufig: nur nach sid filtern, User ignorieren
    return get_object_or_404(FontJob, sid=sid)


def job_sid_media(job: FontJob): 
    return os.path.join( "beefont", "jobs", job.sid)
 
   
 



# -------------------------------------------------------------------
# Templates
# -------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_templates(request):
    qs = TemplateDefinition.objects.all()
    serializer = TemplateDefinitionSerializer(qs, many=True)
    return Response(serializer.data)

 

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])  # oder AllowAny, wenn du willst
def template_image(request, code: str):

    """
    Render PNG on the fly, ähnlich wie V2:
    - mode=blank        → Grid + Indizes
    - mode=blankpure    → nur Grid
    - mode=prefill*     → Grid + vorgefüllte Zeichen (Platzhalter),
                          Buchstaben kommen aus ?letters=...
                          Suffix nach 'prefill' steuert Stil (b, i, m, ...)
    """
    mode_raw = request.GET.get("mode", "blank")
    template = get_object_or_404(TemplateDefinition, code=code)

    tpl_cfg = template_utils.template_to_config(template)

    # Kapazität des Rasters (z.B. 6x5 = 30)
    try:
        capacity = template.capacity
    except AttributeError:
        capacity = template.rows * template.cols

    # Default
    prefill = False
    prefill_style = None

    if mode_raw.startswith("prefill"):
        # prefill, prefill_b, prefilli, prefill_m ...
        prefill = True
        # alles nach "prefill" als Stil-Code interpretieren, z.B. "_b", "i", "_m"
        suffix = mode_raw[len("prefill"):]
        suffix = suffix.lstrip("_")  # "_b" → "b"
        prefill_style = suffix or "default"
        mode = "prefill"
    else:
        mode = mode_raw

    if mode == "prefill":
        letters_param = request.GET.get("letters", "")

        if not letters_param:
            order = []
        else:
            order = list(letters_param)
            if len(order) > capacity:
                order = order[:capacity]

        im = template_utils.render_template_png(
            tpl_cfg,
            order,
            prefill=True,
            show_indices=False,
            prefill_style=prefill_style,
        )

    elif mode == "blankpure":
        im = template_utils.render_template_png(
            tpl_cfg,
            [],
            prefill=False,
            show_indices=False,
            prefill_style=None,
        )
    else:  # "blank"
        im = template_utils.render_template_png(
            tpl_cfg,
            [],
            prefill=False,
            show_indices=True,
            prefill_style=None,
        )

    buf = io.BytesIO()
    im.save(buf, format="PNG")
    buf.seek(0)

    resp = HttpResponse(buf.getvalue(), content_type="image/png")
    # für den Dateinamen das originale mode_raw verwenden, damit man den Stil sieht
    resp["Cache-Control"] = "public, max-age=3600"
    resp["Content-Disposition"] = f'inline; filename="{code}_{mode_raw}.png"'
    return resp

# -------------------------------------------------------------------
# Languages
# -------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_languages(request):
    qs = SupportedLanguage.objects.all()
    serializer = SupportedLanguageSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def language_alphabet(request, code: str):
    lang = get_object_or_404(SupportedLanguage, code=code)
    serializer = SupportedLanguageAlphabetSerializer(lang)
    return Response(serializer.data)


# -------------------------------------------------------------------
# Jobs
# -------------------------------------------------------------------


class JobListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FontJobSerializer

    def get_queryset(self):
        return FontJob.objects.filter(user=self.request.user)
 
 

    def perform_create(self, serializer):
        job = serializer.save(user=self.request.user)

        # Verzeichnisstruktur anlegen: media/beefont/jobs/<sid>/{pages,debug,glyphs}
        root_rel = job_sid_media(job)  # z.B. "beefont/jobs/<sid>"
        root_abs = os.path.join(settings.MEDIA_ROOT, root_rel)

        for sub in ("", "pages", "debug", "glyphs", "build"):
            os.makedirs(os.path.join(root_abs, sub), exist_ok=True)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        for job in qs:
            job.page_count = job.pages.count()
            job.glyph_count = job.glyphs.count()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        job = FontJob.objects.get(pk=response.data["id"])
        job.page_count = 0
        job.glyph_count = 0
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)




class JobDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FontJobSerializer
    lookup_field = "sid"

    def get_queryset(self):
        return FontJob.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        job = self.get_object()
        job.page_count = job.pages.count()
        job.glyph_count = job.glyphs.count()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        PATCH /jobs/<sid>/ – allow renaming job.name and base_family.

        If either 'name' or 'base_family' changes, all existing FontBuilds
        for this job are deleted and their TTF files removed from storage.
        The user must rebuild fonts afterwards.
        """
        partial = kwargs.pop("partial", False)
        instance: FontJob = self.get_object()

        old_name = instance.name
        old_base_family = instance.base_family

        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)

        # Peek at the new values from validated_data; fall back to old ones.
        new_name = serializer.validated_data.get("name", old_name)
        new_base_family = serializer.validated_data.get(
            "base_family", old_base_family
        )

        name_changed = new_name != old_name
        base_changed = new_base_family != old_base_family

        # Perform standard update first
        response = super().update(request, partial=partial, *args, **kwargs)

        # If name or base family changed, nuke builds + TTF files
        if name_changed or base_changed:
            builds = FontBuild.objects.filter(job=instance)

            for b in builds:
                if b.ttf_path and default_storage.exists(b.ttf_path):
                    try:
                        default_storage.delete(b.ttf_path)
                    except Exception as e:
                        # Do not fail the whole request because of a FS error;
                        # you can log this if you have logging configured.
                        print(
                            f"[BeeFont] Failed to delete TTF '{b.ttf_path}': {e}"
                        )

            # Remove DB entries
            builds.delete()

        return response


# -------------------------------------------------------------------
# Job pages
# -------------------------------------------------------------------

class JobPageListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = JobPageSerializer

    def get_job(self):
        return get_job_or_404_for_user(self.kwargs["sid"], self.request.user)

    def get_queryset(self):
        job = self.get_job()
        return JobPage.objects.filter(job=job).order_by("page_index")
 


class JobPageDetail(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = JobPageSerializer
    lookup_url_kwarg = "page_id"

    def get_queryset(self):
        job = get_job_or_404_for_user(self.kwargs["sid"], self.request.user)
        return JobPage.objects.filter(job=job)


 
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_page(request, sid: str):
    """
    Create a JobPage (auto page_index if missing) and directly attach a scan.

    Expect multipart/form-data with:
      - template_code (str)
      - letters (str, optional)
      - page_index (int, optional; if missing → auto)
      - file (the uploaded PNG/JPEG)
      - auto_analyse (optional: "1"/"true" → run analyse_page immediately)
    """
    job = get_job_or_404_for_user(sid, request.user)

    template_code = request.data.get("template_code")
    if not template_code:
        return Response(
            {"detail": "template_code is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    template = get_object_or_404(TemplateDefinition, code=template_code)
    letters = request.data.get("letters", "")

    # page_index optional → auto assign if missing
    page_index_raw = request.data.get("page_index", None)
    if page_index_raw is None or page_index_raw == "":
        last = (
            JobPage.objects.filter(job=job)
            .order_by("-page_index")
            .first()
        )
        page_index = (last.page_index + 1) if last else 0
    else:
        try:
            page_index = int(page_index_raw)
        except ValueError:
            return Response(
                {"detail": "page_index must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # create page
    page = JobPage.objects.create(
        job=job,
        template=template,
        page_index=page_index,
        letters=letters,
    )

    # handle file
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"detail": "Kein Datei-Upload gefunden (expected 'file')."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    root_rel = job_sid_media(job)               # "beefont/jobs/<sid>"
    rel_dir = os.path.join(root_rel, "pages")
    filename = f"page_{page.page_index}_scan{os.path.splitext(file.name)[1]}"
    rel_path = os.path.join(rel_dir, filename)

    full_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(full_dir, exist_ok=True)

    saved_path = default_storage.save(rel_path, file)
    page.scan_image_path = saved_path
    page.save(update_fields=["scan_image_path"])

    # optional auto analyse
    auto_analyse = str(request.data.get("auto_analyse", "")).lower() in ("1", "true", "yes")
    result_payload = JobPageSerializer(page).data

    if auto_analyse:
        try:
            analysis_payload = _run_page_analysis(job, page)
        except ValueError as e:
            # missing scan should not happen here, but be explicit
            return Response(
                {
                    "page": result_payload,
                    "analyse_error": {"detail": str(e)},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except FileNotFoundError as e:
            return Response(
                {
                    "page": result_payload,
                    "analyse_error": {"detail": str(e)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            return Response(
                {
                    "page": result_payload,
                    "analyse_error": {
                        "detail": "Analyse fehlgeschlagen",
                        "error": str(e),
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result_payload = {
            "page": result_payload,
            "analysis": analysis_payload,
        }

    return Response(result_payload, status=status.HTTP_201_CREATED)


def _run_page_analysis(job: FontJob, page: JobPage) -> dict:
    """
    Core analysis logic for a JobPage.
    Returns a plain dict payload, raises exceptions on fatal errors.
    """
    from pathlib import Path
    from .models import Glyph  # local import

    if not page.scan_image_path:
        raise ValueError("Für diese Seite ist noch kein Scan hochgeladen.")

    media_root = Path(settings.MEDIA_ROOT)

    scan_path = Path(page.scan_image_path)
    if not scan_path.is_absolute():
        abs_scan_path = media_root / scan_path
    else:
        abs_scan_path = scan_path

    if not abs_scan_path.exists():
        raise FileNotFoundError(f"Scan-Datei nicht gefunden: {abs_scan_path}")

    # Job root: media/beefont/jobs/<sid>/
    job_root_rel = job_sid_media(job)          # "beefont/jobs/<sid>"
    job_root_abs = media_root / job_root_rel

    # Debug directory for this page
    dbg_dir = job_root_abs / "debug" / f"page_{page.page_index}"

    # Template config from DB
    template = page.template
    tpl = template_utils.template_to_config(template)

    glyphs_created = 0

    # Segmentation
    glyph_info = analyse_job_page_scan(
        abs_scan_path=abs_scan_path,
        tpl=tpl,
        letters=page.letters or "",
        dbg_dir=dbg_dir,
    )

    for cell_index, letter, im in glyph_info:
        last = (
            Glyph.objects.filter(job=job, letter=letter)
            .order_by("-variant_index")
            .first()
        )
        next_idx = (last.variant_index + 1) if last else 0

        filename = f"{letter}_v{next_idx}.png"
        rel_path = os.path.join(job_root_rel, "glyphs", filename)
        abs_path = media_root / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        im.save(abs_path)

        # no canonical <LETTER>.png anymore
        Glyph.objects.create(
            job=job,
            page=page,
            cell_index=cell_index,
            letter=letter,
            variant_index=next_idx,
            image_path=str(rel_path).replace("\\", "/"),
            is_default=(next_idx == 0),
        )

        glyphs_created += 1

    page.analysed_at = now()
    page.save(update_fields=["analysed_at"])

    return {
        "detail": "Analyse abgeschlossen.",
        "glyph_variants_created": glyphs_created,
    }



@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def analyse_page(request, sid: str, page_id: int):
    job = get_job_or_404_for_user(sid, request.user)
    page = get_object_or_404(JobPage, job=job, pk=page_id)

    try:
        payload = _run_page_analysis(job, page)
    except ValueError as e:
        # missing scan
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except FileNotFoundError as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        return Response(
            {"detail": "Analyse fehlgeschlagen", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def retry_page_analysis(request, sid: str, page_id: int):
    # Im einfachsten Fall rufst du einfach die gleiche Logik nochmal auf
    return analyse_page(request, sid, page_id)


# -------------------------------------------------------------------
# Glyphs
# -------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_glyphs(request, sid: str):
    job = get_job_or_404_for_user(sid, request.user)
    qs = Glyph.objects.filter(job=job)

    letter = request.GET.get("letter")
    if letter:
        qs = qs.filter(letter=letter)

    qs = qs.order_by("letter", "variant_index")
    serializer = GlyphSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def glyph_detail(request, sid: str, letter: str):
    job = get_job_or_404_for_user(sid, request.user)
    qs = Glyph.objects.filter(job=job, letter=letter).order_by("variant_index")
    serializer = GlyphSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def select_glyph_variant(request, sid: str, letter: str):
    job = get_job_or_404_for_user(sid, request.user)
    serializer = GlyphVariantSelectionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    qs = Glyph.objects.filter(job=job, letter=letter)

    if "glyph_id" in data:
        glyph = get_object_or_404(qs, pk=data["glyph_id"])
    else:
        glyph = get_object_or_404(qs, variant_index=data["variant_index"])

    # alle anderen Defaults für diesen Buchstaben zurücksetzen
    qs.update(is_default=False)
    glyph.is_default = True
    glyph.save(update_fields=["is_default"])

    return Response(GlyphSerializer(glyph).data, status=status.HTTP_200_OK)


# -------------------------------------------------------------------
# Font build + download
# -------------------------------------------------------------------
# list all ttf for a job egal language

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_builds(request, sid: str):
    """
    List all FontBuild entries for a job.
    """
    job = get_job_or_404_for_user(sid, request.user)
    qs = FontBuild.objects.filter(job=job).order_by("-created_at")
    serializer = FontBuildSerializer(qs, many=True)
    return Response(serializer.data)



@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def build_ttf(request, sid: str):
    job = get_job_or_404_for_user(sid, request.user)

    # Sprache aus Request holen, z.B. {"language": "zz"}
    req_serializer = BuildRequestSerializer(data=request.data)
    req_serializer.is_valid(raise_exception=True)
    language = req_serializer.validated_data["language"]

    alphabet = language.alphabet or ""
    alphabet_chars = list(alphabet)

    # Default-Glyphs dieses Jobs
    default_glyphs = Glyph.objects.filter(job=job, is_default=True)
    covered = {g.letter for g in default_glyphs}
    missing = [c for c in alphabet_chars if c not in covered]

    if missing:
        status_data = {
            "language": language.code,
            "ready": False,
            "required_chars": alphabet,
            "missing_chars": "".join(missing),
            "missing_count": len(missing),
        }
        return Response(
            {
                "detail": "Nicht alle Zeichen sind abgedeckt.",
                "status": status_data,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Pfad: media/beefont/jobs/<sid>/build/<JobName>_<lang>.ttf
    media_root = Path(settings.MEDIA_ROOT)
    job_root_rel = job_sid_media(job)            # "beefont/jobs/<sid>"
    build_rel_dir = os.path.join(job_root_rel, "build")
    filename = f"{job.name}_{language.code}.ttf".replace(" ", "_")
    rel_path = os.path.join(build_rel_dir, filename)
    full_path = media_root / rel_path
    full_path.parent.mkdir(parents=True, exist_ok=True)

    # Nur Default-Glyphs, die tatsächlich im Alphabet vorkommen
    glyphs_for_lang = default_glyphs.filter(letter__in=alphabet_chars)

    try:
        # HIER: Service-Funktion über das Modul aufrufen
        build_font.build_ttf(job, language, glyphs_for_lang, full_path)
        success = True
        log = ""
    except Exception as e:
        success = False
        log = str(e)

    font_build, created = FontBuild.objects.update_or_create(
        job=job,
        language=language,
        defaults={
            "ttf_path": rel_path,  # RELATIV zu MEDIA_ROOT
            "success": success,
            "log": log,
        },
    )

    if not success:
        return Response(
            {
                "detail": "TTF-Build fehlgeschlagen.",
                "log": log,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(FontBuildSerializer(font_build).data, status=status.HTTP_200_OK)



@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def download_ttf(request, sid: str, language: str):
    job = get_job_or_404_for_user(sid, request.user)
    lang = get_object_or_404(SupportedLanguage, code=language)
    build = get_object_or_404(FontBuild, job=job, language=lang, success=True)

    if not default_storage.exists(build.ttf_path):
        raise Http404("TTF nicht gefunden")

    file = default_storage.open(build.ttf_path, "rb")
    filename = os.path.basename(build.ttf_path)
    response = FileResponse(file, content_type="font/ttf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def download_job_zip(request, sid: str):
    """
    Erzeuge ein ZIP mit allen erfolgreichen TTFs dieses Jobs.
    Du kannst deine bestehende ZIP-Logik hier einbauen.
    """
    import io
    import zipfile

    job = get_job_or_404_for_user(sid, request.user)
    builds = FontBuild.objects.filter(job=job, success=True)

    if not builds.exists():
        return Response(
            {"detail": "Keine erfolgreichen Builds für diesen Job."},
            status=status.HTTP_404_NOT_FOUND,
        )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for build in builds:
            if default_storage.exists(build.ttf_path):
                with default_storage.open(build.ttf_path, "rb") as f:
                    data = f.read()
                arcname = f"{job.name}_{build.language.code}.ttf".replace(" ", "_")
                zf.writestr(arcname, data)

    buffer.seek(0)
    filename = f"{job.name}_fonts.zip".replace(" ", "_")
    response = HttpResponse(buffer, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def download_default_glyphs_zip(request, sid: str):
    """
    Download a ZIP containing all PNG files for glyphs that are marked
    as default (is_default=True) for this job.

    One file per letter. The archive names are "<LETTER>.png".
    """
    import io
    import zipfile

    job = get_job_or_404_for_user(sid, request.user)

    glyphs = (
        Glyph.objects
        .filter(job=job, is_default=True)
        .order_by("letter", "variant_index")
    )

    if not glyphs.exists():
        return Response(
            {"detail": "No default glyphs available for this job."},
            status=status.HTTP_404_NOT_FOUND,
        )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for g in glyphs:
            rel_path = g.image_path
            if not rel_path:
                continue

            # The storage path is relative to MEDIA_ROOT,
            # but default_storage knows how to resolve it.
            if not default_storage.exists(rel_path):
                continue

            with default_storage.open(rel_path, "rb") as f:
                data = f.read()

            # Default glyph: we use pure letter as file name,
            # relying on the invariant "max one default per letter".
            # Letters like "Ä" will create "Ä.png" – this is OK in a UTF-8 ZIP.
            arcname = f"{g.letter}.png"
            zf.writestr(arcname, data)

    buffer.seek(0)
    filename = f"{job.name}_glyphs_default.zip".replace(" ", "_")
    response = HttpResponse(buffer.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def download_all_glyphs_zip(request, sid: str):
    """
    Download a ZIP containing PNG files for all glyph variants of this job.

    Archive names are "<LETTER>_v<VARIANT>.png", e.g. "A_v0.png".
    """
    import io
    import zipfile

    job = get_job_or_404_for_user(sid, request.user)

    glyphs = (
        Glyph.objects
        .filter(job=job)
        .order_by("letter", "variant_index")
    )

    if not glyphs.exists():
        return Response(
            {"detail": "No glyphs available for this job."},
            status=status.HTTP_404_NOT_FOUND,
        )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for g in glyphs:
            rel_path = g.image_path
            if not rel_path:
                continue

            if not default_storage.exists(rel_path):
                continue

            with default_storage.open(rel_path, "rb") as f:
                data = f.read()

            arcname = f"{g.letter}_v{g.variant_index}.png"
            zf.writestr(arcname, data)

    buffer.seek(0)
    filename = f"{job.name}_glyphs_all.zip".replace(" ", "_")
    response = HttpResponse(buffer.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_glyphs_zip(request, sid: str):
    """
    Upload a ZIP containing PNG glyphs for a job.

    Expected:
      - multipart/form-data with:
          file: the ZIP archive

    ZIP contents:
      - Filenames like "<LETTER>.png"
      - or "<LETTER>_<i>.png"
      - or "subdir/<LETTER>_<i>.png", etc.

    For each file:
      - Take basename, e.g. "A.png", "A_0.png", "Ä_12.png"
      - Strip extension → stem
      - Letter = everything before the first '_' in the stem
          "A"      -> letter="A"
          "A_0"    -> letter="A"
          "Ä_12"   -> letter="Ä"

      - Compute next variant_index for (job, letter):
          last = Glyph.objects.filter(job=job, letter=letter)
                             .order_by('-variant_index').first()
          next_idx = last.variant_index + 1  or 0 if none

      - Save as:
          beefont/jobs/<sid>/glyphs/<LETTER>_v<next_idx>.png

      - Create Glyph entry with variant_index=next_idx, is_default=(next_idx == 0)
    """
    import io
    import zipfile
    import os

    job = get_job_or_404_for_user(sid, request.user)

    upload = request.FILES.get("file")
    if not upload:
        return Response(
            {"detail": "Expected file field 'file' with a ZIP archive."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Try to open the ZIP
    try:
        zip_bytes = upload.read()
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except Exception:
        return Response(
            {"detail": "Invalid ZIP archive."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Ensure we have a JobPage to attach glyphs to.
    # Reuse the first page if present; otherwise create a placeholder.
    page = (
        JobPage.objects
        .filter(job=job)
        .order_by("page_index")
        .first()
    )
    if not page:
        tpl = TemplateDefinition.objects.order_by("code").first()
        if not tpl:
            return Response(
                {"detail": "No TemplateDefinition configured; cannot create placeholder page."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        page = JobPage.objects.create(
            job=job,
            template=tpl,
            page_index=0,
            letters="",
            scan_image_path="",  # no scan, this is an import-only page
        )

    media_root = Path(settings.MEDIA_ROOT)
    job_root_rel = job_sid_media(job)              # "beefont/jobs/<sid>"
    glyphs_rel_dir = os.path.join(job_root_rel, "glyphs")
    glyphs_abs_dir = media_root / glyphs_rel_dir
    glyphs_abs_dir.mkdir(parents=True, exist_ok=True)

    imported = 0
    skipped_non_png = 0
    skipped_empty_letter = 0
    skipped_errors = 0

    for info in zf.infolist():
        # Skip directories
        if info.is_dir():
            continue

        filename = info.filename
        base = os.path.basename(filename)

        if not base:
            continue

        # Only PNG
        if not base.lower().endswith(".png"):
            skipped_non_png += 1
            continue

        stem, _ext = os.path.splitext(base)

        # Letter = part before first "_"
        if "_" in stem:
            letter = stem.split("_", 1)[0]
        else:
            letter = stem

        letter = letter.strip()
        if not letter:
            skipped_empty_letter += 1
            continue

        # Determine next variant index for this job+letter
        last = (
            Glyph.objects
            .filter(job=job, letter=letter)
            .order_by("-variant_index")
            .first()
        )
        next_idx = (last.variant_index + 1) if last else 0

        # Build storage path: beefont/jobs/<sid>/glyphs/<LETTER>_v<idx>.png
        new_filename = f"{letter}_v{next_idx}.png"
        rel_path = os.path.join(glyphs_rel_dir, new_filename)
        abs_path = media_root / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            data = zf.read(info.filename)
        except Exception:
            skipped_errors += 1
            continue

        # Write to storage
        try:
            default_storage.save(rel_path, ContentFile(data))
        except Exception:
            skipped_errors += 1
            continue

        # Create Glyph row
        try:
            Glyph.objects.create(
                job=job,
                page=page,
                cell_index=-1,  # imported, not from a grid cell
                letter=letter,
                variant_index=next_idx,
                image_path=str(rel_path).replace("\\", "/"),
                is_default=(next_idx == 0),
            )
            imported += 1
        except Exception:
            skipped_errors += 1
            # We leave the file on disk, but no DB row.

    zf.close()

    if imported == 0:
        return Response(
            {
                "detail": "No glyphs imported from ZIP.",
                "imported": imported,
                "skipped_non_png": skipped_non_png,
                "skipped_empty_letter": skipped_empty_letter,
                "skipped_errors": skipped_errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Glyphs imported from ZIP.",
            "imported": imported,
            "skipped_non_png": skipped_non_png,
            "skipped_empty_letter": skipped_empty_letter,
            "skipped_errors": skipped_errors,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_glyph_from_png(request, sid: str):
    """
    Upload a single PNG glyph for a job.

    Used by the glyph editor (canvas) or any manual PNG upload.

    Expects multipart/form-data:
      - letter: the glyph character (e.g. "A", "Ä", "5", ".")
      - file:   the PNG image
    """
    import os

    job = get_job_or_404_for_user(sid, request.user)

    letter = (request.data.get("letter") or "").strip()
    upload = request.FILES.get("file")

    if not letter:
        return Response(
            {"detail": "Field 'letter' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not upload:
        return Response(
            {"detail": "Expected file field 'file' with a PNG image."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Ensure we have a JobPage (same pattern as ZIP upload)
    page = (
        JobPage.objects
        .filter(job=job)
        .order_by("page_index")
        .first()
    )
    if not page:
        tpl = TemplateDefinition.objects.order_by("code").first()
        if not tpl:
            return Response(
                {"detail": "No TemplateDefinition configured; cannot create placeholder page."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        page = JobPage.objects.create(
            job=job,
            template=tpl,
            page_index=0,
            letters="",
            scan_image_path="",  # import-only page
        )

    media_root = Path(settings.MEDIA_ROOT)
    job_root_rel = job_sid_media(job)              # "beefont/jobs/<sid>"
    glyphs_rel_dir = os.path.join(job_root_rel, "glyphs")
    (media_root / glyphs_rel_dir).mkdir(parents=True, exist_ok=True)

    # Determine next variant index for this job+letter
    last = (
        Glyph.objects
        .filter(job=job, letter=letter)
        .order_by("-variant_index")
        .first()
    )
    next_idx = (last.variant_index + 1) if last else 0

    # Storage path: beefont/jobs/<sid>/glyphs/<LETTER>_v<idx>.png
    new_filename = f"{letter}_v{next_idx}.png"
    rel_path = os.path.join(glyphs_rel_dir, new_filename)

    try:
        saved_path = default_storage.save(rel_path, upload)
    except Exception as e:
        return Response(
            {"detail": f"Failed to store glyph file: {e}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    glyph = Glyph.objects.create(
        job=job,
        page=page,
        cell_index=-1,  # imported / drawn, not from grid
        letter=letter,
        variant_index=next_idx,
        image_path=str(saved_path).replace("\\", "/"),
        is_default=(next_idx == 0),
    )

    return Response(GlyphSerializer(glyph).data, status=status.HTTP_201_CREATED)

# -------------------------------------------------------------------
# Status per language
# -------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def job_languages_status(request, sid: str):
    job = get_job_or_404_for_user(sid, request.user)
    default_glyphs = Glyph.objects.filter(job=job, is_default=True)

    results = []
    for lang in SupportedLanguage.objects.all():
        alphabet = lang.alphabet or ""
        alphabet_chars = list(alphabet)
        covered = {g.letter for g in default_glyphs}
        missing = [c for c in alphabet_chars if c not in covered]

        results.append(
            {
                "language": lang.code,
                "ready": len(missing) == 0,
                "required_chars": alphabet,
                "missing_chars": "".join(missing),
                "missing_count": len(missing),
            }
        )

    serializer = LanguageStatusSerializer(results, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def job_language_status(request, sid: str, language: str):
    job = get_job_or_404_for_user(sid, request.user)
    lang = get_object_or_404(SupportedLanguage, code=language)

    alphabet = lang.alphabet or ""
    alphabet_chars = list(alphabet)
    default_glyphs = Glyph.objects.filter(job=job, is_default=True)
    covered = {g.letter for g in default_glyphs}
    missing = [c for c in alphabet_chars if c not in covered]

    payload = {
        "language": lang.code,
        "ready": len(missing) == 0,
        "required_chars": alphabet,
        "missing_chars": "".join(missing),
        "missing_count": len(missing),
    }
    serializer = LanguageStatusSerializer(payload)
    return Response(serializer.data)
