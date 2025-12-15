// src/beegame-app/view.tsx

import { createRoot } from '@wordpress/element';
import App from '@app/App';
import { AppProvider } from '@context/AppContext'; 

import './style.css';


const mountPoints = document.querySelectorAll('.wp-block-beegame-beegame-app');

mountPoints.forEach((el) => {
  const root = createRoot(el)
  root.render( 
      <AppProvider>
        <App />
      </AppProvider> 
  );
});
