// src/pages/CompetenceLogin.tsx
import React, { useMemo, useState,useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLoginHandler } from '@hooks/useLogin'; 
import { getRandomDisplayName } from '@utils/nameGen';


const CompetenceLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get('mode') === 'demo' ? 'demo' : 'login';

  const { handleLogin, handleDemoStart, errorMessage } = useLoginHandler();

  // login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // demo form state (optional name fields)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const preferredName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(' ').trim() || undefined,
    [firstName, lastName]
  );

  // helper: pick one of your supported codes
  const detectLang = (): 'en' | 'fr' | 'de' | 'br' => {
    const raw = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('de')) return 'de';
    if (raw.startsWith('br')) return 'br';
    return 'en';
  };

  const langForDemo = useMemo(detectLang, []);

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleDemoStart(() => navigate('/dashboard'), {
      roles: ['teacher'],
      preferredName,
      lang: langForDemo,
    });
  };


  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(username, password, () => navigate('/dashboard'));
  };




const fillRandomName = useCallback(() => {
  const { first, last } = getRandomDisplayName();
  setFirstName(first);
  setLastName(last);
}, []);

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          {modeFromUrl === 'demo' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h3 className="card-title mb-3">🐝 Try the demo</h3>
                {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                <form onSubmit={submitDemo} className="d-grid gap-3">
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
                    <button type="button" className="btn btn-outline-secondary" onClick={fillRandomName}>
                      🎲 Random name
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setFirstName(''); setLastName(''); }}>
                      Clear
                    </button>
                    <div className="ms-auto" />
                    <button type="submit" className="btn btn-warning">
                      Start demo
                    </button>
                  </div>
                </form>

                <hr className="my-4" />
                <div className="text-center">
                  Prefer to sign in?{' '}
                  <Link to="/login" className="link-primary">
                    Go to login
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="card-body">
                <h3 className="card-title mb-3">🔐 Login</h3>
                {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                <form onSubmit={submitLogin} className="d-grid gap-3">
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
                    <button type="submit" className="btn btn-primary ms-auto">
                      Login
                    </button>
                  </div>
                </form>

                <hr className="my-4" />
                <div className="text-center">
                  Just exploring?{' '}
                  <Link to="/login?mode=demo" className="link-warning">
                    Try the demo
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetenceLogin;
