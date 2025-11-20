'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@context/AppContext';
import useBootstrapData from '@hooks/useBootstrapData';

const DashboardCard: React.FC = () => {
  const { info } = useApp();
  const { fetchBootstrapData } = useBootstrapData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // /info/ beim ersten Render laden (oder wenn leer)
  useEffect(() => {
    if (info) return; // schon da → nichts tun

    setLoading(true);
    setError(null);

    fetchBootstrapData()
      .catch(err => {
        console.error('[DashboardCard] fetchBootstrapData failed', err);
        setError('Fehler beim Laden der Systeminformationen.');
      })
      .finally(() => setLoading(false));
  }, [info, fetchBootstrapData]);

  return (
    <section className="nutshell-dashboard-card">
      <h2>Nutshell Dashboard</h2>
      <p>
        Dieses Dashboard ist ein minimales Beispiel für ein BeeLab-WordPress-Frontend.
        Es nutzt die gemeinsame Authentifizierungsschicht und spricht mit der
        Django-UserCore-API.
      </p>

      <h3>Systeminfo aus /info/</h3>

      {loading && !info && <p>Lade Systeminformationen …</p>}

      {error && <p className="error-text">{error}</p>}

      {info && (
        <>
          <p>
            Dienst: <strong>{info.service}</strong> ({info.environment})<br />
            Stand: {new Date(info.timestamp).toLocaleString('de-DE')}
          </p>

          <div className="dashboard-section">
            <h4>Registrierte Anwendungen</h4>
            {info.apps.length === 0 ? (
              <p>Keine Anwendungen registriert.</p>
            ) : (
              <ul>
                {info.apps.map(app => (
                  <li key={app.name}>
                    <strong>{app.label}</strong> – {app.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section">
            <h4>Verfügbare Rollen (öffentlich)</h4>
            {info.auth.roles.length === 0 ? (
              <p>Keine Rollen definiert.</p>
            ) : (
              <ul>
                {info.auth.roles.map(role => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section">
            <h4>Benutzerstatistik</h4>
            <p>
              Gesamt: <strong>{info.users.total}</strong>, aktive Demo-Konten:{' '}
              <strong>{info.users.demo_active}</strong>
            </p>

            {info.users.by_language.length > 0 && (
              <ul>
                {info.users.by_language.map(entry => (
                  <li key={entry.lang}>
                    {entry.lang}: {entry.count}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details>
            <summary>Rohdaten (JSON) anzeigen</summary>
            <pre>{JSON.stringify(info, null, 2)}</pre>
          </details>
        </>
      )}

      {!loading && !error && !info && (
        <p>Keine Systeminformationen verfügbar.</p>
      )}
    </section>
  );
};

export default DashboardCard;
