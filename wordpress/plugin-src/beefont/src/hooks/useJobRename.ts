'use client';

import { useCallback, useState } from 'react';
import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, type AppError, errorBus } from '@bee/common/error';

export function useJobRename(sid: string) {
  const { token } = useUser();

  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const rename = useCallback(
    async (name: string, baseFamily: string | null | undefined) => {
      if (!token) {
        const err: AppError = {
          name: 'AuthError',
          message: 'No auth token available.',
          httpStatus: 401,
          severity: 'page',
          service: 'beefont',
          raw: null,
        };
        setError(err);
        errorBus.emit(err);
        throw err;
      }

      setIsRenaming(true);
      setError(null);

      try {
        const headers = authHeaders(token);
        const payload: any = { name: name.trim() || name };
        // Allow empty string to clear base_family if you want
        if (baseFamily !== undefined) {
          payload.base_family = baseFamily.trim();
        }

        const res = await apiApp.patch(`/jobs/${encodeURIComponent(sid)}/`, payload, {
          headers,
        });

        setIsRenaming(false);
        return res.data;
      } catch (e: any) {
        const appErr = toAppError(e, {
          functionName: 'useJobRename.rename',
          service: 'beefont',
        });
        setError(appErr);
        errorBus.emit(appErr);
        setIsRenaming(false);
        throw appErr;
      }
    },
    [sid, token],
  );

  return { rename, isRenaming, error };
}
