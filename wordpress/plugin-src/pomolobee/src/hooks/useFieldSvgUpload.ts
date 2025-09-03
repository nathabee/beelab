// src/hooks/useFieldSvgUpload.ts
'use client';
import { useAuth } from '@context/AuthContext';
import { apiPom, authHeaders } from '@utils/api';

type UploadResult = { svg_map_url?: string; [k: string]: any };

export default function useFieldSvgUpload() {
  const { token, patchField } = useAuth();

  async function uploadSvg(fieldId: number, file: File): Promise<string> {
    if (!token) throw new Error('No auth token');

    const form = new FormData();
    form.append('svg_map', file, file.name);

    const res = await apiPom.post<UploadResult>(`/fields/${fieldId}/svg/`, form, {
      headers: { ...authHeaders(token) }, // let the browser set multipart boundary
    });

    const url =
      res.data?.svg_map_url ??
      (res.data as any)?.field?.svg_map_url ??
      (typeof res.data === 'string' ? res.data : null);

    if (!url) throw new Error('Upload succeeded but no svg_map_url returned');

    // Cache-bust in UI so the user doesn’t see a stale file with same path
    const cacheBusted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    patchField(fieldId, { svg_map_url: cacheBusted });

    return cacheBusted;
  }

  return { uploadSvg };
}
