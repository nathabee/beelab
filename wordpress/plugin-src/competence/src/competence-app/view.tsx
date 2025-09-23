// src/competence-app/view.tsx

import ReactDOM from 'react-dom/client'; 
import App from '@app/App';
import { AuthProvider } from '@context/AuthContext';

import './style.css';

const mountPoints = document.querySelectorAll('.wp-block-competence-competence-app');

mountPoints.forEach((el) => {
  const root = ReactDOM.createRoot(el);
  root.render(
    <AuthProvider>
        <App /> 
    </AuthProvider>
  );
});

  