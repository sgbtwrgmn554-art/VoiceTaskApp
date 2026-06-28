import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clear stale service workers once — only if any are registered
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length > 0) {
      const loc = window.location;
      Promise.all([
        ...regs.map((r) => r.unregister()),
        ...('caches' in window ? [caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))] : []),
      ]).then(() => { loc.reload(); });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
