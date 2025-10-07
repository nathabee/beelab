// shared/user/components/UserProfileForm.tsx
'use client';
import React from 'react';
import { LANGUAGE_LABELS, type LangCode } from '../lang';

export type UserProfileFormProps = {
  username: string;
  firstName: string;
  lastName: string;
  lang: LangCode;

  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setLang: (v: LangCode) => void;

  loading?: boolean;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  dirty?: boolean;

  onSave: () => void;
  onReset: () => void;
};

export default function UserProfileForm({
  username, firstName, lastName, lang,
  setFirstName, setLastName, setLang,
  loading, saving, saved, error, dirty,
  onSave, onReset,
}: UserProfileFormProps) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h3 className="card-title mb-3">👤 User settings</h3>

        {error && <div className="alert alert-danger">{error}</div>}
        {saved && <div className="alert alert-success">Saved!</div>}

        {loading ? (
          <div className="placeholder-glow">
            <span className="placeholder col-12 mb-2" />
            <span className="placeholder col-7 mb-2" />
            <span className="placeholder col-5 mb-2" />
            <span className="placeholder col-6 mb-2" />
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); onSave(); }}
            className="d-grid gap-3"
          >
            {/* Username (read-only) */}
            <div>
              <label className="form-label">Username</label>
              <input className="form-control" value={username} readOnly disabled />
              <div className="form-text">This cannot be changed.</div>
            </div>

            {/* First / Last name */}
            <div className="row g-2">
              <div className="col">
                <label className="form-label">First name</label>
                <input
                  type="text"
                  className="form-control"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="col">
                <label className="form-label">Last name</label>
                <input
                  type="text"
                  className="form-control"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="form-label">Language</label>
              <select
                className="form-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LangCode)}
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label} ({code})</option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={onReset} disabled={!!saving}>
                Reset
              </button>
              <div className="ms-auto" />
              <button type="submit" className="btn btn-primary" disabled={!dirty || !!saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
