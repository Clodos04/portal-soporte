import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Trash2, X } from 'lucide-react';

// Vistas guardadas del listado (filtro + búsqueda + lista/tablero), por usuario y en este navegador.
const leer = (clave) => {
  try {
    const guardadas = JSON.parse(localStorage.getItem(clave) || '[]');
    return Array.isArray(guardadas) ? guardadas : [];
  } catch { return []; }
};

export default function VistasGuardadas({ usuario, actual, onAplicar }) {
  const clave = `cti_vistas_${usuario || 'anonimo'}`;
  const [abierto, setAbierto] = useState(false);
  const [vistas, setVistas] = useState(() => leer(clave));
  const [nombre, setNombre] = useState('');
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
    setVistas(siguiente);
    try { localStorage.setItem(clave, JSON.stringify(siguiente)); } catch { /* almacenamiento no disponible */ }
  };

  const guardarActual = (e) => {
    e.preventDefault();
    const texto = nombre.trim();
    if (!texto) return;
    guardar([...vistas.filter(v => v.nombre !== texto), { nombre: texto, ...actual }].slice(-12));
    setNombre('');
  };

  const descripcion = (v) => {
    const partes = [v.vista === 'tablero' ? 'Tablero' : 'Lista', String(v.filtroEstatus || 'activos').replace('_', ' ')];
    if (v.busqueda) partes.push(`“${v.busqueda}”`);
    return partes.join(' · ');
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        className="px-3.5 py-2 rounded-lg bg-slate-900/60 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
      >
        <Bookmark size={14} strokeWidth={1.75} /> Vistas
        {vistas.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300">{vistas.length}</span>}
      </button>

      {abierto && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-[min(22rem,calc(100vw-3rem))] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden animate-entrada">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
            <p className="text-sm font-medium text-white">Vistas guardadas</p>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-100 cursor-pointer"><X size={15} strokeWidth={1.75} /></button>
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {vistas.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Aún no has guardado ninguna vista.</li>}
            {vistas.map(v => (
              <li key={v.nombre} className="flex items-center gap-1 border-b border-slate-700/60 last:border-0">
                <button onClick={() => { onAplicar(v); setAbierto(false); }} className="flex-1 text-left px-4 py-2.5 hover:bg-slate-700/60 transition-colors cursor-pointer">
                  <span className="block text-sm text-slate-100">{v.nombre}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{descripcion(v)}</span>
                </button>
                <button onClick={() => guardar(vistas.filter(x => x.nombre !== v.nombre))} aria-label={`Eliminar la vista ${v.nombre}`} className="p-2.5 text-slate-500 hover:text-red-400 cursor-pointer">
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={guardarActual} className="p-3 border-t border-slate-700 bg-slate-900/40 space-y-2">
            <p className="text-xs text-slate-400">Guarda lo que estás viendo ahora: <span className="text-slate-300">{descripcion(actual)}</span></p>
            <div className="flex gap-2">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                aria-label="Nombre de la vista"
                placeholder="Nombre, ej. Mis vencidos…"
                autoComplete="off"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500"
              />
              <button type="submit" disabled={!nombre.trim()} className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 cursor-pointer">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
