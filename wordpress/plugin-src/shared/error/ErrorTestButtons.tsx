// shared/error/ErrorTestButtons.tsx
'use client';

import React from 'react';
import type { AxiosInstance } from 'axios'; 
import { errorBus } from './errorBus';  
import { toAppError } from './toAppError';  

type Client = Pick<AxiosInstance, 'get'>;

export type ErrorTestButtonsProps = {
  apiApp: Client;
  apiUser: Client;
  /** override endpoints if your test routes differ */
  paths?: {
    missing?: string; // default: '/definitely_missing_endpoint'
    slow?: string;    // default: '/slow'
  };
  plugin?: string;   
};

export default function ErrorTestButtons({ apiApp, apiUser, plugin, paths }: ErrorTestButtonsProps) {
  const missingPath = paths?.missing ?? '/definitely_missing_endpoint';
  const slowPath = paths?.slow ?? '/slow';

  async function do404() {
    try {
      await apiApp.get(missingPath);
    } catch (e) {
      console.warn('404 test caught', e);
    }
  }

  async function doTimeout() {
    try {
      await apiUser.get(slowPath, { timeout: 1 }); // intentionally too small
    } catch (e) {
      console.warn('timeout test caught', e);
    }
  }

  function emitManual() {
    const err = toAppError(new Error('Manual test error'), {
      code: 'MANUAL_TEST',
      severity: 'toast',
      category: 'unknown',
      service: 'ui',
      functionName: 'emitManual',
      meta: plugin ? { plugin } : undefined, 
    });
    errorBus.emit(err);
  }

  return (
    <div className="d-flex gap-2 my-3">
      <button className="btn btn-outline-secondary" onClick={do404}>Trigger 404</button>
      <button className="btn btn-outline-secondary" onClick={doTimeout}>Trigger timeout</button>
      <button className="btn btn-outline-secondary" onClick={emitManual}>Emit manual AppError</button>
    </div>
  );
}
