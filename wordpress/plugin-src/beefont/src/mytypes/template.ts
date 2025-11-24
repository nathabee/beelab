// src/mytype/template.ts

/**
 * TemplateDefinitionSerializer
 *
 * fields = [
 *   "code",
 *   "description",
 *   "page_format",
 *   "dpi",
 *   "rows",
 *   "cols",
 *   "capacity",
 * ]
 */
export interface TemplateDefinition {
  code: string;
  description: string;
  page_format: string; // z. B. "A4"
  dpi: number;
  rows: number;
  cols: number;
  capacity: number; // read_only im Backend, aber im Frontend normal nutzbar
}
