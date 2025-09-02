'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@context/AuthContext';
import type { FieldBasic, Field } from '@mytypes/field';

type Props = {
  field: FieldBasic | Field | null | undefined;
};

function isFullField(f: FieldBasic | Field): f is Field {
  return (f as Field).orientation !== undefined;
}

const FieldCard: React.FC<Props> = ({ field }) => {
  const { fieldsById } = useAuth();

  // Upgrade a basic field to a full Field using the context map (if possible)
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

  const title = field.name ?? `Field #${field.field_id}`;

  // Prefer values from the resolved full field, fallback to the basic one
  const shortName = field.short_name;
  const description = field.description;
  const orientation = resolved?.orientation ?? '—';
  const bgUrl = resolved?.background_image_url || null;
  const svgUrl = resolved?.svg_map_url || null;

  // If you sometimes have nested rows on the field, show the count; otherwise show "—"
  const rowCount =
    (resolved as any)?.rows?.length ??
    (field as any)?.rows?.length ??
    null;

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h3 className="mb-0">{title}</h3>
        <span className="badge text-bg-secondary">{shortName}</span>
      </div>

      <div className="mb-2 text-muted">{description || '—'}</div>

      <div className="row g-3 align-items-stretch">
        {/* Info */}
        <div className="col-12 col-md-6">
          <ul className="list-unstyled mb-0">
            <li className="mb-1">
              <strong>Orientation:</strong> {orientation || '—'}
            </li>
            <li className="mb-1">
              <strong>Rows:</strong> {rowCount ?? '—'}
            </li>
            <li className="mb-1">
              <strong>SVG map:</strong>{' '}
              {svgUrl ? (
                <a href={svgUrl} target="_blank" rel="noreferrer">
                  View
                </a>
              ) : (
                '—'
              )}
            </li>
            <li className="mb-1">
              <strong>Production estimation:</strong> —
              <small className="text-muted"> (depends on rows/estimates)</small>
            </li>
          </ul>
        </div>

        {/* Background image preview */}
        <div className="col-12 col-md-6">
          <div
            className="border rounded overflow-hidden"
            style={{
              minHeight: 180,
              background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Field background"
          >
            {!bgUrl && <span className="text-muted">No background image</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldCard;
