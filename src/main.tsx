import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({ immediate: false });
      })
      .catch(() => null);
  } else {
    // Clear any stale dev service workers from prior sessions so Vite dev modules never stall behind a SW cache
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => null);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
