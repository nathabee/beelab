// src/mytype/glyph.ts

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
 * Validierung: mindestens eines von beidem muss gesetzt sein.
 */
export interface GlyphVariantSelection {
  glyph_id?: number;
  variant_index?: number;
}
