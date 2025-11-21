// src/mytype/languageStatus.ts

/**
 * LanguageStatusSerializer
 *
 * fields = [
 *   "language",
 *   "ready",
 *   "required_chars",
 *   "missing_chars",
 *   "missing_count",
 * ]
 */
export interface LanguageStatus {
  language: string;        // Sprachcode, z. B. "de"
  ready: boolean;
  required_chars: string;  // kompletter Soll-Zeichensatz
  missing_chars: string;   // nur fehlende Zeichen, als String
  missing_count: number;
}

/**
 * Für GET /jobs/{sid}/languages/status:
 * Liste pro Sprache eines Jobs.
 */
export type LanguageStatusList = LanguageStatus[];
