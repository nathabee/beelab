# BeeFontCore/services/template_utils.py

from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont

from BeeFontCore.models import TemplateDefinition
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFont

GRID_COLOR = "black"
GLYPH_COLOR_DEFAULT = "black"
GLYPH_COLOR_BOLD = "darkblue"
GLYPH_COLOR_ITALIC = "darkgreen"
GLYPH_COLOR_MONO = "darkred"

DPI_DEFAULT = 300
GRID_COLOR = (180, 180, 180)
GLYPH_COLOR = (120, 120, 120)


def _mm_to_px(mm: float, dpi: int) -> int:
    return int(round(mm * dpi / 25.4))


def template_to_config(t: TemplateDefinition) -> dict:
    """
    Baut eine reine Config aus TemplateDefinition.
    KEINE hartcodierten Layout-Werte mehr – alles aus der DB.
    """

    dpi = t.dpi or DPI_DEFAULT

    tpl = {
        "paper": {
            "width_mm": float(t.paper_width_mm),
            "height_mm": float(t.paper_height_mm),
            "dpi": dpi,
        },
        "grid": {
            "rows": int(t.rows),
            "cols": int(t.cols),
            "cell_width_mm": float(t.cell_width_mm),
            "cell_height_mm": float(t.cell_height_mm),
            "margin_left_mm": float(t.margin_left_mm),
            "margin_top_mm": float(t.margin_top_mm),
            "gap_x_mm": float(t.gap_x_mm),
            "gap_y_mm": float(t.gap_y_mm),
        },
        "fiducials": {
            "size_mm": float(t.fiducial_size_mm),
            "margin_mm": float(t.fiducial_margin_mm),
        },
    }
    return tpl


def _grid_geometry(tpl: dict, dpi: int, W: int, H: int):
    g = tpl["grid"]
    rows = int(g["rows"])
    cols = int(g["cols"])

    cell_w_mm = float(g["cell_width_mm"])
    cell_h_mm = float(g["cell_height_mm"])
    margin_left_mm = float(g["margin_left_mm"])
    margin_top_mm = float(g["margin_top_mm"])
    gap_x_mm = float(g.get("gap_x_mm", 0.0))
    gap_y_mm = float(g.get("gap_y_mm", 0.0))

    cell_w = _mm_to_px(cell_w_mm, dpi)
    cell_h = _mm_to_px(cell_h_mm, dpi)
    m_left = _mm_to_px(margin_left_mm, dpi)
    m_top = _mm_to_px(margin_top_mm, dpi)
    gap_x = _mm_to_px(gap_x_mm, dpi)
    gap_y = _mm_to_px(gap_y_mm, dpi)

    return rows, cols, m_left, m_top, cell_w, cell_h, gap_x, gap_y


def _get_prefill_font(prefill_style: str | None, cell_h: int) -> tuple[ImageFont.FreeTypeFont, str]:
    """
    Wählt eine Schriftart und Farbe für das Prefill-Label basierend auf prefill_style.

    Rückgabe:
      (font, color)
    """
    font_size = max(10, int(cell_h * 0.5))

    # Fallback-Werte
    color = GLYPH_COLOR_DEFAULT
    candidates: list[str]

    style = (prefill_style or "default").lower()

    if style in ("b", "bold"):
        candidates = ["DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]
        color = GLYPH_COLOR_BOLD
    elif style in ("i", "it", "italic", "oblique"):
        candidates = ["DejaVuSans-Oblique.ttf", "DejaVuSans.ttf"]
        color = GLYPH_COLOR_ITALIC
    elif style in ("m", "mono", "fixed", "c", "courier", "courrier", "couriernew"):
        candidates = ["DejaVuSansMono.ttf", "DejaVuSans.ttf"]
        color = GLYPH_COLOR_MONO
    else:
        # default sans
        candidates = ["DejaVuSans.ttf"]

    # versuche Kandidaten der Reihe nach
    for fname in candidates:
        try:
            font = ImageFont.truetype(fname, font_size)
            return font, color
        except Exception:
            continue

    # letzter Fallback: PIL-Default
    font = ImageFont.load_default()
    return font, GLYPH_COLOR_DEFAULT


def render_template_png(
    tpl: dict,
    order: List[str],
    *,
    prefill: bool,
    show_indices: bool = True,
    prefill_style: str | None = None,
) -> Image.Image:
    paper = tpl["paper"]
    dpi = int(paper.get("dpi", DPI_DEFAULT))

    w_mm = float(paper["width_mm"])
    h_mm = float(paper["height_mm"])
    W = _mm_to_px(w_mm, dpi)
    H = _mm_to_px(h_mm, dpi)

    rows, cols, m_left, m_top, cell_w, cell_h, gap_x, gap_y = _grid_geometry(
        tpl, dpi, W, H
    )

    fcfg = tpl.get("fiducials", {})
    fid_size_mm = float(fcfg.get("size_mm", 10.0))
    fid_margin_mm = float(fcfg.get("margin_mm", 5.0))

    fid_size_px = _mm_to_px(fid_size_mm, dpi)
    fid_margin_px = _mm_to_px(fid_margin_mm, dpi)

    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)

    # Fiducials
    corners = [
        (fid_margin_px, fid_margin_px),
        (W - fid_margin_px - fid_size_px, fid_margin_px),
        (W - fid_margin_px - fid_size_px, H - fid_margin_px - fid_size_px),
        (fid_margin_px, H - fid_margin_px - fid_size_px),
    ]
    for (x, y) in corners:
        d.rectangle([x, y, x + fid_size_px, y + fid_size_px], fill="black")

    # Font & Farbe abhängig vom Stil
    font, text_color = _get_prefill_font(prefill_style, cell_h)

    idx = 0
    for r in range(rows):
        for c in range(cols):
            x0 = m_left + c * (cell_w + gap_x)
            y0 = m_top + r * (cell_h + gap_y)
            x1 = x0 + cell_w
            y1 = y0 + cell_h

            d.rectangle([x0, y0, x1, y1], outline=GRID_COLOR, width=1)

            label = ""
            if idx < len(order) and prefill:
                label = str(order[idx])
            elif show_indices:
                label = str(idx + 1)

            if label:
                bbox = d.textbbox((0, 0), label, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx = x0 + (cell_w - tw) / 2
                ty = y0 + (cell_h - th) / 2
                d.text((tx, ty), label, fill=text_color, font=font)

            idx += 1

    return im


def template_raster_size(tpl: dict, dpi: int = DPI_DEFAULT) -> Tuple[int, int]:
    paper = tpl["paper"]
    dpi = int(paper.get("dpi", dpi))

    w_mm = float(paper["width_mm"])
    h_mm = float(paper["height_mm"])

    W = _mm_to_px(w_mm, dpi)
    H = _mm_to_px(h_mm, dpi)
    return W, H


def grid_cells_px(tpl: dict, dpi: int, W: int, H: int):
    rows, cols, m_left, m_top, cell_w, cell_h, gap_x, gap_y = _grid_geometry(
        tpl, dpi, W, H
    )

    cells = []
    for r in range(rows):
        for c in range(cols):
            x0 = m_left + c * (cell_w + gap_x)
            y0 = m_top + r * (cell_h + gap_y)
            cells.append((y0, y0 + cell_h, x0, x0 + cell_w))
    return cells, m_left, gap_x
