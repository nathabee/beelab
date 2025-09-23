// _shared/error/types.ts

 

// _shared/error/types.ts
export type AppError = {
  id: string;
  message: string;
  code?: string | number;
  httpStatus?: number;
  severity: 'toast' | 'page' | 'silent' | 'modal';
  request?: { method?: string; url?: string; payload?: any };
  ts: number;
  raw?: unknown;

  // optional metadata
  component?: string;
  functionName?: string;
  service?: string;
  route?: string;
 
  retryable?: boolean;
  category?: 'auth' | 'network' | 'validation' | 'not_found' | 'server' | 'rate_limit' | 'unknown';
};
