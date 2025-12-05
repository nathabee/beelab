# BeeFontCore/services/palette.py

from typing import TypedDict
from ..models import JobPalette, FontJob



class PaletteDict(TypedDict):
    primary: str
    accent: str
    secondary: str


DEFAULT_PALETTE_PK = 1


def get_global_default_palette() -> PaletteDict:
    """
    Returns the palette row with pk=1.
    If missing (fixture not loaded), falls back to hardcoded values.
    """
    try:
        p = JobPalette.objects.get(pk=DEFAULT_PALETTE_PK, job=None)
        return {
            "primary": p.primary,
            "accent": p.accent,
            "secondary": p.secondary,
        }
    except JobPalette.DoesNotExist:
        # ultimate fallback if fixture missing
        return {
            "primary": "#000000",
            "accent": "#ff9900",
            "secondary": "#ffffff",
        }


def get_palette_for_job(job: FontJob) -> PaletteDict:
    """
    Returns job.palette if it exists.
    Otherwise returns global default (pk=1).
    """
    try:
        p = job.palette
        return {
            "primary": p.primary,
            "accent": p.accent,
            "secondary": p.secondary,
        }
    except JobPalette.DoesNotExist:
        return get_global_default_palette()
