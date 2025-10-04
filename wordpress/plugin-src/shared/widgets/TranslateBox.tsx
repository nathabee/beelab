// shared/widgets/TranslateBox.tsx
import React, { useEffect } from 'react';

type TranslateBoxProps = {
  /** Unique DOM id for this instance */
  containerId?: string;
  /** Comma-separated language codes */
  languages?: string; // e.g. "fr,en"
  /** Base page language */
  pageLanguage?: string; // e.g. "en"
  /** Optional wrapper class */
  className?: string;
  /** Optional inline style */
  style?: React.CSSProperties;
  /** Optional label text before widget */
  label?: React.ReactNode;
};

/**
 * Global singleton to ensure the Google script is loaded once,
 * and multiple instances can register and initialize safely.
 */
declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
    __bee_gt_state__?: {
      loaded: boolean;
      loading: boolean;
      pending: Array<{ containerId: string; config: any }>;
    };
  }
}

function ensureState() {
  if (!window.__bee_gt_state__) {
    window.__bee_gt_state__ = { loaded: false, loading: false, pending: [] };
  }
  return window.__bee_gt_state__;
}

function loadScriptOnce() {
  const state = ensureState();
  if (state.loaded || state.loading) return;

  state.loading = true;

  const id = 'google-translate-script';
  if (!document.getElementById(id)) {
    const s = document.createElement('script');
    s.id = id;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  }

  // The callback is invoked by Google when the script is ready
  window.googleTranslateElementInit = () => {
    state.loaded = true;
    state.loading = false;

    // Drain any pending registrations
    for (const item of state.pending) {
      tryInit(item.containerId, item.config);
    }
    state.pending = [];
  };
}

function tryInit(containerId: string, config: any) {
  const el = document.getElementById(containerId);
  if (!el) return; // container not in DOM anymore

  const G = window.google?.translate?.TranslateElement;
  if (!G) {
    // not ready yet—queue for later
    ensureState().pending.push({ containerId, config });
    loadScriptOnce();
    return;
  }
  // Already ready: initialize immediately
  // Note: multiple calls target different container ids safely.
  // Google widget overwrites content inside the container.
  // eslint-disable-next-line new-cap
  new G(config, containerId);
}

/**
 * A small, reusable widget that renders a label and a container
 * for Google Translate, loading and initializing the script once.
 */
export const TranslateBox: React.FC<TranslateBoxProps> = ({
  containerId = 'bee_gt_' + Math.random().toString(36).slice(2, 8),
  languages = 'fr,en',
  pageLanguage = 'en',
  className = 'translate-box',
  style,
  label = <>🌐 Translate:&nbsp;</>,
}) => {
  useEffect(() => {
    const config = {
      pageLanguage,
      includedLanguages: languages,
      autoDisplay: false,
      default: languages.split(',')[0], // first as default
    };

    // If script is already ready, init now; otherwise it queues.
    if (window.__bee_gt_state__?.loaded && window.google?.translate?.TranslateElement) {
      tryInit(containerId, config);
    } else {
      ensureState().pending.push({ containerId, config });
      loadScriptOnce();
    }
    // no cleanup: Google widget can remain; removing script is unnecessary.
  }, [containerId, languages, pageLanguage]);

  return (
    <div className={className} style={style}>
      {label}<span id={containerId} />
    </div>
  );
};

export default TranslateBox;
