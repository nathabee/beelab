# BeeFontCore/views.py
import io, json, os, uuid
from pathlib import Path

from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_GET
from django.conf import settings
from PIL import Image

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes   # ✅
from rest_framework.permissions import IsAuthenticated, AllowAny     # ✅

from .models import Job
from .serializers import JobOut
from .services import template_utils
from .services.segment import segment_sheet, _load_template
from .services.build_font import build_bundle

TEMPLATES_DIR = Path(__file__).resolve().parent / "services" / "templates"


# LIST jobs
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_jobs(request):
    qs = Job.objects.order_by("-created_at")[:50]  # scope to requester if/when you add owner
    data = [
        {"sid": j.sid, "created_at": j.created_at.isoformat(),
         "status": j.status, "family": j.family,
         "ttf_path": j.ttf_path.url if j.ttf_path else None,
         "zip_path": j.zip_path.url if j.zip_path else None}
        for j in qs
    ]
    return Response({"results": data})

# DOWNLOAD TTF
@api_view(["GET"])
@permission_classes([AllowAny])  # or IsAuthenticated if you prefer
def download_ttf(request, sid):
    try:
        j = Job.objects.get(sid=sid)
    except Job.DoesNotExist:
        raise Http404
    if not j.ttf_path:
        return Response({"detail": "TTF not ready"}, status=409)
    fp = Path(settings.MEDIA_ROOT) / j.ttf_path.name
    if not fp.exists():
        raise Http404
    with open(fp, "rb") as f:
        resp = HttpResponse(f.read(), content_type="font/ttf")
    resp["Content-Disposition"] = f'attachment; filename="{Path(j.ttf_path.name).name}"'
    resp["Cache-Control"] = "public, max-age=86400"
    return resp

# DOWNLOAD ZIP
@api_view(["GET"])
@permission_classes([AllowAny])
def download_zip(request, sid):
    try:
        j = Job.objects.get(sid=sid)
    except Job.DoesNotExist:
        raise Http404
    if not j.zip_path:
        return Response({"detail": "ZIP not ready"}, status=409)
    fp = Path(settings.MEDIA_ROOT) / j.zip_path.name
    if not fp.exists():
        raise Http404
    with open(fp, "rb") as f:
        resp = HttpResponse(f.read(), content_type="application/zip")
    resp["Content-Disposition"] = f'attachment; filename="{Path(j.zip_path.name).name}"'
    resp["Cache-Control"] = "public, max-age=86400"
    return resp

# LIST segments (JSON)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_segments(request, sid):
    try:
        j = Job.objects.get(sid=sid)
    except Job.DoesNotExist:
        raise Http404
    segdir = Path(j.segments_dir or "")
    if not segdir.exists():
        return Response({"segments": []})
    files = sorted(p.name for p in segdir.glob("*.png"))
    return Response({"segments": files})

# DELETE job (optional)
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_job(request, sid):
    try:
        j = Job.objects.get(sid=sid)
    except Job.DoesNotExist:
        return Response(status=204)
    # optionally remove files on disk
    for f in (j.ttf_path, j.zip_path):
        if f:
            try: (Path(settings.MEDIA_ROOT) / f.name).unlink(missing_ok=True)
            except Exception: pass
    # remove segments dir
    if j.segments_dir:
        try:
            import shutil
            shutil.rmtree(j.segments_dir, ignore_errors=True)
        except Exception:
            pass
    j.delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_templates(request):
    lang = (request.GET.get("lang") or "").upper()
    items = []
    for p in sorted(TEMPLATES_DIR.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        name = p.stem
        if lang and f"_{lang}_" not in name:
            continue
        order_fp = TEMPLATES_DIR / data.get("order_file","order/order_10x10.json")
        order = json.loads(order_fp.read_text(encoding="utf-8")) if order_fp.exists() else []
        items.append({
            "name": name,
            "paper": data.get("paper", {}),
            "grid": data.get("grid", {}),
            "order_len": len(order),
            "order_file": data.get("order_file"),
            "mapping_file": data.get("mapping_file"),
        })
    return Response({"lang": lang or None, "templates": items})   # ✅ use DRF Response


@require_GET
def template_image(request, name: str):
    mode = request.GET.get("mode", "blank")
    tpl_fp = TEMPLATES_DIR / f"{name}.json"
    if not tpl_fp.exists():
        raise Http404("unknown template")
    tpl = json.loads(tpl_fp.read_text(encoding="utf-8"))

    order_fp = TEMPLATES_DIR / tpl.get("order_file", "order/order_10x10.json")
    order = json.loads(order_fp.read_text(encoding="utf-8")) if order_fp.exists() else []

    if mode == "prefill":
        im = template_utils.render_template_png(tpl, order, prefill=True,  show_indices=False)
    elif mode == "blankpure":
        im = template_utils.render_template_png(tpl, [],    prefill=False, show_indices=False)
    else:  # "blank"
        im = template_utils.render_template_png(tpl, order, prefill=False, show_indices=True)

    buf = io.BytesIO()
    im.save(buf, format="PNG")
    resp = HttpResponse(buf.getvalue(), content_type="image/png")
    resp["Cache-Control"] = "public, max-age=3600"
    resp["Content-Disposition"] = f'inline; filename="{name}_{mode}.png"'
    return resp



class CreateJob(APIView):
    def post(self, request):
        img = request.FILES.get("image")
        family = request.data.get("family") or "MyHand"
        template = request.data.get("template_name") or "A4_10x10"

        if not img:
            return Response({"detail": "image missing"}, status=400)

        #Reject non-image uploads early
        if img and not (img.content_type or "").startswith(("image/",)):
            return Response({"detail": "image/* required"}, status=400)


        # NEW: validate template_name
        tpl = _load_template(template)
        if not tpl:
            return Response({"detail": f"unknown template '{template}'"}, status=400)

 
        sid = uuid.uuid4().hex[:12]
        job = Job.objects.create(sid=sid, status="processing", family=family, template_name=template, upload=img)
        try:
            seg_dir = segment_sheet(job)
            job.segments_dir = seg_dir
            ttf_path, zip_path = build_bundle(job, seg_dir)
            media_root = Path(settings.MEDIA_ROOT)
            rel_ttf = os.path.relpath(ttf_path, str(media_root)).replace("\\", "/")
            rel_zip = os.path.relpath(zip_path, str(media_root)).replace("\\", "/")
            job.ttf_path = rel_ttf
            job.zip_path = rel_zip

            job.status = "done"
        except Exception as e:
            job.status = "failed"
            job.log = str(e)[:4000]
        job.save()
        return Response(JobOut(job).data, status=status.HTTP_201_CREATED)

class GetJob(APIView):
    def get(self, request, sid):
        try:
            job = Job.objects.get(sid=sid)
        except Job.DoesNotExist:
            return Response({"detail":"not found"}, status=404)
        return Response(JobOut(job).data)
