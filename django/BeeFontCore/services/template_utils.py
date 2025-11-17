# BeeFontCore/services/template_utils.py

from PIL import Image, ImageDraw, ImageFont

# Use higher DPI so a 40mm glyph cell has good resolution (~470 px).
DPI_DEFAULT = 300

GRID_COLOR = (180, 180, 180)
GLYPH_COLOR = (120, 120, 120)
FIDUCIAL = 18  # px size of marker squares in final raster

TOKEN2CHAR = {
    "Adieresis": "Ä", "Odieresis": "Ö", "Udieresis": "Ü", "germandbls": "ß",
    "adieresis": "ä", "odieresis": "ö", "udieresis": "ü",
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "comma": ",", "period": ".", "question": "?", "exclam": "!",
    "minus": "-", "plus": "+", "slash": "/", "backslash": "\\", "equal": "=",
    "underscore": "_", "at": "@", "parenleft": "(", "parenright": ")",
    "colon": ":", "semicolon": ";", "apostrophe": "'", "quotedbl": "\"",
    "asterisk": "*", "space": " ",
}

def token_to_char(t: str) -> str:
    """Map internal token name → printable character for prefill."""
    return t if len(t) == 1 else TOKEN2CHAR.get(t, "?")


def _mm_to_px(mm: float, dpi: int) -> int:
    return int(round(mm * dpi / 25.4))


def _grid_geometry(tpl: dict, dpi: int, W: int, H: int):
    """
    V2-only layout:

      paper: { width_mm, height_mm, dpi? }
      grid: {
        rows, cols,
        cell_width_mm, cell_height_mm,
        margin_left_mm, margin_top_mm
      }

    No global gap in mm. We place fixed-size cells starting at (margin_left, margin_top).
    Any leftover space becomes extra bottom/right margin.
    """
    g = tpl["grid"]
    rows = int(g["rows"])
    cols = int(g["cols"])

    cell_w_mm = float(g["cell_width_mm"])
    cell_h_mm = float(g["cell_height_mm"])
    margin_left_mm = float(g["margin_left_mm"])
    margin_top_mm = float(g["margin_top_mm"])

    cell_w = _mm_to_px(cell_w_mm, dpi)
    cell_h = _mm_to_px(cell_h_mm, dpi)
    M_LEFT = _mm_to_px(margin_left_mm, dpi)
    M_TOP = _mm_to_px(margin_top_mm, dpi)

    # V2 baseline: no gap, just contiguous cells; leftover at bottom/right.
    GAP_X = 0
    GAP_Y = 0

    # Sanity: we do NOT try to “fix” overflows here – that’s template’s job.
    return rows, cols, M_LEFT, M_TOP, cell_w, cell_h, GAP_X, GAP_Y


def render_template_png(
    tpl: dict,
    order: list[str],
    *,
    prefill: bool,
    show_indices: bool = True,
) -> Image.Image:
    """
    Render a PNG for a template.

    tpl (V2):
      {
        "paper": {...},
        "grid": {...},
        "fiducials": {...} (optional),
        "mapping_file": ...
      }

    order: list of token names ("A", "adieresis", "zero", ...)
    prefill:
      - True  => print characters in cells according to order
      - False => no characters
    show_indices:
      - True  => print cell index (1..N) inside each cell (if not prefilled)
    """
    paper = tpl["paper"]
    dpi = int(paper.get("dpi", DPI_DEFAULT))

    w_mm = float(paper["width_mm"])
    h_mm = float(paper["height_mm"])
    W = _mm_to_px(w_mm, dpi)
    H = _mm_to_px(h_mm, dpi)

    rows, cols, M_LEFT, M_TOP, cell_w, cell_h, GAP_X, GAP_Y = _grid_geometry(
        tpl, dpi, W, H
    )

    # Fiducials config
    fcfg = tpl.get("fiducials", {})
    fid_size_mm = float(fcfg.get("size_mm", 10.0))      # default ~10mm
    fid_margin_mm = float(fcfg.get("margin_mm", 5.0))   # default ~5mm

    fid_size_px = _mm_to_px(fid_size_mm, dpi)
    fid_margin_px = _mm_to_px(fid_margin_mm, dpi)

    # Base image
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)

    # Fiducials in corners, using fiducial margin, not grid margin
    for (x, y) in [
        (fid_margin_px, fid_margin_px),
        (W - fid_margin_px - fid_size_px, fid_margin_px),
        (W - fid_margin_px - fid_size_px, H - fid_margin_px - fid_size_px),
        (fid_margin_px, H - fid_margin_px - fid_size_px),
    ]:
        d.rectangle([x, y, x + fid_size_px, y + fid_size_px], fill="black")

    # Try loading a font for indices / prefill glyphs
    try:
        # size ~ 40–50% of cell height
        font_size = max(10, int(cell_h * 0.5))
        font = ImageFont.truetype("DejaVuSans.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    # Draw grid + contents
    idx = 0
    for r in range(rows):
        for c in range(cols):
            x0 = M_LEFT + c * (cell_w + GAP_X)
            y0 = M_TOP + r * (cell_h + GAP_Y)
            x1 = x0 + cell_w
            y1 = y0 + cell_h

            # cell rectangle
            d.rectangle([x0, y0, x1, y1], outline=GRID_COLOR, width=1)

            label = ""

            if idx < len(order) and prefill:
                token = order[idx]
                ch = token_to_char(token)
                label = ch
            elif show_indices:
                # human-friendly 1-based index
                label = str(idx + 1)

            if label:
                # center label inside the cell
                bbox = d.textbbox((0, 0), label, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx = x0 + (cell_w - tw) / 2
                ty = y0 + (cell_h - th) / 2
                d.text((tx, ty), label, fill=GLYPH_COLOR, font=font)

            idx += 1

    return im

def template_raster_size(tpl: dict, dpi: int = DPI_DEFAULT) -> tuple[int, int]:
    """Return (W, H) in pixels for this template at given dpi."""
    paper = tpl["paper"]
    dpi = int(paper.get("dpi", dpi))

    w_mm = float(paper["width_mm"])
    h_mm = float(paper["height_mm"])

    W = _mm_to_px(w_mm, dpi)
    H = _mm_to_px(h_mm, dpi)
    return W, H


def grid_cells_px(tpl: dict, dpi: int, W: int, H: int):
    """
    Compute pixel cell rectangles for segmentation.

    Returns:
      cells: list[(y0, y1, x0, x1)]
      M_LEFT: left margin in px (for debug / fiducials)
      GAP_X: horizontal gap in px (currently 0 in V2 baseline)
    """
    rows, cols, M_LEFT, M_TOP, cell_w, cell_h, GAP_X, GAP_Y = _grid_geometry(tpl, dpi, W, H)

    cells = []
    for r in range(rows):
        for c in range(cols):
            x0 = M_LEFT + c * (cell_w + GAP_X)
            y0 = M_TOP + r * (cell_h + GAP_Y)
            cells.append((y0, y0 + cell_h, x0, x0 + cell_w))
    return cells, M_LEFT, GAP_X
