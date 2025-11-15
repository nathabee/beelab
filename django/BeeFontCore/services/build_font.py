# BeeFontCore/services/build_font.py

import os
import subprocess
import tempfile
import json
from pathlib import Path
from django.conf import settings
import zipfile
import shutil



_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"


def _find_fontforge():
    for name in ("fontforge", "fontforge-nox"):
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError("fontforge binary not found (install 'fontforge' in the django image)")


def _png_to_svg(png: Path, svg: Path, timeout: float = 5.0) -> None:
    """
    Convert a single glyph PNG -> SVG using ImageMagick + potrace.

    png: input bitmap (already binarised mask, white background, black ink)
    svg: output path (will be overwritten)
    """
    png = Path(png)
    svg = Path(svg)

    if not png.is_file():
        raise RuntimeError(f"_png_to_svg: PNG not found: {png}")

    svg.parent.mkdir(parents=True, exist_ok=True)

    # Use a temp PGM/PPM as potrace input
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        pgm = td / "glyph.pgm"

        # 1) PNG -> 1-bit PGM. The -type bilevel is important so potrace sees clear edges.
        cmd_convert = [
            "convert",
            str(png),
            "-colorspace", "Gray",
            "-threshold", "50%",
            "-type", "bilevel",
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
            raise RuntimeError("ImageMagick 'convert' not found in container (apt-get install imagemagick).")
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

 

def _load_template(name: str | None) -> dict:
    p = _TEMPLATE_DIR / f"{name}.json" if name else _TEMPLATE_DIR / "A4_10x10.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _load_mapping(template_name: str | None) -> tuple[dict, Path]:
    tpl = _load_template(template_name)
    mapping_rel = tpl.get("mapping_file", "mapping/mapping.json")
    mapping_path = _TEMPLATE_DIR / mapping_rel
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    return mapping, mapping_path


def _write_fontforge_script(script_path: Path, svg_dir: Path, out_ttf: Path, family: str, mapping: dict):
    """
    FontForge Python script:
    - creates font
    - loads each SVG as glyph outlines
    - sets widths
    - generates TTF
    """
    # Build a plain dict mapping token -> codepoint; we only use those that have an SVG
    # The Python inside FontForge will re-check existence.
    script = f'''\
import fontforge, os, sys

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
    # NOTE: SVG -> vector outlines
    g.importOutlines(p)
    g.removeOverlap()
    g.simplify()

    # crude width; punctuation narrower
    if token in ["comma","period","colon","semicolon","apostrophe","quotedbl",
                 "minus","plus","slash","backslash","underscore","equal","asterisk","at"]:
        g.width = 600
    elif token in ["space"]:
        g.width = 500
    else:
        g.width = 1000
    count += 1

# ensure space exists
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


def build_bundle(job, seg_dir: str):
    """
    seg_dir: django/media/beefont/segments/<sid>
    Produces:
      /media/beefont/builds/<family>.ttf
      /media/beefont/builds/<sid>_bundle.zip
    """
    media_root = Path(settings.MEDIA_ROOT)
    seg_dir = Path(seg_dir)

    builds_root = media_root / "beefont" / "builds"
    builds_root.mkdir(parents=True, exist_ok=True)

    family_slim = "".join(c for c in job.family if c.isalnum()) or "BeeHand"
    out_ttf = builds_root / f"{family_slim}.ttf"
    out_zip = builds_root / f"{job.sid}_bundle.zip"

    mapping, mapping_path = _load_mapping(job.template_name)

    # 1) convert all PNGs we actually have to SVGs in a temp dir
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        svg_dir = td / "svg"
        svg_dir.mkdir(parents=True, exist_ok=True)

        # Only convert tokens from mapping that have a PNG in seg_dir
        converted = 0
        for token, cp in mapping.items():
            png_path = seg_dir / f"{token}.png"
            if not png_path.is_file():
                continue
            svg_path = svg_dir / f"{token}.svg"
            _png_to_svg(png_path, svg_path)
            converted += 1

        if converted == 0:
            raise RuntimeError("No glyph PNGs found to convert → nothing to build.")

        # 2) write fontforge script into the same temp dir
        script_path = td / "build_font.py"
        _write_fontforge_script(script_path, svg_dir, out_ttf, job.family, mapping)

        # 3) run fontforge in batch mode
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

    # 4) Build the zip bundle (TTF + mapping + a sample of segments)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(out_ttf, arcname=out_ttf.name)
        z.write(mapping_path, arcname="mapping.json")
        # include up to 80 segment PNGs for debugging / preview
        for p in sorted(seg_dir.glob("*.png"))[:80]:
            z.write(p, arcname=f"segments/{p.name}")

    return str(out_ttf), str(out_zip)
