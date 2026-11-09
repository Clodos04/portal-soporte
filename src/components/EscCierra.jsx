import { useEffect, useRef } from 'react';

// Colocar dentro de una ventana emergente: mientras esté montada, la tecla Escape la cierra.
// No pinta nada. Usa una referencia para no volver a registrar el evento en cada render.
export default function EscCierra({ onCerrar }) {
  const ref = useRef(onCerrar);
  useEffect(() => { ref.current = onCerrar; });
  useEffect(() => {
    const alPulsar = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) ref.current && ref.current();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);
  return null;
}
