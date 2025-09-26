// src/components/ErrorTestButtons.tsx
'use client';
import React from 'react';
import { apiPom, apiUser } from '@utils/api';
import { errorBus, toAppError } from '@bee/common/error';

export default function ErrorTestButtons() {
  async function do404() {
    try { await apiPom.get('/definitely_missing_endpoint'); }
    catch (e) { console.warn('404 test caught', e); }
  }
  async function doTimeout() {
    try {
      await apiUser.get('/slow', { timeout: 1 }); // server won’t respond this fast
    } catch (e) { console.warn('timeout test caught', e); }
  }
  function emitManual() {
    const err = toAppError(new Error('Manual test error'), {
      code: 'MANUAL_TEST',
      severity: 'toast',
      category: 'unknown',
      service: 'ui',
      functionName: 'emitManual',
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
