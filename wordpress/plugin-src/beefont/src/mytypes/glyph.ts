// src/mytypes/glyph.ts
 

/**
 * GlyphFormat – mirrors Django GlyphFormat TextChoices ("png", "svg").
 */
export type GlyphFormat = 'png' | 'svg';

/**
 * Global default glyph format.
 * Use this everywhere instead of hard-coding 'svg'.
 */
export const DEFAULT_GLYPH_FORMAT: GlyphFormat = 'svg';
 
 

/**
 * GlyphVariantSelectionSerializer
 *
 * DRF serializer:
 *
 * class GlyphVariantSelectionSerializer(serializers.Serializer):
 *     glyph_id = serializers.IntegerField(required=False)
 *     variant_index = serializers.IntegerField(required=False)
 *
 *     def validate(self, attrs):
 *         if not attrs.get("glyph_id") and not attrs.get("variant_index"):
 *             raise serializers.ValidationError(
 *                 "Entweder 'glyph_id' oder 'variant_index' muss gesetzt sein."
 *             )
 *         return attrs
 *
 * Both fields are optional, but at least one must be provided.
 */
export type GlyphVariantSelection = {
  glyph_id?: number | null;
  variant_index?: number | null;
};


/**
 * Mirrors the Django GlyphSerializer.
 *
 * Fields are based on what the frontend actually uses:
 * - id, letter, image_path, is_default, variant_index, cell_index, format
 * - plus a few optional metadata fields you might have on the backend.
 */
export interface Glyph {
  id: number;
  /**
   * Logical letter this glyph represents, e.g. "A", "a", "ß".
   */
  letter: string;

  /**
   * 'png' or 'svg' – mirrors Django GlyphFormat TextChoices.
   */
  formattype: GlyphFormat;

  /**
   * Variant index for this letter (0, 1, 2, …).
   * Used in GlyphVariantsGrid and DefaultGlyphGrid.
   */
  variant_index: number;

  /**
   * Index of the source cell on the template page (0-based or 1-based,
   * depending on your backend). Only used for display.
   */
  cell_index: number;

  /**
   * Path to the raster or vector file relative to MEDIA_ROOT,
   * e.g. "beefont/jobs/<sid>/glyphs/A_0.svg".
   */
  image_path: string;

  /**
   * True if this glyph is the default choice for its letter.
   */
  is_default: boolean;

  /**
   * Optional page index for the original scan (if you expose it).
   */
  page_index?: number;

  /**
   * Optional job SID, if the API includes it per glyph.
   */
  job_sid?: string;

  /**
   * Optional timestamps from the backend.
   */
  created_at?: string;
  updated_at?: string;
}

/**
 * Convenience type: full list from GET /jobs/{sid}/glyphs/
 */
export type GlyphList = Glyph[];

/**
 * Convenience type: group glyphs by letter in memory.
 */
export type GlyphByLetterMap = Record<string, Glyph[]>;
