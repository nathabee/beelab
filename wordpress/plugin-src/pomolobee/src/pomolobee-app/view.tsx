// pomolobee-app/view.tsx

import { createRoot } from '@wordpress/element';
import App from '@app/App';
import { AppProvider } from '@context/AppContext';
import { UserProvider } from '@bee/common'; // from shared/user/index.ts

import './style.css';

const mountPoints = document.querySelectorAll('.wp-block-pomolobee-pomolobee-app');

mountPoints.forEach((el) => {
  const root = createRoot(el);
  root.render(
    <UserProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </UserProvider>
  );
});
