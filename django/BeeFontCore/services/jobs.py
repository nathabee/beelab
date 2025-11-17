# BeeFontCore/services/jobs.py
import json
from pathlib import Path
from django.conf import settings

from BeeFontCore.models import TemplateSlot
_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"


def init_template_slots_for_job(job):
    """
    Create TemplateSlot rows for the given job, based on templates on disk.

    - filter by paper.name == job.page_format
    - filter by language contained in page["name"], e.g. '_DE_'
    """
    slots = []

    for p in _TEMPLATE_DIR.glob("*.json"):
        data = json.loads(p.read_text(encoding="utf-8"))

        paper = data.get("paper", {})
        if (paper.get("name") or "").upper() != job.page_format.upper():
            continue

        # New grouped format
        if "pages" in data:
            for page in data["pages"]:
                name = page.get("name")
                if not name:
                    continue
                if f"_{job.language}_" not in name:
                    continue

                slots.append(
                    TemplateSlot(
                        job=job,
                        template_code=name,
                        page_index=0,
                    )
                )
        else:
            # Legacy format: single page per file
            name = p.stem
            if f"_{job.language}_" not in name:
                continue
            slots.append(
                TemplateSlot(
                    job=job,
                    template_code=name,
                    page_index=0,
                )
            )

    if slots:
        TemplateSlot.objects.bulk_create(slots)
