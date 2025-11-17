# BeeFontCore/views.py
import io
import json
import os
import shutil
from pathlib import Path
import secrets

from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_GET

from PIL import Image

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    parser_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Job, TemplateSlot
from .serializers import JobOut
from .services import template_utils
from .services.segment import analyse_template_slot  # you will implement this
from .services.build_font import build_bundle        # you will adapt this
from .services.jobs import init_template_slots_for_job

_TEMPLATE_DIR = Path(__file__).resolve().parent / "services" / "templates"


# -----------------------------
# Helpers / constants
# -----------------------------

ACTIVE_JOB_STATUSES = (
    Job.STATUS_DRAFT,
    Job.STATUS_IN_PROGRESS,
    Job.STATUS_READY_FOR_FONT,
)
MAX_ACTIVE_JOBS_PER_USER = 3


def _get_job_or_404(sid: str) -> Job:
    try:
        return Job.objects.get(sid=sid)
    except Job.DoesNotExist:
        raise Http404("Job not found")


def _ensure_segments_dir(job: Job) -> Path:
    if job.segments_dir:
        segdir = Path(job.segments_dir)
    else:
        media_root = Path(settings.MEDIA_ROOT)
        segdir = media_root / "beefont" / "segments" / job.sid
        segdir.mkdir(parents=True, exist_ok=True)
        job.segments_dir = str(segdir)
        job.save(update_fields=["segments_dir"])
    return segdir


# -----------------------------
# Templates catalogue
# -----------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def list_templates(request):
    """
    List available template definitions (optionally filtered by lang).
    Supports both:
      - legacy: one template per JSON (paper+grid+order_file at root)
      - new:    grouped JSON with paper+mapping_file+pages[]
    """
    lang = (request.GET.get("lang") or "").upper()
    items = []

    for p in sorted(_TEMPLATE_DIR.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        filename = p.stem

        # New format: grouped pages
        if "pages" in data:
            paper = data.get("paper", {})
            mapping_file = data.get("mapping_file")
            for page in data["pages"]:
                name = page.get("name")
                if not name:
                    continue

                # language filter uses page name, e.g. "A4_DE_6x5_1"
                if lang and f"_{lang}_" not in name:
                    continue

                order_file = page.get("order_file")
                order_fp = _TEMPLATE_DIR / (order_file or "order/order_10x10.json")
                if order_fp.exists():
                    order = json.loads(order_fp.read_text(encoding="utf-8"))
                else:
                    order = []

                items.append(
                    {
                        "name": name,
                        "paper": paper,
                        "grid": page.get("grid", {}),
                        "order_len": len(order),
                        "order_file": order_file,
                        "mapping_file": mapping_file,
                    }
                )
        else:
            # Legacy format: single template per file
            name = filename
            if lang and f"_{lang}_" not in name:
                continue

            order_file = data.get("order_file", "order/order_10x10.json")
            order_fp = _TEMPLATE_DIR / order_file
            if order_fp.exists():
                order = json.loads(order_fp.read_text(encoding="utf-8"))
            else:
                order = []

            items.append(
                {
                    "name": name,
                    "paper": data.get("paper", {}),
                    "grid": data.get("grid", {}),
                    "order_len": len(order),
                    "order_file": order_file,
                    "mapping_file": data.get("mapping_file"),
                }
            )

    return Response({"lang": lang or None, "templates": items})


def _find_template_page(name: str):
    """
    Locate a template page by its name (e.g. 'A4_DE_6x5_1').

    Returns (tpl_page_dict, order_file) where tpl_page_dict has:
      - paper
      - grid
      - fiducials
      - mapping_file
    """
    for p in _TEMPLATE_DIR.glob("*.json"):
        data = json.loads(p.read_text(encoding="utf-8"))

        # New grouped format
        if "pages" in data:
            for page in data["pages"]:
                if page.get("name") == name:
                    tpl_page = {
                        "paper": data.get("paper", {}),
                        "grid": page.get("grid", {}),
                        "fiducials": page.get(
                            "fiducials", data.get("fiducials", {})
                        ),
                        "mapping_file": data.get("mapping_file"),
                    }
                    return tpl_page, page.get("order_file")

        # Legacy single-page format
        if p.stem == name:
            tpl_page = data
            return tpl_page, data.get("order_file")

    return None, None


@require_GET
def template_image(request, name: str):
    """
    Return rendered PNG version of a template (blank or prefilled).
    Supports grouped templates with pages[].
    """
    mode = request.GET.get("mode", "blank")
    tpl, order_file = _find_template_page(name)
    if not tpl:
        raise Http404("unknown template")

    order_fp = _TEMPLATE_DIR / (order_file or "order/order_10x10.json")
    if order_fp.exists():
        order = json.loads(order_fp.read_text(encoding="utf-8"))
    else:
        order = []

    if mode == "prefill":
        im = template_utils.render_template_png(
            tpl, order, prefill=True, show_indices=False
        )
    elif mode == "blankpure":
        im = template_utils.render_template_png(
            tpl, [], prefill=False, show_indices=False
        )
    else:  # "blank"
        im = template_utils.render_template_png(
            tpl, order, prefill=False, show_indices=True
        )

    buf = io.BytesIO()
    im.save(buf, format="PNG")
    resp = HttpResponse(buf.getvalue(), content_type="image/png")
    resp["Cache-Control"] = "public, max-age=3600"
    resp["Content-Disposition"] = f'inline; filename="{name}_{mode}.png"'
    return resp


# -----------------------------
# Jobs: list / create
# -----------------------------

class JobListCreate(APIView):
    """
    GET: list jobs for current user (or all, if no owner field yet)
    POST: create new BeeFont job (no image upload here).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def get(self, request):
        # When you add ownership, filter by owner=request.user
        qs = Job.objects.order_by("-created_at")[:50]
        data = [JobOut(j).data for j in qs]
        return Response({"results": data})

    def post(self, request):
        """
        Create a new job:
        payload:
        {
          "family": "MyHand",
          "language": "DE",
          "page_format": "A4",
          "characters": "ABC...äöüß"
        }
        """
        family = request.data.get("family") or "MyHand"
        language = (request.data.get("language") or "DE").upper()
        page_format = (request.data.get("page_format") or "A4").upper()
        characters = request.data.get("characters") or ""

        if not characters:
            return Response(
                {"detail": "characters required (string of glyphs to include)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # enforce per-user active job limit (when owner exists)
        active_qs = Job.objects.filter(status__in=ACTIVE_JOB_STATUSES)
         # TODO filter by owner later
        
        if active_qs.count() >= MAX_ACTIVE_JOBS_PER_USER:
            return Response(
                {
                    "detail": f"maximum of {MAX_ACTIVE_JOBS_PER_USER} active jobs reached"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        sid = secrets.token_hex(8)  # e.g. 'a3b4c5d6e7f8abcd'

        job = Job.objects.create(
            sid=sid,
            user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            family=family,
            language=language,
            page_format=page_format,
            characters=characters,
            status=Job.STATUS_DRAFT,
        )

        # Create slots from templates on disk (grouped or legacy)
        init_template_slots_for_job(job)

        return Response(JobOut(job).data, status=status.HTTP_201_CREATED)
 


# -----------------------------
# Job detail / delete
# -----------------------------

class JobDetailDelete(APIView):
    """
    GET: job detail
    DELETE: delete job and all related files
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, sid):
        job = _get_job_or_404(sid)
        return Response(JobOut(job).data)

    def delete(self, request, sid):
        job = _get_job_or_404(sid)

        # delete ttf + zip
        media_root = Path(settings.MEDIA_ROOT)
        for f in (job.ttf_path, job.zip_path):
            if f:
                try:
                    (media_root / f.name).unlink(missing_ok=True)
                except Exception:
                    pass

        # delete segments dir
        if job.segments_dir:
            try:
                shutil.rmtree(job.segments_dir, ignore_errors=True)
            except Exception:
                pass

        # delete scans directory if you have one on the model (optional)
        # if job.scans_dir: ...

        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------
# Font build + download
# -----------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def build_ttf(request, sid):
    """
    Trigger TTF build for a job (using canonical glyphs).

    Expects all required letters to have canonical glyphs.
    """ 
    job = _get_job_or_404(sid)

    # Ensure segments dir exists
    segdir = _ensure_segments_dir(job)

    # You may want to validate that every required char has a canonical file here.
    missing = []
    chars = job.characters or ""
    for ch in chars:
        canonical = segdir / f"{ch}.png"
        if not canonical.exists():
            missing.append(ch)

    if missing:
        return Response(
            {
                "detail": "missing canonical glyphs",
                "missing": missing,
            },
            status=status.HTTP_409_CONFLICT,
        )

    try:
        # adjust build_bundle to only rely on canonical glyphs for this job
        ttf_path, zip_path = build_bundle(job, segdir)
        media_root = Path(settings.MEDIA_ROOT)
        rel_ttf = os.path.relpath(ttf_path, str(media_root)).replace("\\", "/")
        rel_zip = os.path.relpath(zip_path, str(media_root)).replace("\\", "/")
        job.ttf_path = rel_ttf
        job.zip_path = rel_zip
        job.status = "FONT_GENERATED"
        job.save(update_fields=["ttf_path", "zip_path", "status"])
    except Exception as e:
        job.status = "FAILED"
        job.log = str(e)[:4000]
        job.save(update_fields=["status", "log"])
        return Response(
            {"detail": "font build failed", "error": job.log},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(JobOut(job).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def download_ttf(request, sid):
    job = _get_job_or_404(sid)
    if not job.ttf_path:
        return Response({"detail": "TTF not ready"}, status=409)

    media_root = Path(settings.MEDIA_ROOT)
    # job.ttf_path is a FieldFile -> use .name or str()
    rel_path = job.ttf_path.name
    fp = media_root / rel_path

    if not fp.exists():
        raise Http404

    with open(fp, "rb") as f:
        resp = HttpResponse(f.read(), content_type="font/ttf")
    resp["Content-Disposition"] = f'attachment; filename="{fp.name}"'
    resp["Cache-Control"] = "public, max-age=86400"
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def download_zip(request, sid):
    job = _get_job_or_404(sid)
    if not job.zip_path:
        return Response({"detail": "ZIP not ready"}, status=409)

    media_root = Path(settings.MEDIA_ROOT)
    rel_path = job.zip_path.name
    fp = media_root / rel_path

    if not fp.exists():
        raise Http404

    with open(fp, "rb") as f:
        resp = HttpResponse(f.read(), content_type="application/zip")
    resp["Content-Disposition"] = f'attachment; filename="{fp.name}"'
    resp["Cache-Control"] = "public, max-age=86400"
    return resp



# -----------------------------
# TemplateSlot: upload / analyse / retry
# -----------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_slots(request, sid):
    """
    List TemplateSlots for a job.
    """
    job = _get_job_or_404(sid)
    slots = TemplateSlot.objects.filter(job=job).order_by("id")
    data = []
    for s in slots:
        data.append(
            {
                "id": s.id,
                "template_code": s.template_code,
                "page_index": s.page_index,
                "status": s.status,
                "scan_original_path": s.scan_original_path,
                "scan_processed_path": s.scan_processed_path,
            }
        )
    return Response({"results": data})

 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_slot_scan(request, slot_id: int):
    """
    Upload a scan for a given TemplateSlot (one page attempt).
    """
    try:
        slot = TemplateSlot.objects.get(id=slot_id)
    except TemplateSlot.DoesNotExist:
        raise Http404("slot not found")

    img = request.FILES.get("image")
    if not img:
        return Response({"detail": "image missing"}, status=400)
    if not (img.content_type or "").startswith("image/"):
        return Response({"detail": "image/* required"}, status=400)

    job = slot.job
    media_root = Path(settings.MEDIA_ROOT)

    # NEW: store under media/beefont/pages/<sid>/
    scans_dir = media_root / "beefont" / "pages" / job.sid
    scans_dir.mkdir(parents=True, exist_ok=True)

    raw_name = f"{slot.template_code}_{slot.page_index}_raw.png"
    raw_path = scans_dir / raw_name

    # Save raw image
    with open(raw_path, "wb") as f:
        for chunk in img.chunks():
            f.write(chunk)

    # Store RELATIVE path (cleaner, matches processed)
    raw_rel = raw_path.relative_to(media_root)
    slot.scan_original_path = str(raw_rel).replace("\\", "/")
    slot.status = TemplateSlot.STATUS_UPLOADED
    slot.save(update_fields=["scan_original_path", "status"])

    return Response(
        {
            "slot_id": slot.id,
            "scan_original_path": slot.scan_original_path,
            "status": slot.status,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyse_slot(request, slot_id: int):
    """
    Run analysis on a TemplateSlot's current scan.
    This will:
      - detect FIDs / grid
      - extract non-empty glyphs
      - write variant files segment/<job>/<LETTER>_<page_index>.png
      - update scan_processed_path, status
    """
    try:
        slot = TemplateSlot.objects.get(id=slot_id)
    except TemplateSlot.DoesNotExist:
        raise Http404("slot not found")

    if not slot.scan_original_path:
        return Response(
            {"detail": "no scan uploaded for this slot"}, status=status.HTTP_400_BAD_REQUEST
        )

    job = slot.job
    segdir = _ensure_segments_dir(job)

    try:
        processed_path = analyse_template_slot(job, slot, segdir)
        slot.scan_processed_path = str(processed_path)
        slot.status = TemplateSlot.STATUS_ANALYZED
        slot.save(update_fields=["scan_processed_path", "status"])
    except Exception as e:
        slot.status =  TemplateSlot.STATUS_ERROR
        slot.last_error_message = str(e)[:1000]
        slot.save(update_fields=["status", "last_error_message"])
        return Response(
            {"detail": "analysis failed", "error": slot.last_error_message},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "slot_id": slot.id,
            "scan_processed_path": slot.scan_processed_path,
            "status": slot.status,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def retry_slot(request, slot_id: int):
    """
    Prepare a TemplateSlot for a new attempt:
      - increment page_index
      - clear scan paths and status
    Next, frontend should upload a new scan to this slot.
    """
    try:
        slot = TemplateSlot.objects.get(id=slot_id)
    except TemplateSlot.DoesNotExist:
        raise Http404("slot not found")

    slot.page_index += 1
    slot.scan_original_path = ""
    slot.scan_processed_path = ""
    slot.status =  TemplateSlot.STATUS_NO_SCAN
    slot.save(update_fields=["page_index", "scan_original_path", "scan_processed_path", "status"])

    return Response(
        {
            "slot_id": slot.id,
            "page_index": slot.page_index,
            "status": slot.status,
        }
    )


# -----------------------------
# Glyphs: variants + selection
# -----------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_glyphs(request, sid):
    """
    List glyphs for a job:
      - canonical file presence
      - available variant files and page_index
    """
    job = _get_job_or_404(sid)
    segdir = Path(job.segments_dir or "")
    if not segdir.exists():
        return Response({"glyphs": []})

    chars = job.characters or ""

    glyphs = []

    for ch in chars:
        canonical = segdir / f"{ch}.png"
        variants = sorted(segdir.glob(f"{ch}_*.png"))
        glyphs.append(
            {
                "letter": ch,
                "canonical": canonical.name if canonical.exists() else None,
                "variants": [p.name for p in variants],
            }
        )

    return Response({"glyphs": glyphs})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def glyph_detail(request, sid, letter):
    """
    Detail for one letter: canonical and variant list.
    """
    job = _get_job_or_404(sid)
    segdir = Path(job.segments_dir or "")
    if not segdir.exists():
        return Response(
            {"letter": letter, "canonical": None, "variants": []},
            status=status.HTTP_200_OK,
        )

    canonical = segdir / f"{letter}.png"
    variants = sorted(segdir.glob(f"{letter}_*.png"))
    return Response(
        {
            "letter": letter,
            "canonical": canonical.name if canonical.exists() else None,
            "variants": [p.name for p in variants],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_glyph_variant(request, sid, letter):
    """
    Promote one variant to canonical:
      body: { "page_index": 5, "delete_others": true|false }
      copies:
        segment/<job>/<letter>_5.png -> segment/<job>/<letter>.png
      optionally deletes other variants for that letter.
    """
    job = _get_job_or_404(sid)
    segdir = _ensure_segments_dir(job)

    try:
        page_index = int(request.data.get("page_index"))
    except (TypeError, ValueError):
        return Response(
            {"detail": "page_index (int) required"}, status=status.HTTP_400_BAD_REQUEST
        )

    delete_others = bool(request.data.get("delete_others", False))

    variant_path = segdir / f"{letter}_{page_index}.png"
    if not variant_path.exists():
        return Response(
            {
                "detail": "variant not found",
                "expected": variant_path.name,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    canonical_path = segdir / f"{letter}.png"

    # copy variant -> canonical
    canonical_path.write_bytes(variant_path.read_bytes())

    # optionally delete other variants
    if delete_others:
        for p in segdir.glob(f"{letter}_*.png"):
            if p.name != variant_path.name:
                try:
                    p.unlink()
                except Exception:
                    pass

    return Response(
        {
            "letter": letter,
            "canonical": canonical_path.name,
            "used_variant": variant_path.name,
        }
    )
