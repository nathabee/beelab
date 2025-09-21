// _shared/error/ErrorBanner.tsx
'use client';
import React from 'react';
import { useErrors } from './ErrorContext';
import { friendlyMessage } from './errorCopy';

const ErrorBanner: React.FC = () => {
  const { last } = useErrors();
  if (!last || last.severity === 'page') return null;

  return (
    <div className="alert alert-warning m-2 py-2">
      {last.httpStatus ? <strong>{last.httpStatus}</strong> : null} {friendlyMessage(last)}
    </div>
  );
};

export default ErrorBanner;
