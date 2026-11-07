import React from 'react';

// Estado vacío: icono + mensaje + (opcional) acción. Reemplaza las cajas punteadas con texto suelto.
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, onAccion, compacto = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compacto ? 'py-6' : 'py-10'} px-4`}>
      {Icono && (
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
          <Icono size={18} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-slate-200">{titulo}</p>
      {descripcion && <p className="text-xs text-slate-500 mt-1 max-w-sm">{descripcion}</p>}
      {accion && onAccion && (
        <button
          onClick={onAccion}
          className="mt-4 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          {accion}
        </button>
      )}
    </div>
  );
}

// Bloque gris animado mientras se cargan datos.
export function Esqueleto({ className = '' }) {
  return <div className={`animate-pulse bg-slate-700/60 rounded-lg ${className}`} aria-hidden="true" />;
}

// Esqueleto de una pantalla tipo panel: tarjetas de métricas + tabla.
export function EsqueletoPanel({ tarjetas = 4, filas = 5 }) {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando">
      <Esqueleto className="h-24 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: tarjetas }).map((_, i) => <Esqueleto key={i} className="h-24" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: filas }).map((_, i) => <Esqueleto key={i} className="h-10 w-full" />)}
      </div>
    </div>
  );
}
