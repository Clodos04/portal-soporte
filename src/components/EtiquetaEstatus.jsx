import React from 'react';

// Etiqueta de estatus única para todo el portal. Se calcula a partir del texto del estatus
// (no del color guardado en la BD), así todas las pantallas se ven igual.
const ESTILOS = {
  abierto: { clase: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', punto: 'bg-emerald-400' },
  proceso: { clase: 'bg-amber-500/10 text-amber-400 border-amber-500/25', punto: 'bg-amber-400' },
  cerrado: { clase: 'bg-slate-500/10 text-slate-400 border-slate-500/25', punto: 'bg-slate-500' },
  otro:    { clase: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25', punto: 'bg-indigo-400' }
};

export const tipoEstatus = (estatus = '') => {
  const e = String(estatus).toLowerCase();
  if (e.includes('cerrado') || e.includes('resuelto')) return 'cerrado';
  if (e.includes('proceso')) return 'proceso';
  if (e.includes('abierto')) return 'abierto';
  return 'otro';
};

export default function EtiquetaEstatus({ estatus }) {
  const estilo = ESTILOS[tipoEstatus(estatus)];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${estilo.clase}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${estilo.punto}`} />
      {estatus || 'Sin estatus'}
    </span>
  );
}
