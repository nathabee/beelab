# django/BeeFontCore/management/commands/inspect_beefont.py

from pathlib import Path

from django.core.management.base import BaseCommand

from BeeFontCore.services.inspect_font import inspect_font


class Command(BaseCommand):
    help = "Inspect a built BeeFont TTF for a given language."

    def add_arguments(self, parser):
        parser.add_argument("lang_code", help="Language code (e.g. 'de', 'en')")
        parser.add_argument("ttf_path", help="Absolute path to the TTF file")
        parser.add_argument(
            "glyph_names",
            nargs="*",
            help="Optional explicit glyph names to inspect (e.g. A a zero comma)",
        )

    def handle(self, *args, **options):
        lang_code = options["lang_code"]
        ttf_path = Path(options["ttf_path"])
        glyph_names = options["glyph_names"] or []

        inspect_font(lang_code, ttf_path, glyph_names)
