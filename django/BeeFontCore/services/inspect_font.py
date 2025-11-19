# django/BeeFontCore/services/inspect_font.py

import sys
from pathlib import Path

#from django.conf import settings
from fontTools.ttLib import TTFont 

# Fallback probe set if we cannot resolve a language alphabet
DEFAULT_NAMES_TO_CHECK = ["A", "a", "zero", "comma", "adieresis", "germandbls"]


def inspect_glyph(font: TTFont, name: str):
    glyf_table = font["glyf"]
    hmtx_table = font["hmtx"]

    if name not in glyf_table.glyphs:
        print(f"{name}: NOT IN glyf table")
        return

    g = glyf_table[name]
    n_contours = getattr(g, "numberOfContours", None)
    bounds = (
        getattr(g, "xMin", None),
        getattr(g, "yMin", None),
        getattr(g, "xMax", None),
        getattr(g, "yMax", None),
    )
    width, lsb = hmtx_table.metrics.get(name, (None, None))

    print(f"{name}: contours={n_contours}, bounds={bounds}, width={width}, lsb={lsb}")


def names_from_language_alphabet(font: TTFont, lang_code: str) -> list[str]:
    """
    Try to derive glyph names from the SupportedLanguage.alphabet
    for the given lang_code, using the font's cmap.

    If anything goes wrong, fall back to DEFAULT_NAMES_TO_CHECK.
    """ 
    try:
        import django
        #import os
        #os.environ["DJANGO_SETTINGS_MODULE"] = "config"
        django.setup()
        from BeeFontCore.models import SupportedLanguage  # type: ignore
    except Exception as e:  # nosec - diagnostic
        print(f"WARNING: Django / SupportedLanguage not available: {e}")
        return DEFAULT_NAMES_TO_CHECK

    try:
        lang = SupportedLanguage.objects.get(code=lang_code)
    except SupportedLanguage.DoesNotExist:
        print(f"WARNING: SupportedLanguage '{lang_code}' not found, using default probes.")
        return DEFAULT_NAMES_TO_CHECK

    alphabet = lang.alphabet or ""
    if not alphabet:
        print(f"WARNING: SupportedLanguage '{lang_code}' has empty alphabet, using default probes.")
        return DEFAULT_NAMES_TO_CHECK

    cmap = font.getBestCmap() or {}
    glyph_names: list[str] = []
    missing_chars: list[str] = []

    for ch in alphabet:
        cp = ord(ch)
        name = cmap.get(cp)
        if name:
            glyph_names.append(name)
        else:
            missing_chars.append(ch)

    if missing_chars:
        missing_display = "".join(missing_chars)
        print(f"Alphabet chars missing in cmap for '{lang_code}': '{missing_display}'")

    if not glyph_names:
        print(f"WARNING: No glyph names could be resolved from alphabet for '{lang_code}', using default probes.")
        return DEFAULT_NAMES_TO_CHECK

    # De-duplicate while preserving order
    seen = set()
    unique = []
    for n in glyph_names:
        if n not in seen:
            seen.add(n)
            unique.append(n)
    return unique

def inspect_font(lang_code: str, ttf_path: Path, extra_names: list[str] | None = None) -> None:
    """
    Core logic used by both:
      - CLI (python inspect_font.py ...)
      - Django management command (manage.py inspect_font ...)
    """
    ttf_path = Path(ttf_path)
    if not ttf_path.exists():
        print(f"TTF not found: {ttf_path}")
        return

    font = TTFont(str(ttf_path))

    print("Path:", ttf_path)
    print("Family:", font["name"].getDebugName(1))
    print("Subfamily:", font["name"].getDebugName(2))
    print("Num glyphs:", font["maxp"].numGlyphs)
    print()

    if extra_names:
        names = extra_names
    elif lang_code:
        names = names_from_language_alphabet(font, lang_code)
    else:
        names = DEFAULT_NAMES_TO_CHECK

    print("Inspecting glyphs:", ", ".join(names))
    print()

    for name in names:
        inspect_glyph(font, name)


def main():
    """
    CLI usage:

      1) Language-aware:
         python inspect_font.py <LANGCODE> /path/to/font.ttf

      2) Explicit glyph names:
         python inspect_font.py <LANGCODE> /path/to/font.ttf A a zero comma ...
    """
    if len(sys.argv) < 3:
        print("Usage: python inspect_font.py <LANGCODE> /path/to/font.ttf [glyph_names...]")
        sys.exit(1)

    lang_code = sys.argv[1]
    ttf_path = Path(sys.argv[2])
    extra_names: list[str] = sys.argv[3:] if len(sys.argv) >= 4 else []

    inspect_font(lang_code, ttf_path, extra_names)


if __name__ == "__main__":
    main()