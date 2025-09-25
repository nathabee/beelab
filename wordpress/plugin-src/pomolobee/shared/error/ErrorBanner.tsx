// _shared/error/ErrorBanner.tsx
'use client';
import React, { useMemo } from 'react';
import { useErrors } from './ErrorContext';
import { friendlyMessage } from './errorCopy';

const ErrorBanner: React.FC = () => {
  const { last, stack } = useErrors();

  const display = useMemo(() => {
    if (!last || last.severity === 'page' || last.severity === 'silent') return null;
    const recent = stack.slice(-3);
    const dupes = recent.every(e => e.message === last.message && e.httpStatus === last.httpStatus);
    return dupes ? null : last;
  }, [last, stack]);

  if (!display) return null;

  return (
    <div className="alert alert-warning m-2 py-2">
      {display.httpStatus ? <strong>{display.httpStatus}</strong> : null} {friendlyMessage(display)}
      {display.retryable && (
        <button className="btn btn-sm btn-outline-dark ms-2" onClick={() => location.reload()}>
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
