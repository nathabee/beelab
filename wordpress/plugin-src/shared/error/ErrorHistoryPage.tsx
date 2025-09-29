// shared/error/ErrorHistoryPage.tsx
'use client';

import React from 'react';
import { useErrorHistory, clearAllErrors, removeError, StoredAppError } from './errorHistory';
import { friendlyMessage } from './errorCopy';

export type ErrorHistoryPageProps = {
  /** Optional plugin/app name to filter (e.g., 'pomolobee') */
  plugin?: string;
  /** Limit rows shown (e.g., 200). Default: all. */
  limit?: number;
};

function formatWhen(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ErrorHistoryPage({ plugin, limit }: ErrorHistoryPageProps) {
  const items = useErrorHistory({ plugin, limit });

  return (
    <section className="bee-error-history">
      <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
        <strong>Error history{plugin ? ` (${plugin})` : ''}</strong>
        <button className="btn btn-sm btn-outline-danger" onClick={() => clearAllErrors()}>
          Clear all
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-muted">No errors recorded yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>When</th>
                <th>Message</th>
                <th>Code</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Service</th>
                <th style={{ whiteSpace: 'nowrap' }}>Function</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((e: StoredAppError) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(e.ts)}</td>
                  <td title={e.message}>{friendlyMessage?.(e) ?? e.message}</td>
                  <td>{e.code || ''}</td>
                  <td>{e.severity || ''}</td>
                  <td>{e.category || ''}</td>
                  <td>{e.service || ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.functionName || ''}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => removeError(e.id)}>
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
