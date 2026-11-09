import { Info } from 'lucide-react';

// Aviso cuando solo se cargó parte del historial (activos + cerrados recientes), con botón para traer el resto.
export default function AvisoHistorial({ historial }) {
  if (!historial || !historial.parcial) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
      <Info size={18} strokeWidth={1.75} className="shrink-0 text-indigo-300" aria-hidden="true" />
      <p className="flex-1 min-w-[16rem] text-sm text-slate-300">
        Se muestran los tickets activos y los cerrados de los últimos {historial.dias} días ({historial.cargados} de {historial.total}).
        Los totales y reportes cubren solo ese periodo.
      </p>
      <button
        type="button"
        onClick={historial.cargarTodo}
        disabled={historial.cargando}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition-colors cursor-pointer"
      >
        {historial.cargando ? 'Cargando…' : 'Cargar historial completo'}
      </button>
    </div>
  );
}
