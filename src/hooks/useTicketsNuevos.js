import { useEffect, useRef, useState } from 'react';

// Devuelve los folios que acaban de aparecer (por tiempo real) para resaltarlos unos segundos.
// La primera carga no resalta nada: solo lo que llega después.
export default function useTicketsNuevos(tickets) {
  const vistos = useRef(null);
  const [nuevos, setNuevos] = useState(() => new Set());

  useEffect(() => {
    const folios = new Set(tickets.map(t => String(t.folio)));
    if (vistos.current === null) {
      if (tickets.length > 0) vistos.current = folios;
      return;
    }
    const aparecidos = [...folios].filter(f => !vistos.current.has(f));
    vistos.current = folios;
    if (aparecidos.length === 0) return;

    setNuevos(prev => new Set([...prev, ...aparecidos]));
    const temporizador = setTimeout(() => {
      setNuevos(prev => {
        const siguiente = new Set(prev);
        aparecidos.forEach(f => siguiente.delete(f));
        return siguiente;
      });
    }, 3200);
    return () => clearTimeout(temporizador);
  }, [tickets]);

  return nuevos;
}
