# django/BeeFontCore/services/inspect_font.py
import sys
from pathlib import Path
from fontTools.ttLib import TTFont


NAMES_TO_CHECK = ["A", "a", "zero", "comma", "adieresis", "germandbls"]


def inspect_glyph(font: TTFont, name: str):
    glyf_table = font["glyf"]
    hmtx_table = font["hmtx"]

    if name not in glyf_table.glyphs:
        print(f"{name}: NOT IN glyf table")
        return

    g = glyf_table[name]
    n_contours = getattr(g, "numberOfContours", None)
    bounds = (
        getattr(g, "xMin", None),
        getattr(g, "yMin", None),
        getattr(g, "xMax", None),
        getattr(g, "yMax", None),
    )
    width, lsb = hmtx_table.metrics.get(name, (None, None))

    print(f"{name}: contours={n_contours}, bounds={bounds}, width={width}, lsb={lsb}")
 


def main():
    if len(sys.argv) > 1:
        ttf_path = Path(sys.argv[1])
    else:
        ttf_path = Path("/app/media/beefont/builds/BeeHand3.ttf")

    if not ttf_path.exists():
        print(f"TTF not found: {ttf_path}")
        sys.exit(1)

    font = TTFont(str(ttf_path))

    print("Path:", ttf_path)
    print("Family:", font["name"].getDebugName(1))
    print("Subfamily:", font["name"].getDebugName(2))
    print("Num glyphs:", font["maxp"].numGlyphs)
    print()

    for name in NAMES_TO_CHECK:
        inspect_glyph(font, name)


if __name__ == "__main__":
    main()
