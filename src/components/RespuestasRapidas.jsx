import React, { useEffect, useRef, useState } from 'react';
import { Zap, Plus, Trash2, X } from 'lucide-react';

// Plantillas de mensajes para el técnico. Al elegir una se inserta en el cuadro de texto (no se envía sola),
// para poder ajustarla. Las plantillas propias se guardan en este navegador.
const CLAVE = 'cti_respuestas_rapidas';
const PREDETERMINADAS = [
  'Estoy revisando tu caso, dame unos minutos por favor.',
  '¿Podrías compartir una captura de pantalla del problema?',
  'Ya apliqué un ajuste. ¿Puedes probar de nuevo y confirmarme?',
  'Voy a conectarme a tu equipo de forma remota. ¿Me das tu autorización?',
  'Quedó resuelto. Si vuelve a ocurrir, escríbenos por este mismo chat.'
];

const leer = () => {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return Array.isArray(guardadas) && guardadas.length ? guardadas : PREDETERMINADAS;
  } catch { return PREDETERMINADAS; }
};

export default function RespuestasRapidas({ onElegir }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(leer);
  const [nueva, setNueva] = useState('');
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => { if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);

  const guardar = (siguiente) => {
    setLista(siguiente);
    try { localStorage.setItem(CLAVE, JSON.stringify(siguiente)); } catch { /* almacenamiento no disponible */ }
  };

  const agregar = (e) => {
    e.preventDefault();
    const texto = nueva.trim();
    if (!texto || lista.includes(texto)) return;
    guardar([...lista, texto]);
    setNueva('');
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-label="Respuestas rápidas"
        title="Respuestas rápidas"
        className="h-full px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
      >
        <Zap size={15} strokeWidth={1.75} />
        <span className="hidden sm:inline">Respuestas</span>
      </button>

      {abierto && (
        <div className="absolute bottom-full left-0 mb-2 w-[min(24rem,calc(100vw-3rem))] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden animate-entrada">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
            <p className="text-sm font-medium text-white">Respuestas rápidas</p>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-100 cursor-pointer"><X size={15} strokeWidth={1.75} /></button>
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {lista.map((texto) => (
              <li key={texto} className="group flex items-start gap-2 border-b border-slate-700/60 last:border-0">
                <button
                  type="button"
                  onClick={() => { onElegir(texto); setAbierto(false); }}
                  className="flex-1 text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  {texto}
                </button>
                <button
                  type="button"
                  onClick={() => guardar(lista.filter(t => t !== texto))}
                  aria-label={`Eliminar la respuesta: ${texto}`}
                  className="p-2.5 text-slate-500 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No hay respuestas guardadas.</li>}
          </ul>

          <form onSubmit={agregar} className="flex gap-2 p-3 border-t border-slate-700 bg-slate-900/40">
            <input
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              aria-label="Nueva respuesta rápida"
              placeholder="Escribe una respuesta nueva…"
              autoComplete="off"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500"
            />
            <button type="submit" disabled={!nueva.trim()} aria-label="Agregar respuesta" className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 cursor-pointer">
              <Plus size={16} strokeWidth={2} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
