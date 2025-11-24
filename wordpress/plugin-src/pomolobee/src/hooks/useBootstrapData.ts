// src/hooks/useBootstrapData.ts
'use client';


import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';

import { apiApp, authHeaders } from '@utils/api';
import type { FarmWithFields } from '@mytypes/farm';
import type { Field, FieldLocation } from '@mytypes/field';
import type { Fruit } from '@mytypes/fruit';
import type { Row } from '@mytypes/row';

type BootstrapOpts = { force?: boolean };

function getLocationsArray(payload: any): FieldLocation[] {
  // current server shape: { status, data: { locations: [...] } }
  if (Array.isArray(payload?.data?.locations)) return payload.data.locations;
  if (Array.isArray(payload?.locations)) return payload.locations;
  if (Array.isArray(payload)) return payload as FieldLocation[];
  return [];
}

export default function useBootstrapData() {
  const {
    token 
  } = useUser();
  const {
    farms, setFarms,
    fields, setFields,
    fruits, setFruits,
    rows, setRows,
    setActiveFarm,
  } = useApp();

  const headersFor = (t?: string) => authHeaders(t ?? token);

  const fetchBootstrapData = async (tokenParam?: string, opts: BootstrapOpts = {}) => {
    const t = tokenParam ?? token;
    if (!t) { console.warn('[bootstrap] no token, bail'); return; }

    const needFarms  = opts.force || farms.length  === 0;
    const needFruits = opts.force || fruits.length === 0;
    const needRows   = opts.force || rows.length   === 0; // rows drives locations fetch

    const headers = headersFor(t);

    // Only three requests: farms, fruits, locations (fields come from locations)
    const farmsReq = needFarms  ? apiApp.get<FarmWithFields[]>('/farms/',    { headers }) : Promise.resolve({ data: farms });
    const fruitsReq= needFruits ? apiApp.get<Fruit[]>('/fruits/',            { headers }) : Promise.resolve({ data: fruits });
    const locsReq  = needRows   ? apiApp.get<any>('/locations/',             { headers }) : Promise.resolve({ data: null });

    const [farmsRes, fruitsRes, locsRes] = await Promise.all([farmsReq, fruitsReq, locsReq]);

    const farmsData  = farmsRes.data  ?? farms;
    const fruitsData = fruitsRes.data ?? fruits;

    let fieldsData: Field[] = fields;
    let flatRows: Row[] = rows;

    if (needRows && locsRes?.data) {
      const locs = getLocationsArray(locsRes.data);
      // dedupe fields by field_id, prefer last (or first – doesn’t matter if consistent)
      const map = new Map<number, Field>();
      const accRows: Row[] = [];
      for (const loc of locs) {
        const f = loc.field;
        map.set(f.field_id, f);
        for (const r of loc.rows) {
          accRows.push({ ...r, field_id: f.field_id });
        }
      }
      fieldsData = Array.from(map.values());
      flatRows = accRows;
      console.log('[bootstrap] fields from locations:', fieldsData.length, 'rows:', flatRows.length);
    }

    setFarms(farmsData);
    setFruits(fruitsData);
    setFields(fieldsData);
    setRows(flatRows);

    if (farmsData.length === 1) setActiveFarm(farmsData[0]);
  };

  // Targeted refreshes if you still need them
  const fetchFieldById = async (fieldId: number, tokenParam?: string) => {
    const res = await apiApp.get<Field>(`/fields/${fieldId}/`, { headers: headersFor(tokenParam) });
    const updated = res.data;
    const next = [...fields];
    const idx = next.findIndex(f => f.field_id === updated.field_id);
    if (idx >= 0) next[idx] = updated; else next.push(updated);
    setFields(next);
    return updated;
  };

  const fetchLocationsOnly = async (tokenParam?: string) => {
    const res = await apiApp.get<any>('/locations/', { headers: headersFor(tokenParam) });
    const locs = getLocationsArray(res.data);
    const map = new Map<number, Field>();
    const accRows: Row[] = [];
    for (const loc of locs) {
      const f = loc.field;
      map.set(f.field_id, f);
      for (const r of loc.rows) accRows.push({ ...r, field_id: f.field_id });
    }
    setFields(Array.from(map.values()));
    setRows(accRows);
    return accRows;
  };

  return { fetchBootstrapData, fetchFieldById, fetchLocationsOnly };
}
