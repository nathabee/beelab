// shared/user/components/LoginOrDemoCard.tsx
'use client';
import React, { useCallback, useMemo, useState } from 'react';

type LangCode = 'en' | 'fr' | 'de' | 'bz';

export type LoginOrDemoCardProps = {
  mode?: 'login' | 'demo';
  errorMessage?: string | null;

  // handlers supplied by the plugin/app
  onSubmitLogin: (username: string, password: string) => Promise<void> | void;
  onStartDemo: (opts: { preferredName?: string; roles?: string[]; lang?: LangCode }) => Promise<void> | void;

  // optional helpers
  detectLang?: () => LangCode;
  initialRolesForDemo?: string[]; // default: ['farmer']
  getRandomDisplayName?: () => { first: string; last: string };
};

export default function LoginOrDemoCard({
  mode = 'login',
  errorMessage,
  onSubmitLogin,
  onStartDemo,
  detectLang,
  initialRolesForDemo = ['farmer'],
  getRandomDisplayName,
}: LoginOrDemoCardProps) {
  // login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // demo state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const preferredName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(' ').trim() || undefined,
    [firstName, lastName]
  );

  const effectiveDetect = useCallback<() => LangCode>(() => {
    if (detectLang) return detectLang();
    const raw = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('de')) return 'de';
    if (raw.startsWith('bz')) return 'bz';
    return 'en';
  }, [detectLang]);

  const onSubmitDemoForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await onStartDemo({
      preferredName,
      roles: initialRolesForDemo,
      lang: effectiveDetect(),
    });
  };

  const onSubmitLoginForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitLogin(username, password);
  };

  const fillRandomName = useCallback(() => {
    if (!getRandomDisplayName) return;
    const { first, last } = getRandomDisplayName();
    setFirstName(first);
    setLastName(last);
  }, [getRandomDisplayName]);

  const clearNames = useCallback(() => {
    setFirstName('');
    setLastName('');
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h3 className="card-title mb-3">{mode === 'demo' ? '🐝 Try the demo' : '🔐 Login'}</h3>
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

        {mode === 'demo' ? (
          <form onSubmit={onSubmitDemoForm} className="d-grid gap-3">
            <div className="row g-2">
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="First name (optional)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Last name (optional)"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="d-flex gap-2">
              {getRandomDisplayName && (
                <button type="button" className="btn btn-outline-secondary" onClick={fillRandomName}>
                  🎲 Random name
                </button>
              )}
              <button type="button" className="btn btn-outline-secondary" onClick={clearNames}>
                Clear
              </button>
              <div className="ms-auto" />
              <button type="submit" className="btn btn-warning">Start demo</button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmitLoginForm} className="d-grid gap-3">
            <input
              type="text"
              className="form-control"
              placeholder="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="form-control"
              placeholder="Mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="d-flex">
              <button type="submit" className="btn btn-primary ms-auto">Login</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
