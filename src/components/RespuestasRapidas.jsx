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

// Plantillas sugeridas según el tipo de solicitud. Hoy: Touchpoint, con las de cada subcategoría.
const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const TOUCHPOINT_GENERAL = [
  'Cierra Touchpoint por completo, ábrelo de nuevo en Edge o Chrome (en una ventana nueva) e inicia sesión otra vez. ¿Me confirmas si ya carga?',
  'Borra la caché del navegador (Ctrl + Shift + Supr) y vuelve a entrar a Touchpoint. ¿Qué te muestra ahora?'
];
const TOUCHPOINT_POR_SUBCATEGORIA = [
  { clave: 'AUDIO', textos: [
    'Revisa en Windows que la diadema sea el dispositivo de audio predeterminado, tanto de entrada como de salida, y que no esté en silencio.',
    'Desconecta la diadema, espera 5 segundos y conéctala en otro puerto USB. ¿Touchpoint ya la detecta?',
    'Cuando el navegador pida permiso para usar el micrófono, elige «Permitir». ¿Te apareció el aviso?'
  ] },
  { clave: 'UNICA', textos: [
    'Verifica que tu sesión de Touchpoint no esté abierta en otro equipo. Si lo está, ciérrala y vuelve a entrar.',
    'Reinicia el equipo y entra de nuevo a Touchpoint. Si vuelve a sacarte de la sesión, avísame por aquí.'
  ] },
  { clave: 'MASIVA', textos: [
    'Ya estamos revisando la conexión de toda la isla. Te aviso por este chat en cuanto quede restablecida.',
    'Mientras lo resolvemos, confirma con tu supervisor cuántas posiciones siguen sin servicio.'
  ] },
  { clave: 'FOLIO DE SOPORTE', textos: [
    'Dejamos este folio como antecedente de la falla. Si vuelve a presentarse hoy, avísame por aquí y nos acercamos.'
  ] }
];
const plantillasSugeridas = (ticket) => {
  if (!sinAcentos(ticket && ticket.categoria).includes('TOUCHPOINT')) return [];
  const sub = sinAcentos(ticket && ticket.subcategoria);
  const propias = TOUCHPOINT_POR_SUBCATEGORIA.find(g => sub.includes(g.clave));
  return [...(propias ? propias.textos : []), ...TOUCHPOINT_GENERAL];
};

const leer = () => {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return Array.isArray(guardadas) && guardadas.length ? guardadas : PREDETERMINADAS;
  } catch { return PREDETERMINADAS; }
};

export default function RespuestasRapidas({ onElegir, ticket }) {
  const sugeridas = plantillasSugeridas(ticket);
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

          <div className="max-h-72 overflow-y-auto">
          {sugeridas.length > 0 && (
            <>
              <p className="px-4 pt-2.5 pb-1 text-[11px] font-medium text-indigo-300">Sugeridas para Touchpoint</p>
              <ul className="border-b border-slate-700">
                {sugeridas.map((texto) => (
                  <li key={texto} className="border-b border-slate-700/60 last:border-0">
                    <button
                      type="button"
                      onClick={() => { onElegir(texto); setAbierto(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      {texto}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="px-4 pt-2.5 pb-1 text-[11px] font-medium text-slate-400">Mis respuestas</p>
            </>
          )}
          <ul>
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
          </div>

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
