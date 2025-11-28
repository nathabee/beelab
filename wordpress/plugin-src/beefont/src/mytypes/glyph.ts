// src/mytype/glyph.ts

/**
 * GlyphFormat – mirrors Django GlyphFormat TextChoices ("png", "svg").
 */
export type GlyphFormat = 'png' | 'svg';

/**
 * GlyphSerializer
 *
 * fields = [
 *   "id",
 *   "letter",
 *   "variant_index",
 *   "cell_index",
 *   "page_index",
 *   "image_path",
 *   "format",
 *   "is_default",
 * ]
 *
 * read_only_fields = ["id", "page_index", "image_path"]
 */
export interface Glyph {
  id: number;
  letter: string;
  variant_index: number;
  cell_index: number;
  page_index: number;
  image_path: string;
  format: GlyphFormat;
  is_default: boolean;
}

export type GlyphList = Glyph[];

/**
 * GlyphVariantSelectionSerializer
 *
 * fields:
 *   glyph_id?: number
 *   variant_index?: number
 *
 * Validation: at least one of them must be set.
 */
export interface GlyphVariantSelection {
  glyph_id?: number;
  variant_index?: number;
}
