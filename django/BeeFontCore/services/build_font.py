# BeeFontCore/services/build_font.py

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
 
from django.conf import settings
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.colorLib.builder import buildCOLR, buildCPAL

from .palette import get_palette_for_job





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

def _write_fontforge_script_svg_color(
    script_path: Path,
    svg_dir: Path,
    out_ttf: Path,
    family: str,
    mapping: dict[str, int],
) -> None:
    """
    FontForge-Script für COLOR-Build:

    - Für jeden Token (z.B. "A"):
      - Basis-Glyphe mit Codepoint cp und Name token
        → importiert PRIMARY-SVG (falls vorhanden) für Monochrom-Fallback
      - Layer-Glyphen:
        token.primary, token.accent, token.secondary
        → importieren jeweils Slot-SVG, gleiche Breite wie Basis

    - Die eigentliche COLR/CPAL-Erstellung passiert danach in Python.
    """
    # JSON-Dump von mapping, damit wir in FontForge-Python drankommen
    mapping_json = json.dumps(mapping, ensure_ascii=False)

    script = f'''\
import fontforge, psMat, os, sys, json

font = fontforge.font()
font.encoding = "UnicodeFull"
font.familyname = "{family}"
font.fontname = "{family.replace(" ", "")}"
font.fullname = "{family}"
font.ascent = 900
font.descent = 200

svg_dir = r"""{str(svg_dir)}"""
mapping = json.loads(r"""{mapping_json}""")

SLOTS = ["primary", "accent", "secondary"]

def slot_svg_path(token, slot):
    fname = f"{{token}}__{{slot}}.svg"
    p = os.path.join(svg_dir, fname)
    return p if os.path.exists(p) else None

def import_glyph_from_svg(g, svg_path):
    g.importOutlines(svg_path)
    g.removeOverlap()
    g.simplify()

    # Breite aus Bounding Box ableiten
    xmin, ymin, xmax, ymax = g.boundingBox()
    pad = 50
    g.transform(psMat.translate(pad - xmin, 0))
    xmin2, ymin2, xmax2, ymax2 = g.boundingBox()
    g.width = int(xmax2 + pad)
    return g.width

count = 0

for token, cp in mapping.items():
    # Basis: primäre Form
    primary_path = slot_svg_path(token, "primary")
    base_width = 600  # default

    if primary_path:
        g_base = font.createChar(cp, token)
        base_width = import_glyph_from_svg(g_base, primary_path)

        # Layer-Glyphe für primary
        g_primary = font.createChar(-1, f"{{token}}.primary")
        import_glyph_from_svg(g_primary, primary_path)
        g_primary.width = base_width
    else:
        # Fallback: nimm den ersten verfügbaren Slot als Basis
        g_base = font.createChar(cp, token)
        used_any = False
        for slot in SLOTS:
            p = slot_svg_path(token, slot)
            if not p:
                continue
            base_width = import_glyph_from_svg(g_base, p)
            used_any = True
            # Layer-Glyphe für diesen Slot
            g_layer = font.createChar(-1, f"{{token}}.{{slot}}")
            import_glyph_from_svg(g_layer, p)
            g_layer.width = base_width
            break

        if not used_any:
            # gar kein SVG → nächster Token
            continue

    # Weitere Slots (accent, secondary)
    for slot in SLOTS:
        if slot == "primary":
            continue
        p = slot_svg_path(token, slot)
        if not p:
            continue
        g_layer = font.createChar(-1, f"{{token}}.{{slot}}")
        import_glyph_from_svg(g_layer, p)
        g_layer.width = base_width

    count += 1

# Leerzeichen sicherstellen
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
print("OK glyphs (color):", count)
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


PALETTE_SLOTS = ("primary", "accent", "secondary")


#############################################
# SVG SLOT SPLITTING (primary / accent / secondary)
#############################################


def _svg_uses_palette_slots(svg_path: Path) -> bool:
    """
    Quick check: does this SVG contain any data-beefont-color
    in {primary, accent, secondary}?
    """
    try:
        tree = ET.parse(svg_path)
    except Exception:
        return False

    root = tree.getroot()
    for elem in root.iter():
        val = elem.attrib.get("data-beefont-color")
        if val in PALETTE_SLOTS:
            return True
    return False


def _build_slot_subtree(
    orig: ET.Element,
    slot: str,
    inherited_slot: str | None,
) -> ET.Element | None:
    """
    Rekursiver Helper:
    - orig: Knoten aus Original-Baum
    - slot: gewünschter Slot ("primary", "accent", "secondary")
    - inherited_slot: Slot, der von Vorfahren vererbt wurde (oder None)

    Rückgabe:
    - Neuer Knoten (mit Kindern), falls dieser Teilbaum zum Slot gehört
    - None, wenn komplett verworfen werden soll
    """
    # effektiver Slot für diesen Knoten
    node_slot_attr = orig.attrib.get("data-beefont-color")
    eff_slot = node_slot_attr if node_slot_attr in PALETTE_SLOTS else inherited_slot

    new_children: list[ET.Element] = []
    for child in list(orig):
        child_new = _build_slot_subtree(child, slot, eff_slot)
        if child_new is not None:
            new_children.append(child_new)

    # Entscheiden, ob dieser Knoten behalten wird:
    keep_here = eff_slot == slot
    keep = keep_here or bool(new_children)

    if not keep:
        return None

    # Knoten kopieren, aber data-beefont-Attribute entfernen
    new_attrib = {
        k: v
        for k, v in orig.attrib.items()
        if not k.startswith("data-beefont-")
    }
    new_elem = ET.Element(orig.tag, new_attrib)
    for c in new_children:
        new_elem.append(c)
    return new_elem


def _split_svg_into_palette_slots(
    src_svg: Path,
    dest_dir: Path,
    token: str,
) -> dict[str, Path]:
    """
    Nimmt eine Quell-SVG und erzeugt 0..3 Slot-SVGs im dest_dir:

      <dest_dir>/<token>__primary.svg
      <dest_dir>/<token>__accent.svg
      <dest_dir>/<token>__secondary.svg

    Rückgabe:
      dict(slot_name -> Path zur erzeugten Datei)

    Fallback:
      - Wenn die SVG keine data-beefont-color-Tags enthält,
        wird sie unverändert als primary-SVG kopiert.
    """
    src_svg = Path(src_svg)
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    if not src_svg.is_file():
        raise RuntimeError(f"_split_svg_into_palette_slots: SVG not found: {src_svg}")

    # Fallback: keine Slot-Tags → eine einzige primary-SVG
    if not _svg_uses_palette_slots(src_svg):
        primary_out = dest_dir / f"{token}__primary.svg"
        shutil.copy2(src_svg, primary_out)
        return {"primary": primary_out}

    # Mit Slots:
    tree = ET.parse(src_svg)
    root = tree.getroot()

    # viewBox, width, height etc. vom Root übernehmen
    root_attrib_base = {
        k: v
        for k, v in root.attrib.items()
        # wir lassen data-beefont-* generell weg auf Root
        if not k.startswith("data-beefont-")
    }

    # Namespaces nicht kaputt machen
    root_tag = root.tag

    result: dict[str, Path] = {}

    for slot in PALETTE_SLOTS:
        # neuen Root für diesen Slot aufbauen
        slot_root = ET.Element(root_tag, root_attrib_base)

        # Kinder filtern
        for child in list(root):
            child_new = _build_slot_subtree(child, slot, inherited_slot=None)
            if child_new is not None:
                slot_root.append(child_new)

        # Wenn dieser Slot nichts enthält → keine Datei
        if len(list(slot_root)) == 0:
            continue

        slot_tree = ET.ElementTree(slot_root)
        out_path = dest_dir / f"{token}__{slot}.svg"
        slot_tree.write(out_path, encoding="utf-8", xml_declaration=True)
        result[slot] = out_path

    # Falls aus irgendwelchen Gründen gar kein Slot geschrieben wurde,
    # fallback auf primary = Original
    if not result:
        primary_out = dest_dir / f"{token}__primary.svg"
        shutil.copy2(src_svg, primary_out)
        result["primary"] = primary_out

    return result


######

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
    Fügt dem bestehenden TTF eine COLR/CPAL-Struktur hinzu:

    - CPAL: Palette mit [primary, accent, secondary]
    - COLR v0:
        Für jede Basisglyphe (aus cmap) wird eine Liste von Layern aufgebaut:
          - <baseName>.primary   → colorIndex 0 (falls vorhanden)
          - <baseName>.accent    → colorIndex 1
          - <baseName>.secondary → colorIndex 2
        Falls keine Layerglyphen existieren → Fallback: Basisglyphe als primary.

    Voraussetzung:
    - FontForge-Script hat Layerglyphen so benannt.
    """
    ttf_path = Path(ttf_path)
    if not ttf_path.is_file():
        raise RuntimeError(f"_apply_colr_cpal: TTF not found: {ttf_path}")

    font = TTFont(str(ttf_path))

    # 1) CPAL aufbauen
    primary = _safe_hex_to_rgba_float(palette_dict.get("primary", "#000000"), "#000000")
    accent = _safe_hex_to_rgba_float(palette_dict.get("accent", "#ff9900"), "#ff9900")
    secondary = _safe_hex_to_rgba_float(palette_dict.get("secondary", "#ffffff"), "#ffffff")

    palettes = [[primary, accent, secondary]]
    font["CPAL"] = buildCPAL(palettes)

    # 2) COLR v0
    glyph_order = font.getGlyphOrder()
    glyph_set = set(glyph_order)

    # cmap: codepoint → base glyph name (z.B. "A")
    cmap = font.getBestCmap() or {}

    color_glyphs: dict[str, list[tuple[str, int]]] = {}

    for cp, base_name in cmap.items():
        layers: list[tuple[str, int]] = []

        # in fester Reihenfolge: primary, accent, secondary
        for idx, slot in enumerate(PALETTE_SLOTS):
            layer_name = f"{base_name}.{slot}"
            if layer_name in glyph_set:
                layers.append((layer_name, idx))

        # Fallback: keine Layerglyphen → Basisglyphe als primary
        if not layers:
            layers = [(base_name, 0)]

        color_glyphs[base_name] = layers

    font["COLR"] = buildCOLR(color_glyphs)

    font.save(str(ttf_path))


def build_ttf_svg_color(job, language, default_glyphs, out_ttf) -> None:
    """
    COLOR-SVG-Build:

    - Nimmt Default-SVG-Glyphen eines Jobs
    - Splittet jede SVG in bis zu 3 Slot-SVGs (primary/accent/secondary)
      anhand von data-beefont-color / data-beefont-layer.
    - FontForge baut:
        - Basisglyphen (Monochrom-Fallback) aus primary
        - Layerglyphen <token>.primary / .accent / .secondary
    - Danach wird COLR/CPAL mittels Job-Palette injiziert.

    Verhalten:
    - Alte SVGs ohne data-beefont-color → komplette Glyph als primary.
    - Partielle Slots: fehlende Slots werden einfach nicht gezeichnet.
    """
    media_root = Path(settings.MEDIA_ROOT)
    out_ttf = Path(out_ttf)
    out_ttf.parent.mkdir(parents=True, exist_ok=True)

    alphabet = language.alphabet or ""
    alphabet_chars = set(alphabet)

    mapping: dict[str, int] = {}
    svg_sources: dict[str, Path] = {}

    # 1) SVG-Quellen sammeln (wie bei build_ttf_svg)
    for g in default_glyphs:
        token = g.letter

        if token not in alphabet_chars:
            continue
        if len(token) != 1:
            continue

        src = media_root / g.image_path
        if not src.is_file():
            continue
        if src.suffix.lower() != ".svg":
            continue

        if token not in svg_sources:
            svg_sources[token] = src
            mapping[token] = ord(token)

    if not mapping:
        raise RuntimeError(
            f"build_ttf_svg_color: keine passenden SVG-Glyphen für Sprache {language.code} "
            f"und Job {job.sid} gefunden."
        )

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        svg_layer_dir = td / "svg_layers"
        svg_layer_dir.mkdir(parents=True, exist_ok=True)

        # 2) Jede SVG in Slot-SVGs aufteilen
        for token, src in svg_sources.items():
            _split_svg_into_palette_slots(src, svg_layer_dir, token)

        # 3) FontForge-Script für COLOR bauen
        script_path = td / "build_font_svg_color.py"
        family = getattr(job, "base_family", None) or job.name or "BeeHand"
        _write_fontforge_script_svg_color(
            script_path,
            svg_layer_dir,
            out_ttf,
            family,
            mapping,
        )

        # 4) FontForge ausführen
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
                f"fontforge failed (COLOR, {ff})\n"
                f"stdout:\n{proc.stdout}\n"
                f"stderr:\n{proc.stderr}"
            )

    if not out_ttf.is_file() or out_ttf.stat().st_size == 0:
        raise RuntimeError(
            f"build_ttf_svg_color: FontForge hat keine gültige COLOR-TTF erzeugt: {out_ttf}"
        )

    # 5) Palette holen und COLR/CPAL injizieren
    palette = get_palette_for_job(job)
    _apply_colr_cpal(out_ttf, palette)
