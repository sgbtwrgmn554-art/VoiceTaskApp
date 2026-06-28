import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clear old service workers and caches, force reload if any were found
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length > 0) {
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        const loc = window.location;
        if ('caches' in window) {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => { loc.reload(); });
        } else {
          loc.reload();
        }
      });
    }
  });
}
if ('caches' in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
