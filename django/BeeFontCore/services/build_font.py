import os, subprocess, tempfile, json
from pathlib import Path

from django.conf import settings
import zipfile  
import subprocess
import tempfile
from pathlib import Path
import json
import shutil


def _find_fontforge():
    for name in ("fontforge-nox", "fontforge"):
        path = shutil.which(name)
        if path:
            return path
    raise RuntimeError("fontforge binary not found (install 'fontforge')")




_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"

def _png_to_svg(png_path: Path, svg_path: Path) -> None:
    """
    Convert a black-on-white glyph PNG to a vector SVG using ImageMagick + potrace.

    Steps:
      1) PNG -> 1-bit PBM (thresholded)
      2) PBM -> SVG via potrace
    """
    tmp_pbm = svg_path.with_suffix(".pbm")

    # 1) PNG -> PBM (bilevel)
    subprocess.run(
        [
            "convert",
            str(png_path),
            "-threshold", "50%",   # adjust if needed
            "-type", "bilevel",
            str(tmp_pbm),
        ],
        check=True,
    )

    # 2) PBM -> SVG
    subprocess.run(
        [
            "potrace",
            "-s",                  # output SVG
            "-o", str(svg_path),
            str(tmp_pbm),
        ],
        check=True,
    )

    # cleanup
    try:
        tmp_pbm.unlink()
    except FileNotFoundError:
        pass


def _load_template(name: str | None) -> dict:
    p = _TEMPLATE_DIR / f"{name}.json" if name else _TEMPLATE_DIR / "A4_10x10.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _write_fontforge_script(
    script_path: Path,
    mapping_cp: dict,
    mapping_paths: dict,
    out_ttf: Path,
    family: str,
):
    """
    mapping_cp:    {token: codepoint}
    mapping_paths: {token: "/tmp/.../token.svg"}
    """
    script = f'''\
import fontforge
import os

font = fontforge.font()
font.encoding   = "UnicodeFull"
font.familyname = "{family}"
font.fontname   = "{family.replace(" ", "")}"
font.fullname   = "{family}"
font.ascent     = 900
font.descent    = 200

mapping_cp    = {json.dumps(mapping_cp, ensure_ascii=False)}
mapping_paths = {json.dumps({k: str(v) for k, v in mapping_paths.items()}, ensure_ascii=False)}

count = 0

for token, cp in mapping_cp.items():
    path = mapping_paths.get(token)
    if not path or not os.path.exists(path):
        continue

    g = font.createChar(cp)

    # Import vector outline (SVG)
    g.importOutlines(path)
    g.removeOverlap()
    g.simplify()

    # crude width heuristic
    if token in ["comma","period","colon","semicolon","apostrophe","quotedbl","minus","plus","slash","backslash","underscore","equal","asterisk","at"]:
        g.width = 600
    elif token in ["space"]:
        g.width = 500
    else:
        g.width = 1000

    count += 1

# Ensure space exists
if 32 not in [g.encoding for g in font.glyphs()]:
    sp = font.createChar(32)
    sp.width = 500

font.os2_family_class = 2057
font.os2_weight       = 400
font.os2_width        = 5
font.os2_fstype       = 0
font.os2_vendor       = "BEE "

font.generate(r"""{str(out_ttf)}""")
print("OK glyphs:", count)
'''
    script_path.write_text(script, encoding="utf-8")




def _load_mapping(template_name: str | None) -> tuple[dict, Path]:
    tpl = _load_template(template_name)
    mapping_rel = tpl.get("mapping_file", "mapping/mapping.json")
    mapping_path = _TEMPLATE_DIR / mapping_rel
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    return mapping, mapping_path


def build_bundle(job, seg_dir: str):
    media_root = Path(settings.MEDIA_ROOT)
    seg_dir = Path(seg_dir)
    builds = media_root / "beefont" / "builds"
    builds.mkdir(parents=True, exist_ok=True)

    family_slim = "".join(c for c in job.family if c.isalnum()) or "BeeHand"
    out_ttf = builds / f"{family_slim}.ttf"
    out_zip = builds / f"{job.sid}_bundle.zip"

    # 1) mapping from template
    mapping_cp, mapping_path = _load_mapping(job.template_name)

    with tempfile.TemporaryDirectory() as td_str:
        td = Path(td_str)

        # 2) PNG -> SVG for all tokens that exist
        mapping_paths: dict[str, Path] = {}
        for token, cp in mapping_cp.items():
            png = seg_dir / f"{token}.png"
            if not png.exists():
                continue
            svg = td / f"{token}.svg"
            _png_to_svg(png, svg)
            mapping_paths[token] = svg

        # 3) write FontForge script using SVG paths
        script_path = td / "build.py"
        _write_fontforge_script(script_path, mapping_cp, mapping_paths, out_ttf, job.family)

        # 4) run FontForge
        ff = _find_fontforge()
        cmd = [ff, "-lang=py", "-script", str(script_path)]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"fontforge failed ({ff}): {proc.stderr or proc.stdout}")

    # 5) Zip artifacts: TTF + mapping + sample segments (you already improved this)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(out_ttf, arcname=out_ttf.name)
        z.write(mapping_path, arcname="mapping.json")
        for p in sorted(Path(seg_dir).glob("*.png")):
            z.write(p, arcname=f"segments/{p.name}")

    return str(out_ttf), str(out_zip)
