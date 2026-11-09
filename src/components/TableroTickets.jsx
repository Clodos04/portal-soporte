import React, { useState } from 'react';
import { nombrePresentable } from '../utils/texto';
import { calcularSLA, formatearDuracion } from '../utils/sla';
import { tipoEstatus } from './EtiquetaEstatus';

// Tablero tipo Kanban: una columna por estatus. Los técnicos arrastran una tarjeta para cambiar el estatus.

const COLUMNAS = [
  { clave: 'abierto', titulo: 'Abierto', estatus: 'Abierto', punto: 'bg-emerald-400' },
  { clave: 'proceso', titulo: 'En proceso', estatus: 'En Proceso', punto: 'bg-amber-400' },
  { clave: 'cerrado', titulo: 'Cerrado', estatus: 'Cerrado', punto: 'bg-slate-500' }
];

const LIMITE_CERRADOS = 20;

function textoSla(sla) {
  if (sla.nivel === 'vencido') return { texto: `Vencido hace ${formatearDuracion(-sla.restanteMin)}`, clase: 'text-red-400', punto: 'bg-red-400' };
  if (sla.nivel === 'riesgo') return { texto: `Vence en ${formatearDuracion(sla.restanteMin)}`, clase: 'text-amber-400', punto: 'bg-amber-400' };
  if (sla.nivel === 'ok') return { texto: `Vence en ${formatearDuracion(sla.restanteMin)}`, clase: 'text-slate-400', punto: 'bg-emerald-400' };
  return null;
}

function TableroTickets({ tickets, categorias, puedeMover, onAbrir, onMover, foliosNuevos }) {
  const [arrastrando, setArrastrando] = useState(null);
  const [columnaSobre, setColumnaSobre] = useState(null);

  const porColumna = (clave) => {
    const lista = tickets.filter(t => {
      const tipo = tipoEstatus(t.estatus);
      return clave === 'proceso' ? tipo === 'proceso' : clave === 'cerrado' ? tipo === 'cerrado' : (tipo === 'abierto' || tipo === 'otro');
    });
    return lista;
  };

  const soltar = (e, columna) => {
    e.preventDefault();
    setColumnaSobre(null);
    const folio = e.dataTransfer.getData('text/plain') || arrastrando;
    setArrastrando(null);
    const ticket = tickets.find(t => String(t.folio) === String(folio));
    if (!ticket || !puedeMover) return;
    if (tipoEstatus(ticket.estatus) === columna.clave || (columna.clave === 'abierto' && tipoEstatus(ticket.estatus) === 'otro')) return;
    onMover(ticket, columna.estatus);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {COLUMNAS.map(col => {
        const todos = porColumna(col.clave);
        const visibles = col.clave === 'cerrado' ? todos.slice(0, LIMITE_CERRADOS) : todos;
        const resaltada = columnaSobre === col.clave && puedeMover;
        return (
          <section
            key={col.clave}
            aria-label={`Columna ${col.titulo}`}
            onDragOver={(e) => { if (puedeMover) { e.preventDefault(); setColumnaSobre(col.clave); } }}
            onDragLeave={() => setColumnaSobre(null)}
            onDrop={(e) => soltar(e, col)}
            className={`bg-slate-900/60 border rounded-xl p-3 min-h-[12rem] transition-colors ${resaltada ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700'}`}
          >
            <header className="flex items-center gap-2 px-1 pb-3">
              <span className={`w-2 h-2 rounded-full ${col.punto}`} />
              <h3 className="text-sm font-medium text-white">{col.titulo}</h3>
              <span className="ml-auto text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5">{todos.length}</span>
            </header>

            <div className="space-y-2.5">
              {visibles.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">{puedeMover ? 'Suelta una tarjeta aquí' : 'Sin tickets'}</p>
              )}
              {visibles.map(t => {
                const sla = textoSla(calcularSLA(t, categorias));
                return (
                  <article
                    key={t.folio}
                    draggable={puedeMover}
                    onDragStart={(e) => { setArrastrando(t.folio); e.dataTransfer.setData('text/plain', String(t.folio)); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setArrastrando(null); setColumnaSobre(null); }}
                    onClick={() => onAbrir(t)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(t); }}
                    className={`animate-entrada bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg p-3 transition-colors cursor-pointer ${foliosNuevos && foliosNuevos.has(String(t.folio)) ? 'animate-resaltar' : ''} ${
                      arrastrando === t.folio ? 'opacity-40' : ''
                    } ${puedeMover ? 'active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-indigo-300">#{t.folio}</span>
                      {sla && (
                        <span className={`flex items-center gap-1.5 text-xs ${sla.clase}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sla.punto}`} />
                          {sla.texto}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white mt-1.5 line-clamp-2">{t.asunto || t.subcategoria || 'Sin asunto'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                      <span>{nombrePresentable(t.creador) || 'Sin solicitante'}</span>
                      {t.equipo && t.equipo !== 'Ninguno' && <span className="font-mono">{t.equipo}</span>}
                    </div>
                    <p className="text-xs mt-2 text-slate-500">
                      Técnico: <span className="text-slate-300">{nombrePresentable(t.tecnico) || 'Sin asignar'}</span>
                    </p>
                    {puedeMover && (
                      <select
                        aria-label={`Mover el ticket ${t.folio} a otro estatus`}
                        value=""
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => { if (e.target.value) onMover(t, e.target.value); }}
                        className="mt-3 w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 cursor-pointer"
                      >
                        <option value="">Mover a…</option>
                        {COLUMNAS.filter(c => c.clave !== tipoEstatus(t.estatus) && !(c.clave === 'abierto' && tipoEstatus(t.estatus) === 'otro')).map(c => (
                          <option key={c.clave} value={c.estatus}>{c.titulo}</option>
                        ))}
                      </select>
                    )}
                  </article>
                );
              })}
              {col.clave === 'cerrado' && todos.length > LIMITE_CERRADOS && (
                <p className="text-xs text-slate-500 text-center pt-1">Mostrando los {LIMITE_CERRADOS} más recientes de {todos.length}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default TableroTickets;
