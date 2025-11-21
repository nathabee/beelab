// src/mytype/fontJob.ts

/**
 * FontJobSerializer
 *
 * fields = [
 *   "id",
 *   "sid",
 *   "name",
 *   "base_family",
 *   "created_at",
 *   "page_count",
 *   "glyph_count",
 * ]
 */
export interface FontJob {
  id: number;
  sid: string;
  name: string;
  base_family: string;
  created_at: string; // ISO-8601
  page_count: number;
  glyph_count: number;
}

/**
 * Praktisch als Rückgabe von GET /jobs
 */
export type FontJobList = FontJob[];
