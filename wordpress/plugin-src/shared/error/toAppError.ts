// shared/error/toAppError.ts
import type { AxiosError } from 'axios';
import { type AppError, getErrorUserMeta } from './types';

 let seq = 0;
 const nextId = () => `E${Date.now()}_${++seq}`;

 export function toAppError(e: unknown, ctx: Partial<AppError> = {}): AppError {
   const ax = e as AxiosError<any>;
   const status = ax?.response?.status;
   const data   = ax?.response?.data;
   const detail = data?.detail ?? data?.message ?? ax?.message ?? (e as any)?.message ?? 'Unknown error';
   const code   = data?.code  ?? data?.error   ?? (ax as any)?.code;

   const method = ax?.config?.method?.toUpperCase();
   const url    = ax?.config?.url;
   const payload= ax?.config?.data;

   // WP REST shape: { code, message, data: { status } }
   const wpStatus = (data?.data?.status && Number(data.data.status)) || undefined;
   const finalStatus = status ?? wpStatus;

   // Network/offline
   const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
   const isNetworkErr = (ax && !ax.response) || code === 'ECONNABORTED' || isOffline;

   // classify
   let category: AppError['category'] = 'unknown';
   if (isNetworkErr) category = 'network';
   else if (finalStatus === 401 || finalStatus === 403) category = 'auth';
   else if (finalStatus === 404) category = 'not_found';
   else if (finalStatus === 429) category = 'rate_limit';
   else if (finalStatus && finalStatus >= 500) category = 'server';

   // severity
   let severity: AppError['severity'] =
     (finalStatus && finalStatus >= 500) ? 'page'
     : (finalStatus === 401 || finalStatus === 403) ? 'page'
     : (finalStatus === 404) ? 'toast'
     : isNetworkErr ? 'toast'
     : 'toast';

   const retryable = isNetworkErr || finalStatus === 429 || (finalStatus && finalStatus >= 500);

   return {
     id: nextId(),
     message: detail,
     code,
     httpStatus: finalStatus,
     severity,
     request: { method, url, payload },
     ts: Date.now(),
     raw: e,
     category,
     retryable,
     ...ctx,  
    user: ctx.user ?? getErrorUserMeta(),
   };
 }



