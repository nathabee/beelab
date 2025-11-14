#!/usr/bin/env python3
"""
make_font_sheet.py – Generate a handwriting sheet or simple line text
for BeeFont segmentation tests.

Usage:
    python make_font_sheet.py --text "ABCDabcd0123" --outfile sheet.png --grid 0
    python make_font_sheet.py --grid 1 --rows 10 --cols 10 --outfile grid.png
"""
import argparse
from PIL import Image, ImageDraw, ImageFont
import json, os
TOKEN_TO_CHAR = {
  # exact match your order token names:
  "Adieresis":"Ä","Odieresis":"Ö","Udieresis":"Ü","germandbls":"ß",
  "adieresis":"ä","odieresis":"ö","udieresis":"ü",
  "zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5",
  "six":"6","seven":"7","eight":"8","nine":"9",
  "comma":",","period":".","question":"?","exclam":"!",
  "minus":"-","plus":"+","slash":"/","backslash":"\\","equal":"=",
  "underscore":"_","at":"@","parenleft":"(","parenright":")",
  "colon":":","semicolon":";","apostrophe":"'","quotedbl":"\"","asterisk":"*","space":" "
}

def tokens_to_chars(tokens):
    out=[]
    for t in tokens:
        if len(t)==1: out.append(t)
        else: out.append(TOKEN_TO_CHAR.get(t, "?"))
    return out



def draw_text_line(text, out_path):
    W, H, M = 1200, 1600, 80
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 240)
    except Exception:
        font = ImageFont.load_default()
    # shrink to fit
    while True:
        bbox = d.textbbox((0,0), text, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        if tw <= W-2*M or font.size <= 20:
            break
        font = ImageFont.truetype(font.path, font.size-10)
    x, y = (W-tw)//2, (H-th)//2
    d.text((x,y), text, fill="black", font=font)
    im.save(out_path)
    print(f"[ok] saved line sheet → {out_path}")

def draw_grid_from_order(order_json_path, rows, cols, out_path):
    # Resolve optional order file
    alphabet = None
    if order_json_path:
        # allow relative paths (repo-root or alongside this script)
        cand = [
            order_json_path,
            os.path.join(os.path.dirname(__file__), order_json_path),
        ]
        order_path = next((p for p in cand if os.path.isfile(p)), None)
        if not order_path:
            raise FileNotFoundError(f"Order file not found: {order_json_path}")
        with open(order_path, "r", encoding="utf-8") as f:
            tokens = json.load(f)
        alphabet = tokens_to_chars(tokens)
    else:
        # default printable sequence (DE-capable)
        alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789,.?!-+/=@_():;\"'* ")

    W, H, M, GAP = 1200, 1600, 60, 20
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 140)
    except Exception:
        font = ImageFont.load_default()

    cell_w = (W - 2*M - (cols-1)*GAP)//cols
    cell_h = (H - 2*M - (rows-1)*GAP)//rows

    # Safety: don’t read past alphabet length
    total_cells = rows * cols
    n = min(total_cells, len(alphabet))

    k = 0
    for r in range(rows):
        for c in range(cols):
            x0 = M + c*(cell_w+GAP)
            y0 = M + r*(cell_h+GAP)
            x1, y1 = x0+cell_w, y0+cell_h
            d.rectangle([x0,y0,x1,y1], outline=(200,200,200))
            if k < n:
                ch = alphabet[k]
                bbox = d.textbbox((0,0), ch, font=font)
                tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
                cx = x0 + (cell_w - tw)//2
                cy = y0 + (cell_h - th)//2
                d.text((cx,cy), ch, fill="black", font=font)
                k += 1

    im.save(out_path)
    print(f"[ok] saved grid sheet ({rows}x{cols}) → {out_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", help="Text to write for AUTO mode")
    ap.add_argument("--outfile", default="sheet.png", help="Output PNG path")
    ap.add_argument("--grid", type=int, default=0, help="1 for grid, 0 for text")
    ap.add_argument("--rows", type=int, default=10)
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--order", help="Path to order JSON (e.g. BeeFontCore/services/templates/order/order_DE_8x10.json)")
    args = ap.parse_args()

    if args.grid:
        draw_grid_from_order(args.order or "", args.rows, args.cols, args.outfile)
    else:
        draw_text_line(args.text or "ABCDabcd0123", args.outfile)

 