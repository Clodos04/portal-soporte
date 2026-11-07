import { useCallback, useState } from 'react';

// Avisos del portal: sonido, notificación del navegador, cuadro visual temporal e historial para la campana.
export default function useNotificaciones() {
  const [alertaVisual, setAlertaVisual] = useState(null);
  // Historial de notificaciones de la sesión (campana del encabezado)
  const [notificaciones, setNotificaciones] = useState([]);

  const reproducirAlerta = useCallback((mensajeTexto) => {
    setNotificaciones(prev => [{ id: Date.now() + Math.random(), texto: mensajeTexto, fecha: new Date(), leida: false }, ...prev].slice(0, 30));
    const audio = new Audio('/Sonidos/minecraft_exp.mp3');
    audio.play().catch(err => console.log('Audio bloqueado por el navegador:', err));
    setAlertaVisual(mensajeTexto);
    setTimeout(() => { setAlertaVisual(null); }, 4000);

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('CTI - Actualización', { body: mensajeTexto, icon: '/favicon.svg' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('CTI - Actualización', { body: mensajeTexto, icon: '/favicon.svg' });
          }
        });
      }
    }
  }, []);

  const marcarLeidas = useCallback(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true }))), []);
  const limpiarNotificaciones = useCallback(() => setNotificaciones([]), []);

  return { alertaVisual, notificaciones, reproducirAlerta, marcarLeidas, limpiarNotificaciones };
}
