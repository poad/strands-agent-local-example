import App from './App.tsx';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
