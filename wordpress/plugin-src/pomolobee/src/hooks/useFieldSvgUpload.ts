// src/hooks/useFieldSvgUpload.ts
'use client';
import { apiApp, authHeaders } from '@utils/api';
import { toAppError, errorBus , AppError }    from '@bee/common/error';

import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';

type UploadResult = { svg_map_url?: string; [k: string]: any };

export default function useFieldSvgUpload() { 
  const { token } = useUser();
  const { patchField } = useApp();

  async function uploadSvg(fieldId: number, file: File): Promise<string> {
    if (!token) throw new Error('No auth token');
    const form = new FormData();
    form.append('svg_map', file, file.name);

    try {
      const res = await apiApp.post<UploadResult>(`/fields/${fieldId}/svg/`, form, {
        headers: { ...authHeaders(token) },
      });
      const url =
        res.data?.svg_map_url ??
        (res.data as any)?.field?.svg_map_url ??
        (typeof res.data === 'string' ? res.data : null);
      if (!url) throw new Error('Upload succeeded but no svg_map_url returned');
      const cacheBusted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
      patchField(fieldId, { svg_map_url: cacheBusted });
      return cacheBusted;
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        functionName: 'useFieldSvgUpload.uploadSvg',
        service: 'pomolobee',
      });

      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
        // IMPORTANT: don't rethrow here; the provider will handle the redirect.
        return Promise.reject(appErr);
      }

      // For non-page errors, let the caller show inline feedback
      return Promise.reject(appErr);
    }
  }

  return { uploadSvg };
}
