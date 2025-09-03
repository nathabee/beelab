// src/hooks/useBootstrapData.ts
'use client';

import { useAuth } from '@context/AuthContext';
import { apiPom, authHeaders } from '@utils/api';
import { FarmWithFields } from '@mytypes/farm';
import { Field } from '@mytypes/field';
import { Fruit } from '@mytypes/fruit';

type BootstrapOpts = { force?: boolean };

export default function useBootstrapData() {
  const {
    token,
    farms, setFarms,
    fields, setFields,
    fruits, setFruits,
    setActiveFarm,
  } = useAuth();

// tokenParam is optional; if omitted we use the context token, but better not at the init, the asynchron update
// will call fetchBootstrapData before the login as logged the token in the authContext.tsx in AuthProvider
const fetchBootstrapData = async (tokenParam?: string, opts: BootstrapOpts = {}) => {
   const t = tokenParam ?? token;
   console.log('[bootstrap] start, token:', t, 'opts:', opts);
   if (!t) { console.warn('[bootstrap] no token, bail'); return; }

    const needFarms  = opts.force || farms.length  === 0;
    const needFields = opts.force || fields.length === 0;
    const needFruits = opts.force || fruits.length === 0;
    console.log('[bootstrap] needFarms/Fields/Fruits:', needFarms, needFields, needFruits);
    if (!needFarms && !needFields && !needFruits) { console.log('[bootstrap] nothing to do'); return; }
 
    const headers = authHeaders(t);
    console.log('[bootstrap] headers:', headers);

    try {
      const farmsReq  = needFarms  ? apiPom.get<FarmWithFields[]>('/farms/',  { headers }) : Promise.resolve({ data: farms });
      const fieldsReq = needFields ? apiPom.get<Field[]>('/fields/',          { headers }) : Promise.resolve({ data: fields });
      const fruitsReq = needFruits ? apiPom.get<Fruit[]>('/fruits/',          { headers }) : Promise.resolve({ data: fruits });

      console.log('[bootstrap] sending requests...');
      const [farmsRes, fieldsRes, fruitsRes] = await Promise.all([farmsReq, fieldsReq, fruitsReq]);

      console.log('[bootstrap] /farms status:', (farmsRes as any)?.status, 'data:', farmsRes.data);
      console.log('[bootstrap] /fields status:', (fieldsRes as any)?.status, 'data:', fieldsRes.data);
      console.log('[bootstrap] /fruits status:', (fruitsRes as any)?.status, 'data:', fruitsRes.data);

      const farmsData  = farmsRes.data  ?? farms;
      const fieldsData = fieldsRes.data ?? fields;
      const fruitsData = fruitsRes.data ?? fruits;

      setFarms(farmsData);
      setFields(fieldsData);
      setFruits(fruitsData);
      if (farmsData.length === 1) setActiveFarm(farmsData[0]);
      console.log('[bootstrap] state hydrated');
    } catch (err: any) {
      // log axios error details
      console.error('[bootstrap] FAILED', {
        message: err?.message,
        status: err?.response?.status,
        url: err?.config?.url,
        data: err?.response?.data
      });
    }
  };

  


  const headersFor = (t?: string) => authHeaders(t ?? token);

  const fetchFieldById = async (fieldId: number, tokenParam?: string) => {
    const res = await apiPom.get<Field>(`/fields/${fieldId}/`, { headers: headersFor(tokenParam) });
    const updated = res.data;
    const next = [...fields];
    const idx = next.findIndex(f => f.field_id === updated.field_id);
    if (idx >= 0) next[idx] = updated; else next.push(updated);
    setFields(next);
    return updated;
  };

  const fetchFarmsOnly = async (tokenParam?: string) => {
    const res = await apiPom.get<FarmWithFields[]>('/farms/', { headers: headersFor(tokenParam) });
    setFarms(res.data);
    return res.data;
  };

  const fetchFieldsOnly = async (tokenParam?: string) => {
    const res = await apiPom.get<Field[]>('/fields/', { headers: headersFor(tokenParam) });
    setFields(res.data);
    return res.data;
  };

  return { fetchBootstrapData, fetchFieldById, fetchFarmsOnly, fetchFieldsOnly };
}