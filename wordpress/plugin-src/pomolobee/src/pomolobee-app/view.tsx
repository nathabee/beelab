import ReactDOM from 'react-dom/client';
import App from '@app/App';
import { AuthProvider } from '@context/AuthContext';
import './style.css';

const nodes = document.querySelectorAll('.wp-block-pomolobee-pomolobee-app');

nodes.forEach((el) => {
  // prevent double mounting if script somehow runs twice
  if ((el as any).__pbMounted) return;
  (el as any).__pbMounted = true;

  const root = ReactDOM.createRoot(el);
  root.render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
});
