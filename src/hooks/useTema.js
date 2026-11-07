import { useEffect, useState } from 'react';

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

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const siguiente = !prev;
      localStorage.setItem('sav_theme', siguiente ? 'dark' : 'light');
      return siguiente;
    });
  };

  return { isDarkMode, toggleTheme };
}
