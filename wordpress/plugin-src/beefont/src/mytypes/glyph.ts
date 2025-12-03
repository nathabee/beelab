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
 * GlyphSerializer (backend DTO)
 *
 * fields (current BeeFontCore):
 *   id:            int
 *   letter:        string
 *   variant_index: int
 *   cell_index:    int
 *   image_path:    string
 *   is_default:    boolean
 *   format:        "png" | "svg"
 */
export interface Glyph {
  id: number;
  letter: string;
  variant_index: number;
  cell_index: number;
  image_path: string;
  is_default: boolean;
  format: GlyphFormat;
}

/**
 * Convenience alias for lists of glyphs.
 */
export type GlyphList = Glyph[];

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
