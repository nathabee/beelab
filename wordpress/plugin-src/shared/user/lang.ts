// shared/user/lang.ts
export type LangCode = 'en' | 'fr' | 'de' | 'bz';

export const LANGUAGE_LABELS: Record<LangCode, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  bz: 'Brezhoneg',
};

// Normalize anything like "br"/"BR"/"bre" to 'bz', default to 'en'
export function normalizeLang(raw?: string): LangCode {
  const s = String(raw || 'en').toLowerCase(); 
  if (s === 'en' || s === 'fr' || s === 'de' || s === 'bz') return s as LangCode;
  return 'en';
}
