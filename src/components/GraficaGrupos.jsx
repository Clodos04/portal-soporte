import React from 'react';
import { ChevronRight } from 'lucide-react';

// Tickets por grupo: barras horizontales ordenadas de mayor a menor, con cifra y porcentaje visibles.
// Clic en un grupo lleva al listado filtrado. Se carga bajo demanda (React.lazy).
export default function GraficaGrupos({ datosGrupos, onSeleccionar }) {
  const datos = [...(datosGrupos || [])].sort((a, b) => b.tickets - a.tickets || a.nombre.localeCompare(b.nombre));
  const total = datos.reduce((suma, d) => suma + d.tickets, 0);
  const maximo = datos.length ? datos[0].tickets : 0;

  if (total === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
        <p className="text-sm font-medium text-slate-300">Sin tickets en este periodo</p>
        <p className="text-xs mt-1">Cambia a «Total» para ver el histórico.</p>
      </div>
    );
  }

  return (
    <ul className="h-full overflow-y-auto pr-2 space-y-1" aria-label="Tickets por grupo">
      {datos.map((d, i) => {
        const porcentaje = Math.round((d.tickets / total) * 100);
        const ancho = maximo ? Math.max((d.tickets / maximo) * 100, d.tickets > 0 ? 2 : 0) : 0;
        const principal = i === 0 && d.tickets > 0;
        const contenido = (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className={`text-sm truncate ${principal ? 'text-white font-semibold' : 'text-slate-300'}`} title={d.nombre}>{d.nombre}</span>
              <span className="shrink-0 text-xs tabular-nums">
                <span className={`text-sm font-semibold ${principal ? 'text-white' : 'text-slate-200'}`}>{d.tickets}</span>
                <span className="text-slate-400 ml-1.5">{porcentaje}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900/70 overflow-hidden">
              <div
                className={`h-full rounded-full animate-crecer ${principal ? 'bg-indigo-500' : 'bg-indigo-500/45 group-hover:bg-indigo-500/80'} transition-colors`}
                style={{ width: `${ancho}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={d.nombre}>
            {onSeleccionar ? (
              <button
                type="button"
                onClick={() => onSeleccionar(d.nombre)}
                title={`Ver solicitudes de ${d.nombre}`}
                className="group w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">{contenido}</div>
                <ChevronRight className="w-4 h-4 shrink-0 text-slate-600 group-hover:text-slate-300 transition-colors" aria-hidden="true" />
              </button>
            ) : (
              <div className="px-3 py-2">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
