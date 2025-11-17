# django/BeeFontCore/services/inspect_font.py
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

# Default probe set – fine for DE:
DEFAULT_NAMES_TO_CHECK = ["A", "a", "zero", "comma", "adieresis", "germandbls"]


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
    # argv:
    #   1: path to TTF (optional)
    #   2+: glyph names to inspect (optional)
    if len(sys.argv) > 1:
        ttf_path = Path(sys.argv[1])
        names = sys.argv[2:] or DEFAULT_NAMES_TO_CHECK
    else:
        # Adjust this to your V2 default output name if you like
        ttf_path = Path("/app/media/beefont/builds/BeeHand_DE_.ttf")
        names = DEFAULT_NAMES_TO_CHECK

    if not ttf_path.exists():
        print(f"TTF not found: {ttf_path}")
        sys.exit(1)

    font = TTFont(str(ttf_path))

    print("Path:", ttf_path)
    print("Family:", font["name"].getDebugName(1))
    print("Subfamily:", font["name"].getDebugName(2))
    print("Num glyphs:", font["maxp"].numGlyphs)
    print()

    for name in names:
        inspect_glyph(font, name)


if __name__ == "__main__":
    main()
