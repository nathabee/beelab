// src/mytype/language.ts

/**
 * SupportedLanguageSerializer
 *
 * fields = ["code", "name"]
 */
export interface SupportedLanguage {
  code: string;
  name: string;
}

/**
 * SupportedLanguageAlphabetSerializer
 *
 * fields = ["code", "name", "alphabet"]
 */
export interface SupportedLanguageAlphabet extends SupportedLanguage {
  /**
   * Voller Alphabet-String, z. B. "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß..."
   */
  alphabet: string;
}
