'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import useBootstrapData from '@hooks/useBootstrapData';

const ActiveContextCard: React.FC = () => {
  const { me } = useApp();
  const { token } = useUser();
  const { fetchMe } = useBootstrapData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load /me/ once when we have a token but no data yet
  useEffect(() => {
    if (!token || me) return;

    setLoading(true);
    setError(null);

    fetchMe()
      .catch(err => {
        console.error('[ActiveContextCard] fetchMe failed', err);
        setError('Fehler beim Laden der Benutzerinformationen.');
      })
      .finally(() => setLoading(false));
  }, [token, me, fetchMe]);

  const handleWhoAmI = async () => {
    if (!token) {
      setError('Kein Token vorhanden. Bitte zuerst anmelden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await fetchMe();
    } catch (err) {
      console.error('[ActiveContextCard] fetchMe failed', err);
      setError('Fehler beim Laden der Benutzerinformationen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="active-context-card">
      <h3>Aktiver Nutzerkontext</h3>

      {!token && (
        <p>Du bist nicht angemeldet. Melde dich an, um deine Benutzerinformationen zu sehen.</p>
      )}

      {token && (
        <button
          type="button"
          onClick={handleWhoAmI}
          disabled={loading}
          className="btn-whoami"
        >
          {loading ? 'Lade...' : 'Wer bin ich?'}
        </button>
      )}

      {error && <p className="error-text">{error}</p>}

      {me ? (
        <ul>
          <li>
            <strong>ID:</strong> {me.id}
          </li>
          <li>
            <strong>Benutzername:</strong> {me.username}
          </li>
          <li>
            <strong>E-Mail:</strong> {me.email || 'keine hinterlegt'}
          </li>
          <li>
            <strong>Sprache:</strong> {me.lang}
          </li>
          <li>
            <strong>Demo-Konto:</strong> {me.is_demo ? 'ja' : 'nein'}
          </li>
          <li>
            <strong>Rollen:</strong>{' '}
            {me.roles && me.roles.length > 0 ? me.roles.join(', ') : 'keine Rollen'}
          </li>
          <li>
            <strong>Demo gültig bis:</strong>{' '}
            {me.demo_expires_at
              ? new Date(me.demo_expires_at).toLocaleString('de-DE')
              : 'nicht gesetzt'}
          </li>
        </ul>
      ) : token && !loading && !error ? (
        <p>Noch keine Benutzerdaten geladen. Klicke auf „Wer bin ich?‟.</p>
      ) : null}
    </div>
  );
};

export default ActiveContextCard;
