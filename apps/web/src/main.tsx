import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BlockingLoaderProvider } from './components/BlockingLoaderProvider';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BlockingLoaderProvider>
      <App />
    </BlockingLoaderProvider>
  </React.StrictMode>,
);
