// src/mytype/fontBuild.ts

/**
 * FontBuildSerializer
 *
 * fields = [
 *   "id",
 *   "language_code",
 *   "created_at",
 *   "ttf_path",
 *   "success",
 * ]
 *
 * read_only_fields = ["id", "created_at", "ttf_path", "success"]
 */
export interface FontBuild {
  id: number;
  language_code: string;
  created_at: string; // ISO-8601
  ttf_path: string | null;
  success: boolean;
}

export type FontBuildList = FontBuild[];

/**
 * BuildRequestSerializer
 *
 * fields:
 *   language
 *
 * `language` ist eine SlugRelatedField auf SupportedLanguage.code,
 * d. h. im JSON ein String mit dem Sprachcode.
 */
export interface BuildRequestPayload {
  language: string; // z. B. "de", "en", "fr"
}
