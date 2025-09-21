// src/mytypes/error.ts
export type AppError = {
  id: string;                   // unique id for tracking
  message: string;              // human-readable
  code?: string;                // backend error code (e.g. NO_DATA, FORBIDDEN)
  httpStatus?: number;          // 401, 403, 500...
  severity: 'inline' | 'toast' | 'page';

  // context
  component?: string;
  functionName?: string;
  route?: string;
  service?: 'pomolobee' | 'user' | 'competence' | 'wp';
  request?: { method?: string; url?: string; payload?: any };

  ts: number;                   // timestamp (ms)
  raw?: any;                    // original error object (optional)
};
