import { useEffect, useState } from 'react';

// true cuando el usuario pidió "reducir movimiento" en su sistema (las gráficas no se animan).
export default function useReducirMovimiento() {
  const [reducir, setReducir] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cambio = (e) => setReducir(e.matches);
    consulta.addEventListener('change', cambio);
    return () => consulta.removeEventListener('change', cambio);
  }, []);
  return reducir;
}
