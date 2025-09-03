// src/components/FieldCard.tsx
'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@context/AuthContext';
import type { FieldBasic, Field } from '@mytypes/field';
import RowDisplay from '@components/RowDisplay';

function isFullField(f: FieldBasic | Field): f is Field {
  return (f as Field).orientation !== undefined;
}

type Props = { field: FieldBasic | Field | null | undefined; };

const FieldCard: React.FC<Props> = ({ field }) => {
  const { fieldsById, rowsByFieldId } = useAuth();

  const resolved: Field | null = useMemo(() => {
    if (!field) return null;
    if (isFullField(field)) return field;
    const full = fieldsById[field.field_id];
    return full ?? null;
  }, [field, fieldsById]);

  if (!field) {
    return (
      <div className="card p-3">
        <h3 className="mb-2">Field</h3>
        <div className="text-muted">No field selected.</div>
      </div>
    );
  }

  const fid = (resolved?.field_id ?? field.field_id);
  const rows = rowsByFieldId[fid] ?? [];
  const rowCount = rows.length || '—';
  console.debug('[FieldCard] fid=', fid,
    'rows keys=', Object.keys(rowsByFieldId),
    'rows len for fid=', rows.length);

  const title = field.name ?? `Field #${field.field_id}`;
  const shortName = field.short_name;
  const description = field.description;
  const orientation = resolved?.orientation ?? '—';
  const bgUrl = resolved?.background_image_url || null;
  const svgUrl = resolved?.svg_map_url || null;

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h3 className="mb-0">{title}</h3>
        <span className="badge text-bg-secondary">{shortName}</span>
      </div>

      <div className="mb-2 text-muted">{description || '—'}</div>

      <div className="row g-3 align-items-stretch">
        {/* LEFT: Info */}
        <div className="col-12 col-lg-4">
          <div className="h-100 d-flex flex-column">
            <ul className="list-unstyled mb-3">
              <li className="mb-1"><strong>Orientation:</strong> {orientation || '—'}</li>
              <li className="mb-1"><strong>Rows:</strong> {rowCount}</li>
              <li className="mb-1">
                <strong>SVG map:</strong>{' '}
                {svgUrl ? <a href={svgUrl as string} target="_blank" rel="noreferrer noopener">Open SVG</a> : '—'}
              </li>
              <li className="mb-1">
                <strong>Background:</strong>{' '}
                {bgUrl ? <a href={bgUrl as string} target="_blank" rel="noreferrer noopener">Open image</a> : '—'}
              </li>
              <li className="mb-1">
                <strong>Production estimation:</strong> —
                <small className="text-muted"> (depends on rows/estimates)</small>
              </li>
            </ul>

            <div className="mt-auto small text-muted">
              Tip: use the links above to open full-size for zoom.
            </div>
          </div>
        </div>

        {/* MIDDLE: Inline SVG preview */}
        <div className="col-12 col-lg-4">
          <div className="border rounded overflow-hidden h-100 d-flex align-items-center justify-content-center"
            style={{ minHeight: 220, background: '#f8f9fa' }}
            aria-label="SVG preview">
            {svgUrl ? (
              <object data={svgUrl as string} type="image/svg+xml" className="w-100" style={{ aspectRatio: '4 / 3' }} aria-label="Field SVG map">
                <img src={svgUrl as string} alt="Field SVG map" className="img-fluid" style={{ maxHeight: 360, objectFit: 'contain' }} />
              </object>
            ) : <span className="text-muted">No SVG map</span>}
          </div>
        </div>

        {/* RIGHT: Background image preview */}
        <div className="col-12 col-lg-4">
          <div className="border rounded overflow-hidden h-100 d-flex align-items-center justify-content-center"
            style={{ minHeight: 220, background: '#f8f9fa' }}
            aria-label="Field background">
            {bgUrl ? (
              <img src={bgUrl as string} alt="Field background"
                className="img-fluid" style={{ maxHeight: 360, width: '100%', objectFit: 'cover' }} />
            ) : <span className="text-muted">No background image</span>}
          </div>
        </div>
      </div>

      {/* Rows list */}
      <div className="mt-3">
        <h5 className="mb-2">Rows</h5>
        {rows.length === 0 ? (
          <div className="text-muted">No rows found for this field.</div>
        ) : (
          <div>
            {rows.length === 0 ? (
              <div className="text-muted">
                No rows found for this field.
                <div className="small text-muted">
                  Debug: fid={fid}, have fieldIds=[{Object.keys(rowsByFieldId).join(', ')}]
                </div>
              </div>
            ) : rows.map(r => <RowDisplay key={r.row_id} row={r} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldCard;
