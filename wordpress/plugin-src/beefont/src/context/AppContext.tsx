// src/context/AppContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import type { InfoResponse, InfoMe } from '@mytypes/info';
import type { TemplateDefinition } from '@mytypes/template';
import type {
  SupportedLanguage,
  SupportedLanguageAlphabet,
} from '@mytypes/language';
import type { FontJob } from '@mytypes/job';

import type { GlyphFormat } from '@mytypes/glyphEditor';
import { DEFAULT_GLYPH_FORMAT } from '@mytypes/glyph';


interface AppContextType {
  // generische App-Funktionen
  reset: () => void;

  // globale Backend-Infos
  info: InfoResponse | null;
  setInfo: (info: InfoResponse | null) => void;

  // aktueller User (/me/)
  me: InfoMe | null;
  setMe: (me: InfoMe | null) => void;

  // BeeFont-Bootstrap
  templates: TemplateDefinition[] | null;
  setTemplates: (templates: TemplateDefinition[] | null) => void;

  languages: SupportedLanguage[] | null;
  setLanguages: (languages: SupportedLanguage[] | null) => void;

  alphabets: Record<string, SupportedLanguageAlphabet> | null;
  setAlphabets: (
    alphabets: Record<string, SupportedLanguageAlphabet> | null
  ) => void;

  bootstrapReady: boolean;
  setBootstrapReady: (ready: boolean) => void;

  // BeeFont: aktuell ausgewählter Job
  activeJob: FontJob | null;
  setActiveJob: (job: FontJob | null) => void;

  // BeeFont: globales Standard-Glyphformat (png/svg)
  activeGlyphFormat: GlyphFormat;
  setActiveGlyphFormat: (format: GlyphFormat) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [info, internalSetInfo] = useState<InfoResponse | null>(null);
  const [me, internalSetMe] = useState<InfoMe | null>(null);

  const [templates, internalSetTemplates] = useState<TemplateDefinition[] | null>(null);
  const [languages, internalSetLanguages] = useState<SupportedLanguage[] | null>(null);
  const [alphabets, internalSetAlphabets] =
    useState<Record<string, SupportedLanguageAlphabet> | null>(null);
  const [bootstrapReady, internalSetBootstrapReady] = useState<boolean>(false);

  const [activeJob, internalSetActiveJob] = useState<FontJob | null>(null);

  // globales Default-Format für Glyphen (PNG/SVG), mit Persistenz
  const [activeGlyphFormat, internalsetActiveGlyphFormat] =
    useState<GlyphFormat>(DEFAULT_GLYPH_FORMAT);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawInfo = localStorage.getItem('info');
    if (rawInfo) {
      try {
        internalSetInfo(JSON.parse(rawInfo));
      } catch {
        localStorage.removeItem('info');
      }
    }

    const rawMe = localStorage.getItem('me');
    if (rawMe) {
      try {
        internalSetMe(JSON.parse(rawMe));
      } catch {
        localStorage.removeItem('me');
      }
    }

    const rawTemplates = localStorage.getItem('beefont_templates');
    if (rawTemplates) {
      try {
        internalSetTemplates(JSON.parse(rawTemplates));
      } catch {
        localStorage.removeItem('beefont_templates');
      }
    }

    const rawLanguages = localStorage.getItem('beefont_languages');
    if (rawLanguages) {
      try {
        internalSetLanguages(JSON.parse(rawLanguages));
      } catch {
        localStorage.removeItem('beefont_languages');
      }
    }

    const rawAlphabets = localStorage.getItem('beefont_alphabets');
    if (rawAlphabets) {
      try {
        internalSetAlphabets(JSON.parse(rawAlphabets));
      } catch {
        localStorage.removeItem('beefont_alphabets');
      }
    }

    const rawBootstrapReady = localStorage.getItem('beefont_bootstrap_ready');
    if (rawBootstrapReady === 'true') {
      internalSetBootstrapReady(true);
    }

    const rawActiveJob = localStorage.getItem('beefont_active_job');
    if (rawActiveJob) {
      try {
        internalSetActiveJob(JSON.parse(rawActiveJob));
      } catch {
        localStorage.removeItem('beefont_active_job');
      }
    }

    // Default-Glyphformat aus localStorage laden oder auf globalen Default zurückfallen
    const rawFormat = localStorage.getItem('beefont_default_format');
    if (rawFormat === 'png' || rawFormat === 'svg') {
      internalsetActiveGlyphFormat(rawFormat as GlyphFormat);
    } else {
      internalsetActiveGlyphFormat(DEFAULT_GLYPH_FORMAT);
    }

  }, []);

  const setInfo = useCallback((next: InfoResponse | null) => {
    internalSetInfo(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('info');
      else localStorage.setItem('info', JSON.stringify(next));
    }
  }, []);

  const setMe = useCallback((next: InfoMe | null) => {
    internalSetMe(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('me');
      else localStorage.setItem('me', JSON.stringify(next));
    }
  }, []);

  const setTemplates = useCallback((next: TemplateDefinition[] | null) => {
    internalSetTemplates(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('beefont_templates');
      else localStorage.setItem('beefont_templates', JSON.stringify(next));
    }
  }, []);

  const setLanguages = useCallback((next: SupportedLanguage[] | null) => {
    internalSetLanguages(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('beefont_languages');
      else localStorage.setItem('beefont_languages', JSON.stringify(next));
    }
  }, []);

  const setAlphabets = useCallback((
    next: Record<string, SupportedLanguageAlphabet> | null,
  ) => {
    internalSetAlphabets(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('beefont_alphabets');
      else localStorage.setItem('beefont_alphabets', JSON.stringify(next));
    }
  }, []);

  const setBootstrapReady = useCallback((ready: boolean) => {
    internalSetBootstrapReady(ready);
    if (typeof window !== 'undefined') {
      if (!ready) localStorage.removeItem('beefont_bootstrap_ready');
      else localStorage.setItem('beefont_bootstrap_ready', 'true');
    }
  }, []);

  const setActiveJob = useCallback((job: FontJob | null) => {
    internalSetActiveJob(job);
    if (typeof window !== 'undefined') {
      if (job === null) localStorage.removeItem('beefont_active_job');
      else localStorage.setItem('beefont_active_job', JSON.stringify(job));
    }
  }, []);

  const setActiveGlyphFormat = useCallback((format: GlyphFormat) => {
    internalsetActiveGlyphFormat(format);
    if (typeof window !== 'undefined') {
      localStorage.setItem('beefont_default_format', format);
    }
  }, []);

  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;

    ['info', 'me'].forEach(k => localStorage.removeItem(k));

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('beefont_')) localStorage.removeItem(k);
    });

    internalSetInfo(null);
    internalSetMe(null);
    internalSetTemplates(null);
    internalSetLanguages(null);
    internalSetAlphabets(null);
    internalSetBootstrapReady(false);
    internalSetActiveJob(null);
    internalsetActiveGlyphFormat(DEFAULT_GLYPH_FORMAT);

  }, []);

  const value = useMemo(
    () => ({
      info,
      setInfo,
      me,
      setMe,
      reset,
      templates,
      setTemplates,
      languages,
      setLanguages,
      alphabets,
      setAlphabets,
      bootstrapReady,
      setBootstrapReady,
      activeJob,
      setActiveJob,
      activeGlyphFormat,
      setActiveGlyphFormat,
    }),
    [
      info,
      setInfo,
      me,
      setMe,
      reset,
      templates,
      setTemplates,
      languages,
      setLanguages,
      alphabets,
      setAlphabets,
      bootstrapReady,
      setBootstrapReady,
      activeJob,
      setActiveJob,
      activeGlyphFormat,
      setActiveGlyphFormat,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
