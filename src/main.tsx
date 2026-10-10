import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/legacy.css';
import '@/styles/v2.css';
import { App } from '@/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
