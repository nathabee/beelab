
// src/pages/CompetenceLogin.tsx
// for wordpress only
 


// src/pages/CompetenceLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginHandler } from '@hooks/useLogin';

const CompetenceLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { handleLogin,handleDemoStart, errorMessage } = useLoginHandler();

  const submit = async (e: React.FormEvent) => {
    console.log('[CompetenceLogin] submit login pressed');
    e.preventDefault();
    await handleLogin(username, password, () => navigate('/dashboard'));
  };


  const tryDemo = async () => {
    console.log('[CompetenceLogin] try demo pressed');
    await handleDemoStart(() => navigate('/dashboard'));
  };

  return (
    <div className="login-wrapper">
      <h2>🔐 Login</h2>
      {errorMessage && <div className="error">{errorMessage}</div>}
      <form onSubmit={submit}>
        <input type="text" placeholder="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} required /> 
        <input
                type="password"
                name="password"
                placeholder="Mot de passe"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />


        <button type="submit">Login</button>
      </form>
      <div className="or-sep" style={{ margin: '1rem 0', textAlign: 'center' }}>
        <span>— or —</span>
      </div>

      <button type="button" onClick={tryDemo}>
        🐝 Try the demo
      </button>
    </div>
  );
};


export default CompetenceLogin;
