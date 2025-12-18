import { Buffer } from 'buffer';

// Polyfill Buffer for the browser environment (needed for Firebase/Firestore)
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);