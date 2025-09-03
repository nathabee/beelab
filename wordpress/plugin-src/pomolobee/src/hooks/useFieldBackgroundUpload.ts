// src/hooks/useFieldBackgroundUpload.ts
'use client';

import { useAuth } from '@context/AuthContext';
import { apiPom, authHeaders } from '@utils/api';

type UploadResult = {
  background_image_url?: string; // preferred
  [k: string]: any;
};

export default function useFieldBackgroundUpload() {
  const { token } = useAuth();

  async function uploadBackground(fieldId: number, file: File, desiredFilename?: string): Promise<string> {
    if (!token) throw new Error('No auth token');

    // Pick a filename: prefer caller’s, else field shortcode logic can feed us one
    const name = desiredFilename ?? file.name;

    const form = new FormData();
    // IMPORTANT: server-side field name may differ. If your DRF action expects a different key,
    // change 'background_image' below to match.
    form.append('background_image', file, name);

    const headers = {
      ...authHeaders(token), 
    };

    // Default endpoint. If your ViewSet uses a custom action, align this path.
    const res = await apiPom.post<UploadResult>(`/fields/${fieldId}/background/`, form, { headers });

    // Try common shapes
    const url =
      res.data?.background_image_url ??
      (res.data as any)?.field?.background_image_url ??
      (typeof res.data === 'string' ? res.data : null);

    if (!url) throw new Error('Upload succeeded but no background_image_url returned');
    return url; // relative URL is fine; your <img> will resolve if the host serves it
  }

  return { uploadBackground };
}
