// src/pages/Dashboard.tsx
//
// Minimal landing page for the Nutshell template plugin.
// It shows the current user (if any) and runs a simple /hello/ call
// against the UserCore API using apiApp.

import React, { useEffect, useState } from 'react';
import { useUser } from '@bee/common';
import { apiApp } from '@utils/api';

const Dashboard: React.FC = () => {
  const { isLoggedIn, user } = useUser();
  const [helloResult, setHelloResult] = useState<string | null>(null);
  const [helloError, setHelloError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHello() {
      try {
        const res = await apiApp.get('/hello/');
        if (cancelled) return;

        let text: string;
        try {
          text = JSON.stringify(res.data, null, 2);
        } catch {
          text = String(res.data);
        }
        setHelloResult(text);
        setHelloError(null);
      } catch (err: any) {
        if (cancelled) return;
        setHelloError(err?.message || 'API error');
        setHelloResult(null);
      }
    }

    fetchHello();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bee-nutshell-home">
      <section className="mb-4">
        <h2 className="h4">Nutshell Dashboard</h2>
        <p>
          This Dashboard is a minimal example of a BeeLab WordPress plugin frontend.
          It uses the shared authentication layer and talks to the Django UserCore API.
        </p>
      </section>

      <section className="mb-4">
        <h3 className="h5">Current user</h3>
        {isLoggedIn ? (
          <pre className="bg-light p-2 small rounded border">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p>
            You are not logged in. Use the <code>/login</code> route to start a standard or demo session.
          </p>
        )}
      </section>

      <section className="mb-4">
        <h3 className="h5">Example API call: <code>/hello/</code></h3>
        <p>
          On mount, this page calls <code>apiApp.get('/hello/')</code>. The backend should expose
          a simple <code>hello</code> view under the same base URL as the user API.
        </p>

        {helloResult && (
          <div className="mt-2">
            <h4 className="h6">Response</h4>
            <pre className="bg-light p-2 small rounded border">
              {helloResult}
            </pre>
          </div>
        )}

        {helloError && (
          <div className="mt-2">
            <h4 className="h6 text-danger">API error</h4>
            <pre className="bg-light p-2 small rounded border text-danger">
              {helloError}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
