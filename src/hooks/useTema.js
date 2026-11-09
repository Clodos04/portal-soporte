import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// Modo oscuro / claro, persistente en localStorage. También ajusta las barras de desplazamiento,
// los controles nativos y el color de la barra del navegador para que coincidan con el tema.
export default function useTema() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const guardado = localStorage.getItem('sav_theme');
    return guardado ? guardado === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDarkMode ? '#0f1011' : '#f1f5f9');
  }, [isDarkMode]);

  // El cambio se hace con un fundido de toda la pantalla (API View Transitions) para que nada "salte":
  // textos, fondos, gráficas e iconos cambian juntos. Sin soporte o con "reducir movimiento", cambia directo.
  const toggleTheme = () => {
    const siguiente = !isDarkMode;
    const aplicar = () => {
      try { localStorage.setItem('sav_theme', siguiente ? 'dark' : 'light'); } catch (e) { /* sin almacenamiento */ }
      flushSync(() => setIsDarkMode(siguiente));
    };
    const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reducir) {
      const raiz = document.documentElement;
      raiz.classList.add('cambiando-tema');
      const transicion = document.startViewTransition(aplicar);
      transicion.finished.finally(() => raiz.classList.remove('cambiando-tema'));
    } else {
      aplicar();
    }
  };

  return { isDarkMode, toggleTheme };
}
