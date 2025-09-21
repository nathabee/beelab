// src/utils/toAppError.ts
import type { AxiosError } from 'axios';
import type { AppError } from '@mytypes/error';

let seq = 0;

export function toAppError(e: unknown, ctx?: Partial<AppError>): AppError {
  const err = e as AxiosError<any>;
  const status = err?.response?.status;
  const data   = err?.response?.data;
  const detail = data?.detail ?? data?.message ?? err?.message ?? 'Unknown error';
  const code   = data?.code  ?? data?.error   ?? (err as any)?.code;

  const method = err?.config?.method?.toUpperCase();
  const url    = err?.config?.url;
  const payload= err?.config?.data;

  const severity: AppError['severity'] =
    status && (status >= 500) ? 'page' :
    status === 401 || status === 403 ? 'page' :
    'toast';

  return {
    id: `E${Date.now()}_${++seq}`,
    message: detail,
    code,
    httpStatus: status,
    severity,
    request: { method, url, payload },
    ts: Date.now(),
    raw: e,
    ...ctx,
  };
}
