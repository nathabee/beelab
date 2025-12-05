# BeeFontCore/services/build_font.py

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
 
from django.conf import settings
from fontTools.ttLib import TTFont
from fontTools.colorLib.builder import buildCOLR, buildCPAL

from .palette import get_palette_for_job
"""
V3-only Font-Build:

- Nimmt Default-Glyphs (Glyph.is_default=True) eines Jobs
- Baut Mapping: letter -> Unicode (ord(letter))
- Konvertiert PNG -> SVG (ImageMagick + potrace)
- Ruft FontForge im Batch-Mode und erzeugt ein TTF

Erwarteter Aufruf aus Views:

    build_ttf(job, language, default_glyphs, out_ttf_path)

wobei:
- job: FontJob
- language: SupportedLanguage (mit .alphabet)
- default_glyphs: QuerySet[Glyph] (idealerweise schon auf letter__in=alphabet gefiltert)
- out_ttf_path: absoluter Pfad zur Zieldatei (Path oder str)
"""


def _find_fontforge() -> str:
    for name in ("fontforge", "fontforge-nox"):
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError("fontforge binary not found (install 'fontforge' in the django image)")


def _png_to_svg(png: Path, svg: Path, timeout: float = 5.0) -> None:
    """
    Convert a single glyph PNG -> SVG using ImageMagick + potrace.

    Annahme:
      - PNG ist bereits eine binarisierte Maske (weißer Hintergrund, schwarze Tinte)
    """
    png = Path(png)
    svg = Path(svg)

    if not png.is_file():
        raise RuntimeError(f"_png_to_svg: PNG not found: {png}")

    svg.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        pgm = td / "glyph.pgm"

        # 1) PNG -> 1-bit PGM
        cmd_convert = [
            "convert",
            str(png),
            "-colorspace",
            "Gray",
            "-threshold",
            "50%",
            "-type",
            "bilevel",
            str(pgm),
        ]
        try:
            subprocess.run(
                cmd_convert,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "ImageMagick 'convert' not found in container (apt-get install imagemagick)."
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"convert timed out on {png}")
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"convert failed for {png} → {pgm}\n"
                f"stdout:\n{e.stdout.decode('utf-8', 'ignore')}\n"
                f"stderr:\n{e.stderr.decode('utf-8', 'ignore')}"
            )

        if not pgm.is_file():
            raise RuntimeError(f"convert did not produce PGM: {pgm}")

        # 2) PGM -> SVG via potrace
        cmd_potrace = [
            "potrace",
            str(pgm),
            "--svg",
            "-o",
            str(svg),
        ]
        try:
            subprocess.run(
                cmd_potrace,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout,
            )
        except FileNotFoundError:
            raise RuntimeError("potrace not found in container (apt-get install potrace).")
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"potrace timed out on {pgm}")
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"potrace failed for {pgm} → {svg}\n"
                f"stdout:\n{e.stdout.decode('utf-8', 'ignore')}\n"
                f"stderr:\n{e.stderr.decode('utf-8', 'ignore')}"
            )

        if not svg.is_file():
            raise RuntimeError(f"potrace did not produce SVG: {svg}")


def _write_fontforge_script(
    script_path: Path,
    svg_dir: Path,
    out_ttf: Path,
    family: str,
    mapping: dict[str, int],
) -> None:
    """
    FontForge-Script:

    - erzeugt eine neue Schrift
    - lädt pro Token das SVG als Outline
    - setzt grobe Breiten
    - generiert TTF
    """
    script = f'''\
import fontforge, psMat, os, sys


font = fontforge.font()
font.encoding = "UnicodeFull"
font.familyname = "{family}"
font.fontname = "{family.replace(" ", "")}"
font.fullname = "{family}"
font.ascent = 900
font.descent = 200

svg_dir = r"""{str(svg_dir)}"""
mapping = {json.dumps(mapping, ensure_ascii=False)}

def svg_path(token):
    p = os.path.join(svg_dir, f"{{token}}.svg")
    return p if os.path.exists(p) else None

count = 0
for token, cp in mapping.items():
    p = svg_path(token)
    if not p:
        continue
    g = font.createChar(cp)
    g.importOutlines(p)
    g.removeOverlap()
    g.simplify()

    # derive advance width from geometry in the SVG
    xmin, ymin, xmax, ymax = g.boundingBox()  # geometry after applying viewBox transform
    pad = 50  # side bearing padding in font units

    # shift outlines so they start at x = pad
    g.transform(psMat.translate(pad - xmin, 0))

    # recompute bbox after translation
    xmin2, ymin2, xmax2, ymax2 = g.boundingBox()

    # advance width = rightmost point + right pad
    g.width = int(xmax2 + pad)

    count += 1

# sicherstellen, dass es ein Leerzeichen gibt
existing_enc = [gg.encoding for gg in font.glyphs()]
if 32 not in existing_enc:
    sp = font.createChar(32)
    sp.width = 500

font.os2_family_class = 2057
font.os2_weight = 400
font.os2_width = 5
font.os2_fstype = 0
font.os2_vendor = "BEE "

font.generate(r"""{str(out_ttf)}""")
print("OK glyphs:", count)
'''
    script_path.write_text(script, encoding="utf-8")


def build_ttf_png (job, language, default_glyphs, out_ttf) -> None:
    """
    V3-Build:

    - `job`           : FontJob
    - `language`      : SupportedLanguage (für Alphabet / Codepoints)
    - `default_glyphs`: QuerySet[Glyph] (idealerweise schon nach letter__in gefiltert)
    - `out_ttf`       : Zielpfad (Path oder str, absolut)

    Mapping-Strategie:
    - Wir setzen voraus, dass Glyph.letter genau ein Unicode-Zeichen ist
      (z.B. 'A', 'Ä', 'ß', 'é').
    - Codepoint = ord(letter).

    Wir ignorieren:
    - V2-Slots, segments/, mapping.json usw.
    """
    media_root = Path(settings.MEDIA_ROOT)
    out_ttf = Path(out_ttf)
    out_ttf.parent.mkdir(parents=True, exist_ok=True)

    alphabet = language.alphabet or ""
    alphabet_chars = set(alphabet)

    mapping: dict[str, int] = {}
    png_sources: dict[str, Path] = {}

    for g in default_glyphs:
        token = g.letter

        # nur Buchstaben, die im Alphabet der Sprache vorkommen
        if token not in alphabet_chars:
            continue

        # wir erwarten 1-Zeichen-Token; Multi-Token könntest du später mappen
        if len(token) != 1:
            continue

        src = media_root / g.image_path
        if not src.is_file():
            continue

        if token not in png_sources:
            png_sources[token] = src
            mapping[token] = ord(token)

    if not mapping:
        raise RuntimeError(
            f"build_ttf: keine passenden Glyphen für Sprache {language.code} "
            f"und Job {job.sid} gefunden."
        )

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        svg_dir = td / "svg"
        tmp_png_dir = td / "png"
        svg_dir.mkdir(parents=True, exist_ok=True)
        tmp_png_dir.mkdir(parents=True, exist_ok=True)

        # PNG → SVG
        for token, src in png_sources.items():
            tmp_png = tmp_png_dir / f"{token}.png"
            shutil.copy2(src, tmp_png)
            svg_path = svg_dir / f"{token}.svg"
            _png_to_svg(tmp_png, svg_path)

        # FontForge-Script schreiben
        script_path = td / "build_font.py"
        family = getattr(job, "base_family", None) or job.name or "BeeHand"
        _write_fontforge_script(script_path, svg_dir, out_ttf, family, mapping)

        # FontForge aufrufen
        ff = _find_fontforge()
        cmd = [ff, "-lang=py", "-script", str(script_path)]
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"fontforge failed ({ff})\n"
                f"stdout:\n{proc.stdout}\n"
                f"stderr:\n{proc.stderr}"
            )

    if not out_ttf.is_file() or out_ttf.stat().st_size == 0:
        raise RuntimeError(f"build_ttf: FontForge hat keine gültige TTF erzeugt: {out_ttf}")



def build_ttf_svg(job, language, default_glyphs, out_ttf) -> None:
    """
    V3-Build (SVG):

    - `job`           : FontJob
    - `language`      : SupportedLanguage (für Alphabet / Codepoints)
    - `default_glyphs`: QuerySet[Glyph] (idealerweise schon nach letter__in gefiltert,
                       und format='svg')
    - `out_ttf`       : Zielpfad (Path oder str, absolut)

    Mapping-Strategie:
    - Glyph.letter ist genau ein Unicode-Zeichen (z.B. 'A', 'Ä', 'ß', 'é').
    - Codepoint = ord(letter).

    Unterschied zur PNG-Pipeline:
    - Wir gehen davon aus, dass `image_path` direkt auf eine SVG-Datei zeigt.
    - Keine Konvertierung über ImageMagick/potrace; wir kopieren nur in ein
      temporäres Verzeichnis mit standardisiertem Namen "<LETTER>.svg".
    """
    media_root = Path(settings.MEDIA_ROOT)
    out_ttf = Path(out_ttf)
    out_ttf.parent.mkdir(parents=True, exist_ok=True)

    alphabet = language.alphabet or ""
    alphabet_chars = set(alphabet)

    mapping: dict[str, int] = {}
    svg_sources: dict[str, Path] = {}

    for g in default_glyphs:
        token = g.letter

        # nur Buchstaben, die im Alphabet der Sprache vorkommen
        if token not in alphabet_chars:
            continue

        # wir erwarten 1-Zeichen-Token; Multi-Token könntest du später mappen
        if len(token) != 1:
            continue

        src = media_root / g.image_path
        if not src.is_file():
            continue

        # Optional: nur .svg mitnehmen
        if src.suffix.lower() != ".svg":
            continue

        if token not in svg_sources:
            svg_sources[token] = src
            mapping[token] = ord(token)

    if not mapping:
        raise RuntimeError(
            f"build_ttf_svg: keine passenden SVG-Glyphen für Sprache {language.code} "
            f"und Job {job.sid} gefunden."
        )

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        svg_dir = td / "svg"
        svg_dir.mkdir(parents=True, exist_ok=True)

        # SVG-Dateien normiert nach "<LETTER>.svg" kopieren
        for token, src in svg_sources.items():
            dest_svg = svg_dir / f"{token}.svg"
            shutil.copy2(src, dest_svg)

        # FontForge-Script schreiben
        script_path = td / "build_font_svg.py"
        family = getattr(job, "base_family", None) or job.name or "BeeHand"
        _write_fontforge_script(script_path, svg_dir, out_ttf, family, mapping)

        # FontForge aufrufen
        ff = _find_fontforge()
        cmd = [ff, "-lang=py", "-script", str(script_path)]
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"fontforge failed ({ff})\n"
                f"stdout:\n{proc.stdout}\n"
                f"stderr:\n{proc.stderr}"
            )

    if not out_ttf.is_file() or out_ttf.stat().st_size == 0:
        raise RuntimeError(f"build_ttf_svg: FontForge hat keine gültige TTF erzeugt: {out_ttf}")


#############################################
# COLOR FONT
#############################################

def _safe_hex_to_rgba_float(hex_color: str, fallback: str) -> tuple[float, float, float, float]:
    try:
        return _hex_to_rgba_float(hex_color)
    except Exception:
        return _hex_to_rgba_float(fallback)


def _hex_to_rgba_float(hex_color: str) -> tuple[float, float, float, float]:
    """
    #RRGGBB or #RRGGBBAA  → (r,g,b,a) as floats 0..1 for buildCPAL.
    """
    hex_color = hex_color.strip()
    if not hex_color.startswith("#"):
        raise ValueError(f"Invalid hex color (missing #): {hex_color}")

    hex_color = hex_color[1:]
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = 255
    elif len(hex_color) == 8:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = int(hex_color[6:8], 16)
    else:
        raise ValueError(f"Invalid hex color length: {hex_color!r}")

    return (r / 255.0, g / 255.0, b / 255.0, a / 255.0)


def _apply_colr_cpal(ttf_path: Path, palette_dict: dict[str, str]) -> None:
    """
    Fügt dem bestehenden TTF eine einfache COLR/CPAL-Struktur hinzu:

    - CPAL:  eine Palette mit [primary, accent, secondary]
    - COLR:  für **alle** Glyphen eine einzelne Layer,
             die die Basisglyphe mit primary (Index 0) zeichnet.

    Das nutzt die Palette pro Job, aber *ignoriert* zunächst alle
    data-beefont-layer-Infos aus dem SVG. Das ist der bewusst einfache
    erste Schritt, den wir später verfeinern können.
    """
    ttf_path = Path(ttf_path)
    if not ttf_path.is_file():
        raise RuntimeError(f"_apply_colr_cpal: TTF not found: {ttf_path}")

    font = TTFont(str(ttf_path))

    # 1) CPAL: eine Palette mit 3 Einträgen
    primary = _safe_hex_to_rgba_float(palette_dict.get("primary", "#000000"), "#000000")
    accent = _safe_hex_to_rgba_float(palette_dict.get("accent", "#ff9900"), "#ff9900")
    secondary = _safe_hex_to_rgba_float(palette_dict.get("secondary", "#ffffff"), "#ffffff")


    palettes = [[primary, accent, secondary]]
    font["CPAL"] = buildCPAL(palettes)

    # 2) COLR v0: jede Glyphe bekommt eine Layer mit colorIndex 0 (primary)
    color_glyphs: dict[str, list[tuple[str, int]]] = {}

    # getBestCmap: codepoint → glyphName, wir wollen aber alle Glyphen
    glyph_order = font.getGlyphOrder()
    for glyph_name in glyph_order:
        # Eine Layer, die die gleiche Glyphe (self) in Palette 0 zeichnet
        color_glyphs[glyph_name] = [(glyph_name, 0)]

    font["COLR"] = buildCOLR(color_glyphs)

    font.save(str(ttf_path))


def build_ttf_svg_color(job, language, default_glyphs, out_ttf) -> None:
    """
    Wie build_ttf_svg, aber fügt nach dem FontForge-Build noch
    COLR/CPAL auf Basis der Job-Palette hinzu.

    Aktuell:
    - Alle Glyphen werden als eine einzige Layer mit 'primary' Farbe angelegt.
    - SVG-Layer-Infos (data-beefont-layer, data-beefont-color) werden NOCH NICHT
      ausgewertet – das ist ein späterer Schritt.
    """
    # Erst normalen SVG-Build machen (schwarz/weiß, nur Outline)
    build_ttf_svg(job, language, default_glyphs, out_ttf)

    # Palette für diesen Job holen (inkl. Defaults)
    palette = get_palette_for_job(job)

    # COLR/CPAL in das vorhandene TTF injizieren
    _apply_colr_cpal(out_ttf, palette)
