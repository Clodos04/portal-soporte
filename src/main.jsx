import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Si el servidor responde 401 (sesión expirada) fuera del login, se recarga para mostrar la pantalla de acceso
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await fetchOriginal(...args);
  const url = String(typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '');
  if (res.status === 401 && !url.includes('/api/login') && !url.includes('/api/me') && !url.includes('/api/logout')) {
    window.location.reload();
  }
  return res;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
