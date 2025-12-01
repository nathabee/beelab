// src/mytype/fontBuild.ts

import type { GlyphFormat } from './glyphSkeletons';

/**
 * FontBuildSerializer
 *
 * Suggested fields:
 *   "id",
 *   "language",       // code string, e.g. "de"
 *   "language_name",  // human readable, e.g. "Deutsch"
 *   "glyph_format",   // "png" | "svg"
 *   "created_at",
 *   "ttf_path",
 *   "log",
 *   "success",
 *
 * If your serializer still exposes "job" or raw language PK,
 * you can add those as optional fields below.
 */
export interface FontBuild {
  id: number;

  // Language code, e.g. "de"
  language: string;

  // Optional, if your serializer exposes it
  language_name?: string;

  glyph_format: GlyphFormat;

  created_at: string;  // ISO-8601
  ttf_path: string;    // relative path under MEDIA_ROOT
  log: string;
  success: boolean;

  // Optional extras in case the serializer still exposes them:
  job?: number;        // FontJob PK
}

/**
 * Payload for requesting a build.
 *
 * Old API: POST /jobs/<sid>/build-ttf/ with JSON { language: "de" }.
 * New API: we pass language + format in the URL, but keeping this
 * type does not hurt and can be reused for logging, mocks, etc.
 */
export interface BuildRequestPayload {
  language: string;
  format?: GlyphFormat;
}

export type FontBuildList = FontBuild[];
