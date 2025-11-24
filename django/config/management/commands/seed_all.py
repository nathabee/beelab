from django.core.management.base import BaseCommand
from django.core.management import call_command, get_commands
from django.apps import apps

# map app_label -> command name (keeps control explicit)
SEED_COMMANDS = {
    "pomolobeecore": "seed_pomolobee",
    "competencecore": "seed_competence",
}

class Command(BaseCommand):
    help = "Run seeders for all installed apps that define one."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true")
        parser.add_argument("--mode", choices=["copy", "symlink"], default="copy")
        parser.add_argument("--apps", help="Comma-separated subset of app labels to seed")

    def handle(self, *args, **opts):
        available = get_commands()  # name -> module path
        subset = None
        if opts.get("apps"):
            subset = {a.strip() for a in opts["apps"].split(",")}

        for app_label, cmd in SEED_COMMANDS.items():
            if subset and app_label not in subset:
                continue
            if not apps.is_installed(app_label):
                self.stdout.write(f"Skipping {app_label} (not installed).")
                continue
            if cmd not in available:
                self.stdout.write(f"Skipping {app_label} (no '{cmd}' command).")
                continue
            self.stdout.write(self.style.NOTICE(f"→ {app_label}"))
            call_command(cmd, clear=opts["clear"], mode=opts["mode"])
        self.stdout.write(self.style.SUCCESS("Done."))
