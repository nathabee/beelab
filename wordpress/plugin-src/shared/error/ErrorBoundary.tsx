// shared/error/ErrorBoundary.tsx
import React from 'react';
import { errorBus } from './errorBus';
import { toAppError } from './toAppError';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; err?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // forward to the global bus so the provider can route to the error page
    const appErr = toAppError(error, { component: 'ErrorBoundary', functionName: 'componentDidCatch' });
    errorBus.emit(appErr);
    // optional: console for dev
    // console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      // IMPORTANT: no hooks/contexts here
      return (
        <div className="container py-4">
          <h2>Something went wrong.</h2>
          <p className="text-muted">We’re redirecting you to the error page…</p>
        </div>
      );
    }
    return this.props.children;
  }
}
