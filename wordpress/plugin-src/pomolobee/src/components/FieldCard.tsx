'use client';

import React, { useMemo } from 'react';

 
import { useApp } from '@context/AppContext';

import type { FieldBasic, Field } from '@mytypes/field';
import RowDisplay from '@components/RowDisplay';

function isFullField(f: FieldBasic | Field): f is Field {
  return (f as Field).orientation !== undefined;
}

type Props = { field?: FieldBasic | Field | null };

const FieldCard: React.FC<Props> = ({ field }) => {
  const { fieldsById, rowsByFieldId, getFieldWithRows, activeField } = useApp();

  // prefer the prop, else fall back to activeField from context
  const inputField = field ?? activeField ?? null;

  // upgrade basic -> full if we can
  const resolved: Field | null = useMemo(() => {
    if (!inputField) return null;
    if (isFullField(inputField)) return inputField;
    return fieldsById[inputField.field_id] ?? null;
  }, [inputField, fieldsById]);

  // bail early if we still don't have a field
  if (!inputField) {
    return (
      <div className="card p-3">
        <h3 className="mb-2">Field</h3>
        <div className="text-muted">No field selected.</div>
      </div>
    );
  }

  const fid = resolved?.field_id ?? inputField.field_id ?? null;
  const fieldWithRows = fid ? getFieldWithRows(fid) : null;

  const rows = fieldWithRows?.rows ?? [];
  const rowCount = rows.length || '—';

  // debug
  console.debug(
    '[FieldCard] fid=',
    fid,
    'rows keys=',
    Object.keys(rowsByFieldId ?? {}),
    'rows len for fid=',
    rows.length
  );

  const title = inputField.name ?? `Field #${inputField.field_id}`;
  const shortName = inputField.short_name;
  const description = inputField.description;
  const orientation = resolved?.orientation ?? '—';
  const bgUrl = (resolved?.background_image_url as string | null) ?? null;
  const svgUrl = (resolved?.svg_map_url as string | null) ?? null;

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
                {svgUrl ? <a href={svgUrl} target="_blank" rel="noreferrer noopener">Open SVG</a> : '—'}
              </li>
              <li className="mb-1">
                <strong>Background:</strong>{' '}
                {bgUrl ? <a href={bgUrl} target="_blank" rel="noreferrer noopener">Open image</a> : '—'}
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
              <object data={svgUrl} type="image/svg+xml" className="w-100" style={{ aspectRatio: '4 / 3' }} aria-label="Field SVG map">
                <img src={svgUrl} alt="Field SVG map" className="img-fluid" style={{ maxHeight: 360, objectFit: 'contain' }} />
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
              <img src={bgUrl} alt="Field background"
                   className="img-fluid" style={{ maxHeight: 360, width: '100%', objectFit: 'cover' }} />
            ) : <span className="text-muted">No background image</span>}
          </div>
        </div>
      </div>

      {/* Rows list */}
      <div className="mt-3">
        <h5 className="mb-2">Rows</h5>
        {rows.length === 0 ? (
          <div className="text-muted">
            No rows found for this field.
            <div className="small text-muted">
              Debug: fid={fid ?? '—'}, have fieldIds=[{Object.keys(rowsByFieldId ?? {}).join(', ')}]
            </div>
          </div>
        ) : (
          <div>{rows.map(r => <RowDisplay key={r.row_id} row={r} />)}</div>
        )}
      </div>
    </div>
  );
};

export default FieldCard;
