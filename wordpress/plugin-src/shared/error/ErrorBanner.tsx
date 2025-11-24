// shared/error/ErrorBanner.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
import { useErrors } from './ErrorContext';
import { friendlyMessage } from './errorCopy';

const ErrorBanner: React.FC = () => {
  const { last, stack, dismissLast } = useErrors();

  const display = useMemo(() => {
    if (!last || last.severity === 'page' || last.severity === 'silent') return null;
    const recent = stack.slice(-3);
    const dupes = recent.every(e => e.message === last.message && e.httpStatus === last.httpStatus);
    return dupes ? null : last;
  }, [last, stack]);

  // Auto-hide after 6–8s for toast errors
  useEffect(() => {
    if (!display || display.severity !== 'toast') return;
    const t = setTimeout(() => dismissLast(), display.retryable ? 8000 : 6000);
    return () => clearTimeout(t);
  }, [display, dismissLast]);

  if (!display) return null;

  return (
    <div className="alert alert-warning m-2 py-2 d-flex align-items-start" role="status" aria-live="polite">
      {/* message */}
      <div>
        {display.httpStatus ? <strong>{display.httpStatus}</strong> : null} {friendlyMessage(display)}
        {display.user && (
          <div className="small text-muted mt-1">
            {display.user.isLoggedIn ? 'Logged in' : 'Guest'}
            {display.user.username ? ` • ${display.user.username}` : ''}
            {Array.isArray(display.user.roles) && display.user.roles.length ? ` • ${display.user.roles.join(', ')}` : ''}
          </div>
        )}
        {display.retryable && (
          <button className="btn btn-sm btn-outline-dark ms-2" onClick={() => location.reload()}>
            Retry
          </button>
        )}
      </div>

      {/* dismiss on the right */}
      <button
        className="btn btn-sm btn-link ms-auto text-dark text-decoration-none"
        aria-label="Dismiss"
        onClick={dismissLast}
        style={{ lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
};

export default ErrorBanner;
