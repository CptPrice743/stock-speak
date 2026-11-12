import './styles.css';
import { captureSetupKeyFromUrl } from './api';

captureSetupKeyFromUrl();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const appRoot = document.getElementById('app');
if (appRoot) {
  if (window.location.pathname.startsWith('/admin')) {
    void import('./ui-admin').then((m) => m.mountAdminApp(appRoot));
  } else {
    void import('./ui-dada').then((m) => m.mountDadaApp(appRoot));
  }
}
