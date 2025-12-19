import { Buffer } from 'buffer';

// Polyfill Buffer for the browser environment (needed for Firebase/Firestore)
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Index.tsx executing");
document.title = "Resume Rank";

const rootElement = document.getElementById('root');
console.log("Root element:", rootElement);

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
console.log("Root created, rendering App...");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);