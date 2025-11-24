'use client';

// src/components/PagesTable.tsx

import React from 'react';
import type { JobPage } from '@mytypes/jobPage';

export type PagesTableProps = {
  pages: JobPage[];

  onOpenDebug?: (pageId: number) => void;
  onRetryAnalysis?: (pageId: number) => void;
  onDelete?: (pageId: number) => void;
};

const PagesTable: React.FC<PagesTableProps> = ({
  pages,
  onOpenDebug,
  onRetryAnalysis,
  onDelete,
}) => {
  if (!pages || pages.length === 0) {
    return <p>No pages yet.</p>;
  }

  return (
    <table className="bf-table bf-table--pages">
      <thead>
        <tr>
          <th>#</th>
          <th>Letters</th>
          <th>Template</th>
          <th>Analysed</th>
          <th>Created at</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pages.map(page => (
          <tr key={page.id}>
            <td>{page.page_index ?? '-'}</td>
            <td>{page.letters}</td>
            <td>{page.template?.code ?? ''}</td>
            <td>{page.analysed_at ? 'yes' : 'no'}</td>
            <td>{page.created_at}</td>
            <td>
              {onOpenDebug && (
                <button
                  type="button"
                  onClick={() => onOpenDebug(page.id)}
                >
                  Open debug/glyphs
                </button>
              )}
              {onRetryAnalysis && (
                <button
                  type="button"
                  onClick={() => onRetryAnalysis(page.id)}
                >
                  Re-analyse
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="bf-button--danger bf-button--small"
                  onClick={() => onDelete(page.id)}
                >
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PagesTable;
