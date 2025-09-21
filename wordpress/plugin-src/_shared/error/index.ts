// _shared/error/index.ts
export * from './toAppError';
export * from './errorCopy';
export * from './types';

export { ErrorProvider } from './ErrorContext';
export { ErrorBoundary } from './ErrorBoundary';      // named export in file

// ✅ these files export default, so re-export as default-as-NAME
export { default as ErrorBanner } from './ErrorBanner';
export { default as ErrorPage }   from './ErrorPage';

export { errorBus } from './errorBus';