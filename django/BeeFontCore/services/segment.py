# BeeFontCore/services/segment.py
#
# V3-only:
# - keine TemplateSlot-Modelle
# - keine JSON-Template-Files
# - arbeitet nur mit:
#     * abs_scan_path (Pfad zur PNG)
#     * tpl (Template-Config aus TemplateDefinition -> template_to_config)
#     * letters (String "ABC...")
#     * dbg_dir (Debugverzeichnis)
# - gibt pro nicht-leerer Zelle (cell_index, letter, Image) zurück

from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
from PIL import Image

from django.conf import settings

from .template_utils import (
    template_raster_size,
    grid_cells_px,
    DPI_DEFAULT,
)


# ---------------------------
# Low-level image helpers
# ---------------------------

def _remove_small_components(mask01: np.ndarray, min_area: int, dbg_dir: Path | None = None) -> np.ndarray:
    """
    Remove tiny connected components (noise) from a 0/1 mask.
    min_area is in pixels (component area threshold).
    """
    if mask01.dtype != np.uint8:
        mask_u8 = (mask01 > 0).astype(np.uint8)
    else:
        mask_u8 = (mask01 > 0).astype(np.uint8)

    H, W = mask_u8.shape[:2]
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)

    cleaned = np.zeros_like(mask_u8, dtype=np.uint8)
    removed = 0
    kept = 0

    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]
        if area >= min_area:
            cleaned[labels == label] = 1
            kept += 1
        else:
            removed += 1

    if dbg_dir is not None:
        (dbg_dir / "_debug_cc_cleaning.txt").write_text(
            f"H={H} W={W}\n"
            f"num_labels={num_labels}\n"
            f"min_area={min_area}\n"
            f"kept_components={kept}\n"
            f"removed_components={removed}\n",
            encoding="utf-8"
        )
        cv2.imwrite(str(dbg_dir / "_debug_binarize_mask01_before_cc.png"), mask01 * 255)
        cv2.imwrite(str(dbg_dir / "_debug_binarize_mask01_after_cc.png"), cleaned * 255)

    return cleaned


def _find_fiducials_from_mask(mask01: np.ndarray, dbg_dir: Path | None = None):
    """
    Detect 4 square-like fiducials near the page corners, using a 0/1 mask.
    Returns (points, dbg) with points in TL, TR, BR, BL order.
    """
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

    # debug overlay on mask itself
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
    Tuned for pencil/pen on paper with uneven illumination.
    """
    bgr = img
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_gray.png"), gray)

    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_gray_blur.png"), gray_blur)

    gb_flat = gray_blur.astype(np.float32).ravel()

    # histogram-based threshold
    darkpercentile = 2
    bgpercentile = 50
    dark = np.percentile(gb_flat, darkpercentile)
    bg = np.percentile(gb_flat, bgpercentile)

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

    _, thr = cv2.threshold(gray_blur, T, 255, cv2.THRESH_BINARY_INV)
    ink_ratio = float((thr > 0).mean())

    if dbg_dir is not None:
        (dbg_dir / "_debug_binarize_thresholds_ratio.txt").write_text(
            f"T_used={T:.2f}\n"
            f"ink_ratio_candidate1={ink_ratio:.4f}\n",
            encoding="utf-8"
        )
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_raw.png"), thr)

    # sanity check: fallback to Otsu if insane
    if ink_ratio < 0.005 or ink_ratio > 0.7:
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

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    thr_open = cv2.morphologyEx(thr, cv2.MORPH_OPEN, k, iterations=1)
    thr_close = cv2.morphologyEx(thr_open, cv2.MORPH_CLOSE, k, iterations=1)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_open.png"), thr_open)
        cv2.imwrite(str(dbg_dir / "_debug_binarize_thr_close.png"), thr_close)

    mask01 = (thr_close > 0).astype(np.uint8)

    H, W = mask01.shape[:2]
    min_area_cc = max(8, int(0.000001 * (H * W)))
    min_area_cc = min(min_area_cc, 200)

    mask01_clean = _remove_small_components(mask01, min_area_cc, dbg_dir=dbg_dir)

    if dbg_dir is not None:
        cv2.imwrite(str(dbg_dir / "_debug_binarize_mask01.png"), mask01 * 255)
        cv2.imwrite(str(dbg_dir / "_debug_binarize_mask01_clean.png"), mask01_clean * 255)
        (dbg_dir / "_debug_binarize_meta.txt").write_text(
            f"H={H} W={W}\n"
            f"ink_ratio_final={(mask01_clean > 0).mean():.4f}\n"
            f"min_area_cc={min_area_cc}\n",
            encoding="utf-8"
        )

    return mask01_clean


def _tight_crop(mask: np.ndarray, pad: int = 6) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        return mask  # empty
    y0, y1 = max(0, ys.min() - pad), min(mask.shape[0] - 1, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(mask.shape[1] - 1, xs.max() + pad)
    return mask[y0:y1+1, x0:x1+1]


def _place_on_canvas(mask01: np.ndarray, size: int = 1024, margin: int = 96) -> Image.Image:
    """
    mask01: 1=ink (black), 0=bg (white). Center into a square canvas.
    """
    h, w = mask01.shape[:2]
    canvas = np.full((size, size), 255, np.uint8)  # white
    if h == 0 or w == 0 or mask01.sum() == 0:
        return Image.fromarray(canvas)

    scale = (size - 2 * margin) / max(h, w)
    nh, nw = max(1, int(h * scale)), max(1, int(w * scale))
    glyph = cv2.resize(mask01 * 255, (nw, nh), interpolation=cv2.INTER_NEAREST)
    y0, x0 = (size - nh) // 2, (size - nw) // 2
    glyph = 255 - glyph  # 0=ink, 255=bg
    roi = canvas[y0:y0+nh, x0:x0+nw]
    canvas[y0:y0+nh, x0:x0+nw] = np.minimum(roi, glyph)
    return Image.fromarray(canvas)


def _quad_ok_for_template(fid_pts, Wt, Ht) -> bool:
    """
    Check if the detected quad (TL,TR,BR,BL) is geometrically compatible
    with the template raster size (Wt,Ht).
    """
    if fid_pts is None or len(fid_pts) != 4:
        return False

    (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = fid_pts

    width_top = float(np.hypot(trx - tlx, try_ - tly))
    width_bottom = float(np.hypot(brx - blx, bry - bly))
    height_left = float(np.hypot(blx - tlx, bly - tly))
    height_right = float(np.hypot(brx - trx, bry - try_))

    eps = 1e-6
    if width_top < 10 or width_bottom < 10 or height_left < 10 or height_right < 10:
        return False

    w_ratio = max(width_top, width_bottom) / max(min(width_top, width_bottom), eps)
    h_ratio = max(height_left, height_right) / max(min(height_left, height_right), eps)

    if w_ratio > 2.0 or h_ratio > 2.0:
        return False

    quad_w = 0.5 * (width_top + width_bottom)
    quad_h = 0.5 * (height_left + height_right)
    aspect_quad = quad_w / max(quad_h, eps)
    aspect_tpl = float(Wt) / max(float(Ht), eps)

    ar_ratio = max(aspect_quad, aspect_tpl) / max(min(aspect_quad, aspect_tpl), eps)
    if ar_ratio > 1.6:
        return False

    return True


# -------------------------------------------------------------------
# V3: Analyse für JobPage
# -------------------------------------------------------------------

def analyse_job_page_scan(
    abs_scan_path: Path,
    tpl: dict,
    letters: str,
    dbg_dir: Path,
) -> list[tuple[int, str, Image.Image]]:
    """
    V3-Helfer: analysiert einen einzelnen Scan für eine JobPage.

    Parameter:
      abs_scan_path : absoluter Pfad zur Scan-Datei
      tpl           : Template-Config (aus TemplateDefinition → template_to_config)
      letters       : String mit Buchstaben für diese Seite (z.B. "ABC...")
      dbg_dir       : Verzeichnis für Debug-Ausgaben

    Rückgabe:
      Liste von (cell_index, letter, PIL.Image.Image),
      wobei das Image bereits auf 1024x1024 Canvas normalisiert ist.
    """
    if not abs_scan_path.exists():
        raise RuntimeError(f"scan file not found: {abs_scan_path}")

    dbg_dir.mkdir(parents=True, exist_ok=True)

    # Scan laden
    file_bytes = np.fromfile(str(abs_scan_path), dtype=np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"Could not read scan: {abs_scan_path}")

    # Rastergröße laut Template
    Wt, Ht = template_raster_size(tpl, dpi=DPI_DEFAULT)

    # 1) global binarisieren
    full_mask_raw = _binarize(img, dbg_dir=dbg_dir)
    cv2.imwrite(str(dbg_dir / "_debug_mask_prewarp.png"), (full_mask_raw * 255).astype(np.uint8))

    # 2) Fiducials
    fid, dbg_fid = None, None
    res = _find_fiducials_from_mask(full_mask_raw, dbg_dir=dbg_dir)
    if res is not None:
        if isinstance(res, tuple) and len(res) == 2:
            fid, dbg_fid = res
        else:
            fid = res

    # 3) optional Warp
    if fid is not None and len(fid) == 4 and _quad_ok_for_template(fid, Wt, Ht):
        src = np.float32(fid)  # TL,TR,BR,BL
        dst = np.float32(
            [
                [20, 20],
                [Wt - 20, 20],
                [Wt - 20, Ht - 20],
                [20, Ht - 20],
            ]
        )
        M = cv2.getPerspectiveTransform(src, dst)
        try:
            ok_det = abs(np.linalg.det(M[:2, :2])) > 1e-8
        except Exception:
            ok_det = False

        if ok_det:
            img = cv2.warpPerspective(img, M, (Wt, Ht))

            mask_u8 = (full_mask_raw > 0).astype(np.uint8) * 255
            mask_warp = cv2.warpPerspective(mask_u8, M, (Wt, Ht))
            full_mask = (mask_warp > 0).astype(np.uint8)

            cv2.imwrite(str(dbg_dir / "_debug_warp.png"), img)
            cv2.imwrite(str(dbg_dir / "_debug_mask.png"), (full_mask * 255).astype(np.uint8))
        else:
            full_mask = full_mask_raw
            cv2.imwrite(str(dbg_dir / "_debug_warp_skipped_det.png"), img)
            cv2.imwrite(str(dbg_dir / "_debug_mask.png"), (full_mask * 255).astype(np.uint8))
    else:
        full_mask = full_mask_raw
        cv2.imwrite(str(dbg_dir / "_debug_mask.png"), (full_mask * 255).astype(np.uint8))
        if dbg_fid is not None:
            cv2.imwrite(str(dbg_dir / "_debug_fiducials_REJECTED.png"), dbg_fid)

    # 4) Grid-Zellen
    cells, _, _ = grid_cells_px(tpl, dpi=DPI_DEFAULT, W=Wt, H=Ht)

    letters = letters or ""
    n = min(len(cells), len(letters))

    results: list[tuple[int, str, Image.Image]] = []

    for i in range(n):
        letter = letters[i]
        if not letter:
            continue

        y0, y1, x0, x1 = cells[i]
        cell = full_mask[y0:y1, x0:x1].copy()
        ch, cw = y1 - y0, x1 - x0

        # Gridlinien trimmen
        border = max(2, min(ch, cw) // 50)
        if ch > 2 * border and cw > 2 * border:
            cell = cell[border:ch - border, border:cw - border]
            ch, cw = cell.shape

        # Index-Ecke killen
        idx_h = max(8, ch // 5)  # ~20 %
        idx_w = max(8, cw // 5)
        cell[:idx_h, :idx_w] = 0

        if cell.sum() < 50:
            continue

        cropped = _tight_crop(cell)
        if cropped.sum() == 0:
            continue

        im = _place_on_canvas(cropped, size=1024, margin=96)
        results.append((i, letter, im))

    return results
