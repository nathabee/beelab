import ReactDOM from 'react-dom/client';
import * as React from 'react';
import App from '@app/App';
import { AuthProvider } from '@context/AuthContext';
import './style.css';

const nodes = document.querySelectorAll('.wp-block-pomolobee-pomolobee-app');

nodes.forEach((el) => {
  // prevent double mounting if script somehow runs twice
  if ((el as any).__pbMounted) return;
  (el as any).__pbMounted = true;

  console.log('[diag] React === window.React ?', React === (window as any).React);
  console.log('[diag] ReactDOM === window.ReactDOM ?', ReactDOM === (window as any).ReactDOM);
  console.log('[pomolobee] settings @load:', (window as any)?.pomolobeeSettings);

  const root = ReactDOM.createRoot(el);
  root.render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
});
 