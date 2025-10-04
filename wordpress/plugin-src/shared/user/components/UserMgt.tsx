// shared/user/components/UserMgt.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import { useUser } from '../UserContext';
import { createAxiosClient } from '../http';

const api = createAxiosClient({
  baseUrl:
    typeof window !== 'undefined'
      ? (window as any)?.pomolobeeSettings?.apiBase ?? null
      : null,
  basePath: '/user',
  service: 'user',
});

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'br', label: 'Brezhoneg' },
];

export type UserMgtProps = {
  /**
   * Optional override to persist changes. If omitted, calls PUT /user/me on the shared axios client.
   * Must return the updated user.
   */
  onSave?: (partial: Pick<User, 'first_name' | 'last_name' | 'lang'>) => Promise<User>;
  className?: string;
  compact?: boolean;
};

export default function UserMgt({ onSave, className, compact }: UserMgtProps) {
  const { user, login } = useUser();
  const [first, setFirst] = useState(user?.first_name ?? '');
  const [last, setLast] = useState(user?.last_name ?? '');
  const [lang, setLang] = useState(user?.lang ?? 'en');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<null | 'ok' | 'err'>(null);

  useEffect(() => {
    if (!user) return;
    setFirst(user.first_name);
    setLast(user.last_name);
    setLang(user.lang);
  }, [user?.id]); // re-hydrate when context user changes

  const canSave = useMemo(() => !!first.trim() && !!last.trim() && !!lang, [first, last, lang]);

  if (!user) return null;

  const doSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setSaved(null);
    try {
      const payload = { first_name: first.trim(), last_name: last.trim(), lang };
      const updated = onSave
        ? await onSave(payload)
        : ((await api.put('/me', payload)).data as User);

      // Refresh UserContext with updated user (keep existing token)
      const token = localStorage.getItem('authToken') || '';
      login(token, updated);
      setSaved('ok');
    } catch {
      setSaved('err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={doSave} className={className}>
      <div className={`card shadow-sm ${compact ? 'p-2' : ''}`}>
        <div className="card-body">
          <h5 className="card-title mb-3">Profile</h5>

          <div className="row g-2 mb-3">
            <div className="col-sm-6">
              <label className="form-label">First name</label>
              <input
                className="form-control"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Last name</label>
              <input
                className="form-control"
                value={last}
                onChange={(e) => setLast(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Language</label>
            <select className="form-select" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button type="submit" className="btn btn-primary" disabled={!canSave || busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            {saved === 'ok' && <span className="text-success">Saved ✓</span>}
            {saved === 'err' && <span className="text-danger">Could not save</span>}

            <div className="ms-auto small text-muted">
              {user.is_demo ? `Demo expires: ${user.demo_expires_at ?? '—'}` : null}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
