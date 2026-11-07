import { useEffect, useRef, useState } from 'react';

// Cuenta desde el valor anterior hasta `objetivo` (efecto de "contador"). Respeta "reducir movimiento".
export default function useContarHasta(objetivo, duracion = 700) {
  const [valor, setValor] = useState(objetivo);
  const desde = useRef(objetivo);

  useEffect(() => {
    const meta = Number(objetivo);
    if (!Number.isFinite(meta)) { setValor(objetivo); return; }
    const reducirMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducirMovimiento || desde.current === meta) { desde.current = meta; setValor(meta); return; }

    const inicio = desde.current;
    const t0 = performance.now();
    let cuadro;
    const paso = (ahora) => {
      const progreso = Math.min((ahora - t0) / duracion, 1);
      const suave = 1 - Math.pow(1 - progreso, 3); // desacelera al final
      setValor(Math.round(inicio + (meta - inicio) * suave));
      if (progreso < 1) cuadro = requestAnimationFrame(paso);
      else desde.current = meta;
    };
    cuadro = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(cuadro); desde.current = meta; };
  }, [objetivo, duracion]);

  return valor;
}
