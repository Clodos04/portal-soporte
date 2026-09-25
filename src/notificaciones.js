// src/notificaciones.js
export const dispararAlertaNotificacion = (titulo, mensaje) => {
  // 1. Reproducir el sonido de experiencia de Minecraft desde la carpeta public
  try {
    const audio = new Audio('/Sonidos/Sonido de experiencia en minecraft para tono de notificación.mp3');
    audio.play().catch(e => console.log("El navegador bloqueó la reproducción automática hasta que el usuario interactúe con la página", e));
  } catch (err) {
    console.error("No se pudo reproducir el archivo de audio", err);
  }

  // 2. Lanzar la notificación nativa flotante del sistema operativo / navegador
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, {
      body: mensaje,
      icon: '/favicon.svg'
    });
  }
};
