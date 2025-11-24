// src/mytype/jobPage.ts

import type { TemplateDefinition } from "./template";

/**
 * JobPageSerializer
 *
 * fields = [
 *   "id",
 *   "page_index",
 *   "template",
 *   "template_code",
 *   "letters",
 *   "scan_image_path",
 *   "analysed_at",
 *   "created_at",
 * ]
 *
 * read_only_fields = ["id", "scan_image_path", "analysed_at", "created_at"]
 *
 * Hinweis:
 * - `template_code` ist write_only im Serializer (für POST/PUT),
 *   daher in der Response in der Regel nicht vorhanden.
 */

/**
 * Repräsentation eines JobPage-Objekts, wie es vom Backend
 * typischerweise zurückkommt (read side).
 */
export interface JobPage {
  id: number;
  page_index: number | null;
  template: TemplateDefinition;
  letters: string;
  scan_image_path: string | null;
  analysed_at: string | null; // ISO-8601 oder null
  created_at: string; // ISO-8601
}

/**
 * Payload für das Anlegen/Aktualisieren einer Seite.
 * Entspricht im Kern dem Serializer-Input.
 *
 * Für `POST /jobs/{sid}/pages/create` wirst du wahrscheinlich
 * zusätzlich `file` und `auto_analyse` im FormData verwenden;
 * das ist außerhalb des DRF-Serializers, daher optional.
 */
export interface JobPageCreatePayload {
  page_index?: number | null;
  template_code: string;
  letters: string;

  // Nicht Teil des Serializers, aber für die Browser-Seite praktisch:
  file?: File;
  auto_analyse?: boolean;
}

export type JobPageList = JobPage[];
