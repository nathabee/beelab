# BeeFontCore/services/template_utils.py
from PIL import Image, ImageDraw, ImageFont
import math 

DPI_DEFAULT = 150 

# Light-gray used for guides
GRID_COLOR = (180,180,180)
GLYPH_COLOR = (120,120,120)
FIDUCIAL = 18  # px size of marker squares in final raster

TOKEN2CHAR = {
    "Adieresis":"Ä","Odieresis":"Ö","Udieresis":"Ü","germandbls":"ß",
    "adieresis":"ä","odieresis":"ö","udieresis":"ü",
    "zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5",
    "six":"6","seven":"7","eight":"8","nine":"9",
    "comma":",","period":".","question":"?","exclam":"!",
    "minus":"-","plus":"+","slash":"/","backslash":"\\","equal":"=",
    "underscore":"_","at":"@","parenleft":"(","parenright":")",
    "colon":":","semicolon":";","apostrophe":"'","quotedbl":"\"","asterisk":"*","space":" "
}

def token_to_char(t): return t if len(t)==1 else TOKEN2CHAR.get(t,"?")


def render_template_png(tpl: dict, order: list[str], *, prefill: bool, show_indices: bool = True) -> Image.Image:
    # A4 raster at ~150 DPI to stay lightweight
    w_mm, h_mm = tpl["paper"]["width_mm"], tpl["paper"]["height_mm"]
    dpi = 150
    W = int(w_mm * dpi / 25.4); H = int(h_mm * dpi / 25.4)

    rows, cols  = tpl["grid"]["rows"], tpl["grid"]["cols"]
    margin_mm   = tpl["grid"]["margin_mm"]; gap_mm = tpl["grid"]["gap_mm"]
    M   = int(margin_mm * dpi / 25.4)
    GAP = int(gap_mm    * dpi / 25.4)

    im = Image.new("RGB", (W, H), "white")
    d  = ImageDraw.Draw(im)

    # Fiducials
    for (x,y) in [(M, M), (W-M-FIDUCIAL, M), (W-M-FIDUCIAL, H-M-FIDUCIAL), (M, H-M-FIDUCIAL)]:
        d.rectangle([x,y,x+FIDUCIAL,y+FIDUCIAL], fill="black")

    # Grid metrics
    cell_w = (W - 2*M - (cols-1)*GAP)//cols
    cell_h = (H - 2*M - (rows-1)*GAP)//rows

    try:
        font = ImageFont.truetype("DejaVuSans.ttf", max(16, min(cell_w, cell_h)//2))
    except Exception:
        font = ImageFont.load_default()

    k = 0
    for r in range(rows):
        for c in range(cols):
            x0 = M + c*(cell_w+GAP); y0 = M + r*(cell_h+GAP)
            x1, y1 = x0+cell_w, y0+cell_h
            d.rectangle([x0,y0,x1,y1], outline=GRID_COLOR)

            if show_indices:
                idx = r*cols + c + 1
                d.text((x0+4, y0+2), str(idx), fill=GRID_COLOR, font=font)

            if prefill and k < len(order):
                ch = token_to_char(order[k])
                bbox = d.textbbox((0,0), ch, font=font)
                tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
                cx = x0 + (cell_w - tw)//2; cy = y0 + (cell_h - th)//2
                d.text((cx,cy), ch, fill=GLYPH_COLOR, font=font)
            k += 1

    if tpl.get("name"):
        d.text((M, H-M-2*FIDUCIAL), tpl["name"], fill=(0,0,0), font=font)
    return im


def template_raster_size(tpl: dict, dpi: int = DPI_DEFAULT) -> tuple[int,int]:
    w_mm = tpl["paper"]["width_mm"]
    h_mm = tpl["paper"]["height_mm"]
    W = int(round(w_mm * dpi / 25.4))
    H = int(round(h_mm * dpi / 25.4))
    return W, H

def grid_cells_px(tpl: dict, dpi: int, W: int, H: int):
    rows = int(tpl["grid"]["rows"])
    cols = int(tpl["grid"]["cols"])
    M    = int(round(tpl["grid"]["margin_mm"] * dpi / 25.4))
    GAP  = int(round(tpl["grid"]["gap_mm"]    * dpi / 25.4))

    cell_w = (W - 2*M - (cols-1)*GAP)//cols
    cell_h = (H - 2*M - (rows-1)*GAP)//rows
    cells = []
    for r in range(rows):
        for c in range(cols):
            x0 = M + c*(cell_w + GAP)
            y0 = M + r*(cell_h + GAP)
            cells.append((y0, y0+cell_h, x0, x0+cell_w))
    return cells, M, GAP
