// _shared/error/types.ts


export type AppError = {
  id: string;
  message: string;
  code?: string | number;
  httpStatus?: number;
  severity: 'toast' | 'page';
  request?: { method?: string; url?: string; payload?: any };
  ts: number;
  raw?: unknown;
  // optional metadata
  component?: string;
  functionName?: string;
  service?: string;
};
