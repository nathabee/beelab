# BeeFontCore/services/build_font.py

import os
import subprocess
import tempfile
import json
from pathlib import Path
from django.conf import settings
import zipfile
import shutil  
import subprocess

# Base directory for templates / mappings
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

def _parse_codepoint(v) -> int | None:
    """
    Try to parse various codepoint formats:

      - integer: 65
      - numeric string: "65", "0x41"
      - bare hex string: "0041"
      - single character: "A", "ä"
    """
    # already an int
    if isinstance(v, int):
        return v

    if isinstance(v, str):
        s = v.strip()

        # 1) try numeric with base prefix ( "65", "0x41", "0o101" )
        try:
            return int(s, 0)
        except ValueError:
            pass

        # 2) bare hex like "0041"
        if all(ch in "0123456789abcdefABCDEF" for ch in s) and 1 <= len(s) <= 6:
            try:
                return int(s, 16)
            except ValueError:
                pass

        # 3) single character like "A" or "ä"
        if len(s) == 1:
            return ord(s)

    return None


def _normalize_mapping(mapping_raw: dict) -> dict[str, int]:
    """
    Normalize mapping values to plain integer codepoints.

    Supports:
      - "A": 65
      - "A": "65" or "0x41"
      - "A": {"unicode": "0041"}
      - "A": {"char": "A", "unicode": "0041"}
      - "A": {"codepoint": 65}, {"cp": "0x41"}, {"u": "A"}, etc.
    """
    mapping: dict[str, int] = {}

    for token, val in mapping_raw.items():
        cp: int | None = None

        if isinstance(val, (int, str)):
            cp = _parse_codepoint(val)
        elif isinstance(val, dict):
            # first try explicit numeric/hex fields (including your "unicode")
            for key in ("codepoint", "cp", "unicode", "u"):
                if key in val:
                    cp = _parse_codepoint(val[key])
                    if cp is not None:
                        break
            # if still nothing, fall back to "char"
            if cp is None and "char" in val:
                cp = _parse_codepoint(val["char"])

        if cp is None:
            # could log here if you want to debug
            continue

        mapping[token] = cp

    return mapping

def _mapping_path_for_language(language: str | None) -> Path:
    """
    Determine mapping file from job.language:

    - Try:     mapping/mapping_<LANG>.json  (LANG uppercased)
    - Fallback: mapping/mapping.json
    """
    lang_raw = language or ""
    lang = lang_raw.strip().upper()

    base = _TEMPLATE_DIR / "mapping"

    # 1) language-specific mapping, e.g. mapping/mapping_DE.json
    p_lang = None
    if lang:
        p_lang = base / f"mapping_{lang}.json"
        if p_lang.exists():
            return p_lang

    # 2) fallback mapping/mapping.json
    p_default = base / "mapping.json"
    if p_default.exists():
        return p_default

    # 3) nothing found → hard error
    raise RuntimeError(
        f"No mapping file found for language={language!r}: "
        f"tried {p_lang if p_lang is not None else '(none)'} and {p_default}"
    )



def _load_mapping_for_job(job) -> tuple[dict, Path]:
    """
    Load the mapping (token -> codepoint) for this job, based purely on job.language,
    normalize values to plain integer codepoints, and filter to the
    characters actually requested in job.characters (if provided).
    """
    # 1) decide mapping file from language, e.g. mapping/mapping_DE.json
    mapping_path = _mapping_path_for_language(getattr(job, "language", None))

    # 2) load and normalize
    mapping_raw = json.loads(mapping_path.read_text(encoding="utf-8"))
    mapping = _normalize_mapping(mapping_raw) 

    # sanity check after normalization
    if not mapping:
        raise RuntimeError(
            f"Normalized mapping from {mapping_path} is empty "
            f"(raw entries: {len(mapping_raw)})"
        )

    # optional debug while you’re still testing
    # print("DEBUG build_font: raw entries:", len(mapping_raw), "normalized:", len(mapping))

    # 3) optional filtering by job.characters (string of actual Unicode chars)
    chars = getattr(job, "characters", "") or ""
    if chars:
        filtered: dict[str, int] = {}
        for token, cp in mapping.items():
            ch = chr(cp)
            if ch in chars:
                filtered[token] = cp
        mapping = filtered

        # sanity check after filter
        if not mapping:
            raise RuntimeError(
                f"Mapping from {mapping_path} became empty after "
                f"applying job.characters={chars!r}"
            )

    return mapping, mapping_path


def _write_fontforge_script(script_path: Path, svg_dir: Path, out_ttf: Path, family: str, mapping: dict):
    """
    FontForge Python script:
    - creates font
    - loads each SVG as glyph outlines
    - sets widths
    - generates TTF
    """
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


def build_bundle(job, segdir: Path):
    """
    V2: build font bundle from canonical glyph PNGs for this job.

    Expected layout:

      MEDIA_ROOT/
        beefont/
          segments/
            <sid>/
              A.png
              B.png
              adieresis.png
              exclam.png
              ...

    `segdir` is MEDIA_ROOT/beefont/segments/<sid>, passed in from views.build_ttf.
    """
    media_root = Path(settings.MEDIA_ROOT)
    seg_dir = Path(segdir)

    if not seg_dir.is_dir():
        raise RuntimeError(f"Canonical glyph directory not found for job {job.sid}: {seg_dir}")

    builds_root = media_root / "beefont" / "builds"
    builds_root.mkdir(parents=True, exist_ok=True)

    family_slim = "".join(c for c in (job.family or "") if c.isalnum()) or "BeeHand"
    out_ttf = builds_root / f"{family_slim}.ttf"
    out_zip = builds_root / f"{job.sid}_bundle.zip"

    # Load and normalize mapping (token -> int codepoint)
    mapping, mapping_path = _load_mapping_for_job(job)
 
    # 1) Convert all available canonical PNGs to SVG (independent of mapping)
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        svg_dir = td / "svg"
        svg_dir.mkdir(parents=True, exist_ok=True)

        converted = 0

        # iterate over actual PNGs present in seg_dir
        for png_path in sorted(seg_dir.glob("*.png")):
            token = png_path.stem  # e.g. "A", "adieresis", "exclam"
            svg_path = svg_dir / f"{token}.svg"
            _png_to_svg(png_path, svg_path)
            converted += 1

        if converted == 0:
            raise RuntimeError(f"No glyph PNGs found in {seg_dir} → nothing to build.")


        # 2) write fontforge script
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

    # 4) Build the zip bundle (TTF + mapping + canonical PNGs)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(out_ttf, arcname=out_ttf.name)
        z.write(mapping_path, arcname="mapping.json")
        used_tokens = set(mapping.keys())
        for token in sorted(used_tokens):
            p = seg_dir / f"{token}.png"
            if p.is_file():
                z.write(p, arcname=f"canonical/{p.name}")


    return str(out_ttf), str(out_zip)