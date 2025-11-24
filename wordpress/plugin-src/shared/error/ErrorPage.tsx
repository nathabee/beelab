// shared/error/ErrorPage.tsx
'use client';
import React, { useMemo } from 'react';
import { useErrors } from './ErrorContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { friendlyMessage } from './errorCopy';

const ErrorPage: React.FC = () => {
  const { stack, clear } = useErrors();
  const { state } = useLocation() as { state?: { errorId?: string } };
  const nav = useNavigate();

  const err = useMemo(() => {
    if (state?.errorId) return stack.find(e => e.id === state.errorId) ?? stack.at(-1);
    return stack.at(-1);
  }, [stack, state]);

  if (!err) return <div className="container py-4"><h2>All good 🎉</h2></div>;

  return (
    <div className="container py-4">
      <h2>⚠️ An error occurred</h2>
      <p className="text-muted">{friendlyMessage(err)}</p>

      <div className="card my-3">
        <div className="card-body">
          <div><strong>Message:</strong> {err.message}</div>
          {err.code && <div><strong>Code:</strong> {err.code}</div>}
          {typeof err.httpStatus !== 'undefined' && <div><strong>Status:</strong> {err.httpStatus}</div>}
          {err.request?.method && <div><strong>Request:</strong> {err.request.method} {err.request.url}</div>}
          {err.component && <div><strong>Component:</strong> {err.component}</div>}
          {err.functionName && <div><strong>Function:</strong> {err.functionName}</div>}
          {err.route && <div><strong>Route:</strong> {err.route}</div>}
          {err.service && <div><strong>Service:</strong> {err.service}</div>}
          <div className="small text-muted mt-2">Error ID: {err.id}</div>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={() => nav('/dashboard')}>Back to dashboard</button>
        <button className="btn btn-outline-secondary" onClick={() => { clear(); nav(-1); }}>Go back</button>
        {(err.httpStatus === 401 || err.httpStatus === 403) && (
          <button className="btn btn-outline-danger" onClick={() => nav('/login')}>Sign in</button>
        )}
      </div>

      {err.user && (
        <section className="mt-3">
          <h3>User</h3>
          <ul>
            <li>Status: {err.user.isLoggedIn ? 'Logged in' : 'Guest'}</li>
            {err.user.id !== undefined && <li>ID: {String(err.user.id)}</li>}
            {err.user.username && <li>Username: {err.user.username}</li>}
            {err.user.email && <li>Email: {err.user.email}</li>}
            {err.user.roles?.length ? <li>Roles: {err.user.roles.join(', ')}</li> : null}
          </ul>
        </section>
      )}

    </div>
  );
};

export default ErrorPage;
