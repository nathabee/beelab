// _shared/error/index.ts
 

export { ErrorProvider } from './ErrorContext';   // named export in file
export { default as ErrorBanner }   from './ErrorBanner'; // default
export { ErrorBoundary } from './ErrorBoundary';  // named export in file
export { default as ErrorPage }     from './ErrorPage';   // default
export { errorBus } from './errorBus';
export * from './types';

export { friendlyMessage }          from './errorCopy';
export { toAppError }               from './toAppError';