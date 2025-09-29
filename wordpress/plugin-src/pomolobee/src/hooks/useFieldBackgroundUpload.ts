// src/hooks/useFieldBackgroundUpload.ts
'use client';


import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { apiApp, authHeaders } from '@utils/api';

type UploadResult = { background_image_url?: string; [k: string]: any };

export default function useFieldBackgroundUpload() {
  const { token } = useUser();
  const { patchField } = useApp();

  async function uploadBackground(fieldId: number, file: File, desiredFilename?: string): Promise<string> {
    if (!token) throw new Error('No auth token');

    const form = new FormData();
    form.append('background_image', file, desiredFilename ?? file.name);

    const res = await apiApp.post<UploadResult>(`/fields/${fieldId}/background/`, form, {
      headers: { ...authHeaders(token) }, // do not set Content-Type
    });

    const url =
      res.data?.background_image_url ??
      (res.data as any)?.field?.background_image_url ??
      (typeof res.data === 'string' ? res.data : null);

    if (!url) throw new Error('Upload succeeded but no background_image_url returned');

    // 🔧 Patch the field in memory so UI updates instantly
    patchField(fieldId, { background_image_url: url });

    return url;
  }

  return { uploadBackground };
}
 