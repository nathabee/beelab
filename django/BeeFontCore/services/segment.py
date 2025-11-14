import json
from pathlib import Path
from typing import List, Tuple
from django.conf import settings
from PIL import Image
import cv2
import numpy as np
  
from .template_utils import template_raster_size, grid_cells_px, DPI_DEFAULT, FIDUCIAL

from pathlib import Path
import json 
_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
_DEFAULT_TEMPLATE = _TEMPLATE_DIR / "A4_10x10.json"

def _load_template(name: str | None) -> dict:
    """Return template dict; fall back to default."""
    if name:
        p = _TEMPLATE_DIR / f"{name}.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return json.loads(_DEFAULT_TEMPLATE.read_text(encoding="utf-8"))

def _glyph_order_for_template(tpl: dict) -> list[str]:
    order_rel = tpl.get("order_file", "order/order_10x10.json")
    order_path = _TEMPLATE_DIR / order_rel
    return json.loads(order_path.read_text(encoding="utf-8"))


def _find_fiducials_from_mask(mask01: np.ndarray, dbg_dir: Path | None = None):
    """
    Detect 4 square-like fiducials near the page corners, using a 0/1 mask.
    Returns (points, dbg) with points in TL, TR, BR, BL order.

    If dbg_dir is given, writes _fid_mask.png there.
    """
    # mask01 is 0/1 or 0/255; normalise to 0/255 uint8
    if mask01.dtype != np.uint8:
        mask_u8 = (mask01 > 0).astype(np.uint8) * 255
    else:
        mask_u8 = (mask01 > 0).astype(np.uint8) * 255

    H, W = mask_u8.shape[:2]

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_fid_mask.png"), mask_u8)

    cnts, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return None

    # size constraints: side between 1% and 8% of min(H,W)
    min_side = 0.01 * min(H, W)
    max_side = 0.08 * min(H, W)

    cand = []  # (cx, cy, w, h, contour_index)
    for idx, c in enumerate(cnts):
        x, y, w, h = cv2.boundingRect(c)
        side_min = min(w, h)
        side_max = max(w, h)

        if side_min < min_side or side_max > max_side:
            continue

        ratio = w / float(h + 1e-6)
        # roughly square-ish
        if ratio < 0.6 or ratio > 1.4:
            continue

        cx = x + w / 2.0
        cy = y + h / 2.0
        cand.append((cx, cy, w, h, idx))

    if len(cand) < 4:
        if dbg_dir is not None:
            (dbg_dir / "_fid_debug_counts.txt").write_text(
                f"[MASK FID] contours={len(cnts)}, candidates={len(cand)}",
                encoding="utf-8"
            )
        return None

    def nearest_to_corner(target_x: float, target_y: float, used: set[int]) -> int | None:
        best_idx = None
        best_d2 = 1e18
        for i, (cx, cy, w, h, idx) in enumerate(cand):
            if i in used:
                continue
            dx = cx - target_x
            dy = cy - target_y
            d2 = dx * dx + dy * dy
            if d2 < best_d2:
                best_d2 = d2
                best_idx = i
        return best_idx

    used: set[int] = set()

    i_tl = nearest_to_corner(0.0, 0.0, used)
    if i_tl is None:
        return None
    used.add(i_tl)

    i_tr = nearest_to_corner(float(W), 0.0, used)
    if i_tr is None:
        return None
    used.add(i_tr)

    i_br = nearest_to_corner(float(W), float(H), used)
    if i_br is None:
        return None
    used.add(i_br)

    i_bl = nearest_to_corner(0.0, float(H), used)
    if i_bl is None:
        return None

    tl = cand[i_tl]
    tr = cand[i_tr]
    br = cand[i_br]
    bl = cand[i_bl]

    points = [
        (tl[0], tl[1]),
        (tr[0], tr[1]),
        (br[0], br[1]),
        (bl[0], bl[1]),
    ]

    # debug overlay on mask itself (so you see exactly what was used)
    dbg = np.dstack([mask_u8] * 3)
    colors = {
        "TL": (0, 255, 0),
        "TR": (255, 0, 0),
        "BR": (0, 0, 255),
        "BL": (255, 255, 0),
    }
    for label, (cx, cy) in zip(("TL", "TR", "BR", "BL"), points):
        cx_i, cy_i = int(cx), int(cy)
        cv2.circle(dbg, (cx_i, cy_i), 8, colors[label], -1)
        cv2.putText(
            dbg, label, (cx_i + 10, cy_i - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, colors[label], 2, cv2.LINE_AA
        )

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_fiducials_on_mask.png"), dbg)

    return points, dbg

def _binarize(img: np.ndarray, dbg_dir: Path | None = None) -> np.ndarray:
    """
    Returns mask01 with ink=1, bg=0.
    """
    # --- 1. normalize to BGR ---
    #if img.ndim == 3 and img.shape[2] == 4:
    #    bgr = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    #elif img.ndim == 3:
    #    bgr = img
    #else:
    #    bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    #if dbg_dir is not None:
    #    cv2.imwrite(str(dbg_dir / "_debug_binarize_bgr.png"), bgr)

    # --- 2. grayscale + mild contrast stretch ---
    bgr=img
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # equalize to boost light pencil vs paper
    #gray_eq = cv2.equalizeHist(gray)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_gray.png"), gray)
        #cv2.imwrite(str(dbg_dir / "_debug_binarize_gray_eq.png"), gray_eq)

    #gray_blur = cv2.GaussianBlur(gray_eq, (3, 3), 0)
    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_gray_blur.png"), gray_blur)

    gb_flat = gray_blur.astype(np.float32).ravel() 

    # --- 3. histogram-based threshold (more conservative) ---
    # Use higher percentile for "dark" so we don't anchor on extreme shadows.
    darkpercentile = 2
    bgpercentile = 50
    dark = np.percentile(gb_flat, darkpercentile)   #before25
    bg   = np.percentile(gb_flat, bgpercentile)  #before 99   bright part of paper

    alpha = 0.4
    T = dark + alpha * (bg - dark)
    T = float(np.clip(T, 0, 255))

    if dbg_dir is not None:
        (dbg_dir / "_debug_binarize_thresholds_initial.txt").write_text(
            f"dark={dark:.2f}\n"
            f"bg={bg:.2f}\n"
            f"darkpercentile={darkpercentile:.2f}\n"
            f"bgpercentile={bgpercentile:.2f}\n"
            f"alpha={alpha:.2f}\n"
            f"T_initial={T:.2f}\n",
            encoding="utf-8"
        )

    # --- 4. apply threshold (candidate 1) ---
    _, thr = cv2.threshold(gray_blur, T, 255, cv2.THRESH_BINARY_INV)

    ink_ratio = float((thr > 0).mean())  # fraction of pixels considered ink

    if dbg_dir is not None:
        (dbg_dir / "_debug_binarize_thresholds_ratio.txt").write_text(
            f"T_used={T:.2f}\n"
            f"ink_ratio_candidate1={ink_ratio:.4f}\n",
            encoding="utf-8"
        )
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_raw.png"), thr)

    # --- 5. sanity check: if almost everything or almost nothing is ink, fallback ---
    if ink_ratio < 0.005 or ink_ratio > 0.7:
        # fallback: Otsu on the same blurred image
        _, thr_otsu = cv2.threshold(
            gray_blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )
        ink_ratio_otsu = float((thr_otsu > 0).mean())

        if dbg_dir is not None:
            (dbg_dir / "_debug_binarize_thresholds_otsu.txt").write_text(
                f"ink_ratio_candidate1={ink_ratio:.4f}\n"
                f"ink_ratio_otsu={ink_ratio_otsu:.4f}\n",
                encoding="utf-8"
            )
            cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_otsu.png"), thr_otsu)

        # choose the better one: closer to some sane range like 1–40% ink
        target_low, target_high = 0.01, 0.4

        def dist_to_range(x, lo, hi):
            if x < lo:
                return lo - x
            if x > hi:
                return x - hi
            return 0.0

        d1 = dist_to_range(ink_ratio, target_low, target_high)
        d2 = dist_to_range(ink_ratio_otsu, target_low, target_high)

        if d2 < d1:
            thr = thr_otsu
            ink_ratio = ink_ratio_otsu

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_chosen.png"), thr)

    # --- 6. morphology (open + close) ---
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_kernel.png"), (k * 255).astype(np.uint8))

    thr_open = cv2.morphologyEx(thr, cv2.MORPH_OPEN, k, iterations=1)
    thr_close = cv2.morphologyEx(thr_open, cv2.MORPH_CLOSE, k, iterations=1)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_open.png"), thr_open)
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_close.png"), thr_close)

    # final mask: 1=ink, 0=bg
    mask01 = (thr_close > 0).astype(np.uint8)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_mask01.png"), mask01 * 255)

    return mask01


# --- add this helper (new) ---
def _contour_boxes(mask01: np.ndarray, min_area: int) -> list[tuple[int,int,int,int]]:
    """
    Find external contours and return bounding boxes (y0,y1,x0,x1), sorted left->right.
    """
    cnts, _ = cv2.findContours((mask01*255).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        area = w*h
        if area >= min_area and w > 1 and h > 1:
            boxes.append((y, y+h, x, x+w))
    # one text line → sort by x; more lines → sort by (row band, x)
    band = max(1, mask01.shape[0] // 25)
    boxes.sort(key=lambda b: (b[0] // band, b[2]))
    return boxes

def _tight_crop(mask: np.ndarray, pad: int = 6) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        return mask  # empty
    y0, y1 = max(0, ys.min() - pad), min(mask.shape[0] - 1, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(mask.shape[1] - 1, xs.max() + pad)
    return mask[y0:y1+1, x0:x1+1]

def _place_on_canvas(mask01: np.ndarray, size: int = 1024, margin: int = 96) -> Image.Image:
    """mask01: 1=ink (black), 0=bg (white). Center into square canvas."""
    h, w = mask01.shape[:2]
    canvas = np.full((size, size), 255, np.uint8)  # white
    if h == 0 or w == 0 or mask01.sum() == 0:
        return Image.fromarray(canvas)

    scale = (size - 2*margin) / max(h, w)
    nh, nw = max(1, int(h*scale)), max(1, int(w*scale))
    glyph = cv2.resize(mask01 * 255, (nw, nh), interpolation=cv2.INTER_NEAREST)
    y0, x0 = (size - nh)//2, (size - nw)//2
    # draw as black ink
    glyph = 255 - glyph  # 0=ink, 255=bg
    roi = canvas[y0:y0+nh, x0:x0+nw]
    canvas[y0:y0+nh, x0:x0+nw] = np.minimum(roi, glyph)
    return Image.fromarray(canvas)

def _grid_cells(H: int, W: int, rows: int, cols: int, outer_frac=0.04, gap_frac=0.012) -> List[Tuple[int,int,int,int]]:
    outer = round(min(H, W) * outer_frac)
    gap   = round(min(H, W) * gap_frac)
    top = left = outer
    bot = H - outer
    right = W - outer
    gh = bot - top
    gw = right - left
    total_gap_v = gap * (rows - 1)
    total_gap_h = gap * (cols - 1)
    cell_h = max(8, (gh - total_gap_v) // rows)
    cell_w = max(8, (gw - total_gap_h) // cols)
    cells = []
    for r in range(rows):
        for c in range(cols):
            y0 = top + r * (cell_h + gap)
            x0 = left + c * (cell_w + gap)
            y1 = min(bot, y0 + cell_h)
            x1 = min(right, x0 + cell_w)
            cells.append((y0, y1, x0, x1))
    return cells

def _quad_ok_for_template(fid_pts, Wt, Ht) -> bool:
    """
    Check if the detected quad (TL,TR,BR,BL) is geometrically compatible
    with the template raster size (Wt,Ht).

    Reject if:
      - top vs bottom width differ by more than ~2×
      - left vs right height differ by more than ~2×
      - aspect ratio of the quad vs template is way off
    """
    if fid_pts is None or len(fid_pts) != 4:
        return False

    (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = fid_pts

    width_top    = float(np.hypot(trx - tlx, try_ - tly))
    width_bottom = float(np.hypot(brx - blx, bry - bly))
    height_left  = float(np.hypot(blx - tlx, bly - tly))
    height_right = float(np.hypot(brx - trx, bry - try_))

    # avoid zero / tiny
    eps = 1e-6
    if width_top < 10 or width_bottom < 10 or height_left < 10 or height_right < 10:
        return False

    # relative differences top/bottom, left/right
    w_ratio = max(width_top, width_bottom) / max(min(width_top, width_bottom), eps)
    h_ratio = max(height_left, height_right) / max(min(height_left, height_right), eps)

    if w_ratio > 2.0 or h_ratio > 2.0:
        # one side is way longer/shorter than its opposite → suspicious quad
        return False

    # aspect ratio of the detected quad vs template
    quad_w = 0.5 * (width_top + width_bottom)
    quad_h = 0.5 * (height_left + height_right)
    aspect_quad = quad_w / max(quad_h, eps)
    aspect_tpl  = float(Wt) / max(float(Ht), eps)

    ar_ratio = max(aspect_quad, aspect_tpl) / max(min(aspect_quad, aspect_tpl), eps)
    if ar_ratio > 1.6:  # allow some perspective but not crazy distortion
        return False

    return True


def segment_sheet(job):
    media_root = Path(settings.MEDIA_ROOT)
    upload_path = media_root / job.upload.name
    out_dir = media_root / "beefont" / "segments" / job.sid
    out_dir.mkdir(parents=True, exist_ok=True)
    dbg_dir = media_root / "beefont" / "debug" / job.sid
    dbg_dir.mkdir(parents=True, exist_ok=True) 

    # load original
    file_bytes = np.fromfile(str(upload_path), dtype=np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"Could not read upload: {upload_path}")

    # template + order
    tpl = _load_template(job.template_name)
    order = _glyph_order_for_template(tpl)

    # target raster
    Wt, Ht = template_raster_size(tpl, dpi=DPI_DEFAULT)

    # 1) global mask BEFORE any warp (this is what we trust for fiducials)
    full_mask_raw = _binarize(img, dbg_dir=dbg_dir)
    cv2.imwrite(str(dbg_dir / "_debug_mask_prewarp.png"),
                (full_mask_raw * 255).astype(np.uint8))

    # 2) fiducials on the mask (not the original RGB image)
    fid, dbg_fid = None, None
    res = _find_fiducials_from_mask(full_mask_raw, dbg_dir=dbg_dir)
    if res is not None:
        if isinstance(res, tuple) and len(res) == 2:
            fid, dbg_fid = res
        else:
            fid = res  # unlikely, but keep pattern

    # 3) optional warp: we warp BOTH img and mask using same M
    if fid is not None and len(fid) == 4 and _quad_ok_for_template(fid, Wt, Ht):
        src = np.float32(fid)  # TL,TR,BR,BL in image / mask coords
        dst = np.float32([[20, 20],
                          [Wt - 20, 20],
                          [Wt - 20, Ht - 20],
                          [20, Ht - 20]])
        M = cv2.getPerspectiveTransform(src, dst)
        try:
            ok_det = abs(np.linalg.det(M[:2, :2])) > 1e-8
        except Exception:
            ok_det = False

        if ok_det:
            # warp original color image
            img = cv2.warpPerspective(img, M, (Wt, Ht))

            # warp mask as well
            mask_u8 = (full_mask_raw > 0).astype(np.uint8) * 255
            mask_warp = cv2.warpPerspective(mask_u8, M, (Wt, Ht))
            full_mask = (mask_warp > 0).astype(np.uint8)

            cv2.imwrite(str(dbg_dir / "_debug_warp.png"), img)
            cv2.imwrite(str(dbg_dir / "_debug_mask.png"),
                        (full_mask * 255).astype(np.uint8))
        else:
            img = img  # no-op
            full_mask = full_mask_raw
            cv2.imwrite(str(dbg_dir / "_debug_warp_skipped_det.png"), img)
            cv2.imwrite(str(dbg_dir / "_debug_mask.png"),
                        (full_mask * 255).astype(np.uint8))
    else:
        # no fiducials or quad rejected → no warp
        full_mask = full_mask_raw
        cv2.imwrite(str(dbg_dir / "_debug_mask.png"),
                    (full_mask * 255).astype(np.uint8))
        if dbg_fid is not None:
            cv2.imwrite(str(dbg_dir / "_debug_fiducials_REJECTED.png"), dbg_fid)

    # 4) fiducial debug meta file
    if fid is not None and len(fid) == 4:
        (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = fid
        width_top    = float(np.hypot(trx - tlx, try_ - tly))
        width_bottom = float(np.hypot(brx - blx, bry - bly))
        height_left  = float(np.hypot(blx - tlx, bly - tly))
        height_right = float(np.hypot(brx - trx, bry - try_))

        quad_w = 0.5 * (width_top + width_bottom)
        quad_h = 0.5 * (height_left + height_right)
        aspect_quad = quad_w / max(quad_h, 1e-6)
        aspect_tpl  = float(Wt) / max(float(Ht), 1e-6)

        debug_txt = f"""FIDUCIAL DEBUG
tl=({tlx:.1f},{tly:.1f})
tr=({trx:.1f},{try_:.1f})
br=({brx:.1f},{bry:.1f})
bl=({blx:.1f},{bly:.1f})
width_top={width_top:.1f}
width_bottom={width_bottom:.1f}
height_left={height_left:.1f}
height_right={height_right:.1f}
aspect_quad={aspect_quad:.3f}
aspect_tpl={aspect_tpl:.3f}
Wt={Wt} Ht={Ht}
"""
    else:
        debug_txt = f"""FIDUCIAL DEBUG
(no fiducials found or quad rejected)
Wt={Wt} Ht={Ht}
"""

    (dbg_dir / "_debug_fiducials_meta.txt").write_text(debug_txt, encoding="utf-8")

    # refresh size after possible warp
    H, W = img.shape[:2]

    saved = 0
    tokens_iter = iter(order)

    # --- AUTO mode (no template grid) ---
    if (job.template_name or "").upper() == "AUTO":
        min_area = max(8, int(0.000002 * (H * W)))
        boxes = _contour_boxes(full_mask, min_area=min_area)

        dbg = (full_mask * 255).astype(np.uint8)
        dbg = cv2.cvtColor(dbg, cv2.COLOR_GRAY2BGR)
        for i, (y0, y1, x0, x1) in enumerate(boxes):
            cv2.rectangle(dbg, (x0, y0), (x1, y1), (0, 0, 255), 2)
            cv2.putText(dbg, str(i), (x0, max(0, y0 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1, cv2.LINE_AA)
        cv2.imwrite(str(out_dir / "_debug_boxes.png"), dbg)

        for box in boxes:
            token = next(tokens_iter, None)
            if token is None:
                break
            y0, y1, x0, x1 = box
            cropped = _tight_crop(full_mask[y0:y1, x0:x1])
            if cropped.sum() == 0:
                continue
            im = _place_on_canvas(cropped, size=1024, margin=96)
            im.save(out_dir / f"{token}.png")
            saved += 1

    # --- GRID mode (template-driven segmentation) ---
    else:
        rows, cols = int(tpl["grid"]["rows"]), int(tpl["grid"]["cols"])
        cells = _grid_cells(H, W, rows, cols)
        n = min(len(cells), len(order))

        for i in range(n):
            token = order[i]
            y0, y1, x0, x1 = cells[i]
            cell = full_mask[y0:y1, x0:x1].copy()
            ch, cw = y1 - y0, x1 - x0

            border = max(2, min(ch, cw) // 50)  # ~2%
            if ch > 2 * border and cw > 2 * border:
                cell = cell[border:ch - border, border:cw - border]
                ch, cw = cell.shape

            idx_h = max(8, ch // 5)  # ~20%
            idx_w = max(8, cw // 5)
            cell[:idx_h, :idx_w] = 0

            if cell.sum() < 50:
                continue

            cropped = _tight_crop(cell)
            if cropped.sum() == 0:
                continue

            im = _place_on_canvas(cropped, size=1024, margin=96)
            im.save(out_dir / f"{token}.png")
            saved += 1

    if saved == 0:
        Image.new("L", (1024, 1024), 255).save(out_dir / "space.png")

    return str(out_dir)
