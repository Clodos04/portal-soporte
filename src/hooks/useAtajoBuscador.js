import { useEffect } from 'react';

// Atajo Ctrl+K / Cmd+K para abrir y cerrar el buscador global (solo con sesión iniciada).
export default function useAtajoBuscador(isLoggedIn, alternar) {
  useEffect(() => {
    if (!isLoggedIn) return;
    const alTeclear = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        alternar();
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [isLoggedIn, alternar]);
}
