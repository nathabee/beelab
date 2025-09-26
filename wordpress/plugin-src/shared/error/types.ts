// shared/error/types.ts

 

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
  user?: ErrorUserMeta;
};


 export type ErrorUserMeta = {
   isLoggedIn: boolean;
   id?: string | number;
   username?: string;
   email?: string;
   roles?: string[];
   // you can add tenant, orgId, etc. if relevant
 };

 // internal holder for the app-supplied getter
 let __userMetaSupplier: (() => ErrorUserMeta | null | undefined) | null = null;

 /** App calls this once to provide a live getter for user context. */
 export function setErrorUserSupplier(supplier: () => ErrorUserMeta | null | undefined) {
   __userMetaSupplier = supplier;
 }

// small helper so we don’t crash 
export function getErrorUserMeta(): ErrorUserMeta | undefined {
   try {
     return __userMetaSupplier?.() || undefined;
   } catch {
     return undefined;
   }
 }
