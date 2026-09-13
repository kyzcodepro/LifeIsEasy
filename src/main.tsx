import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store/store';
import { ExperienceProvider } from './store/experience';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ExperienceProvider><App /></ExperienceProvider>
    </StoreProvider>
  </StrictMode>,
);
