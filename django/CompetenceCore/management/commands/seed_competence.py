from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from django.apps import apps
from seeds.utils import sync_tree

class Command(BaseCommand):
    help = "Seed Competence core media from script_db into MEDIA_ROOT/competencecore"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Clear target before seeding")
        parser.add_argument("--mode", choices=["copy", "symlink"], default="copy")

    def handle(self, *args, **opts):
        app_path = Path(apps.get_app_config("competencecore").path)
        src = app_path / "script_db" / "competence"
        dst = Path(settings.MEDIA_ROOT) / "competence"

        ok = sync_tree(src, dst, clear=opts["clear"], mode=opts["mode"])
        if ok:
            self.stdout.write(self.style.SUCCESS(f"CompetenceCore seed → {dst}"))
        else:
            self.stdout.write(self.style.WARNING(f"CompetenceCore seed not found: {src} (skipping)"))
