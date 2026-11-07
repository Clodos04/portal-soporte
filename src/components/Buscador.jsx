import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Home, Ticket, Inbox, LayoutDashboard, BarChart3, UserCog, Users, FolderTree, Megaphone, BookOpen, Plus, CornerDownLeft } from 'lucide-react';
import EtiquetaEstatus from './EtiquetaEstatus';

// Buscador global (Ctrl + K): saltar a una pantalla o abrir un ticket por folio, asunto, usuario o equipo.

const sinAcentos = (t = '') => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Buscador({ abierto, onCerrar, user, tickets = [], onIrAVista, onAbrirTicket }) {
  const [consulta, setConsulta] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef(null);

  const esAdmin = (user?.nivel || '').toUpperCase().includes('ADMIN') || user?.role === 'support';

  const destinos = useMemo(() => {
    const base = [
      { id: 'inicio', texto: 'Inicio', icono: Home },
      { id: 'solicitudes', texto: 'Solicitudes', icono: Ticket },
      { id: 'nueva-solicitud', texto: 'Nueva solicitud', icono: Plus },
      { id: 'buzon', texto: 'Buzón de sugerencias', icono: Inbox }
    ];
    if (user?.role === 'client') base.push({ id: 'guia-tickets', texto: 'Guía de ayuda', icono: BookOpen });
    if (esAdmin) {
      base.push(
        { id: 'admin-supervisor-panel', texto: 'Panel de supervisor', icono: LayoutDashboard },
        { id: 'admin-reportes', texto: 'Reportes', icono: BarChart3 },
        { id: 'admin-usuarios', texto: 'Usuarios', icono: UserCog },
        { id: 'admin-grupos', texto: 'Grupos', icono: Users },
        { id: 'admin-categorias', texto: 'Categorías', icono: FolderTree },
        { id: 'admin-campanas', texto: 'Campañas', icono: Megaphone }
      );
    }
    return base;
  }, [esAdmin, user?.role]);

  const resultados = useMemo(() => {
    const q = sinAcentos(consulta.trim());
    const vistas = destinos
      .filter(d => !q || sinAcentos(d.texto).includes(q))
      .map(d => ({ tipo: 'vista', ...d }));

    let lista = tickets;
    if (!esAdmin) {
      const nombre = sinAcentos(user?.name);
      lista = tickets.filter(t => sinAcentos(t.creador) === nombre);
    }
    const encontrados = q
      ? lista.filter(t => [t.folio, t.asunto, t.creador, t.equipo, t.categoria, t.subcategoria, t.tecnico].some(c => sinAcentos(c).includes(q))).slice(0, 6)
      : lista.slice(0, 4);

    return [...vistas, ...encontrados.map(t => ({ tipo: 'ticket', id: `t-${t.folio}`, ticket: t }))];
  }, [consulta, destinos, tickets, esAdmin, user?.name]);

  useEffect(() => {
    if (abierto) {
      setConsulta('');
      setIndice(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]);

  useEffect(() => { setIndice(0); }, [consulta]);

  if (!abierto) return null;

  const elegir = (r) => {
    if (!r) return;
    onCerrar();
    if (r.tipo === 'vista') onIrAVista(r.id);
    else onAbrirTicket(r.ticket);
  };

  const alTeclear = (e) => {
    if (e.key === 'Escape') { onCerrar(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndice(i => Math.min(i + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndice(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); elegir(resultados[indice]); }
  };

  const indiceTickets = resultados.findIndex(r => r.tipo === 'ticket');

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 flex items-start justify-center pt-[12vh] px-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscador"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={alTeclear}
        className="w-full max-w-xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-700">
          <Search size={17} strokeWidth={1.75} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Busca una pantalla o un ticket (folio, asunto, equipo…)"
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder-slate-500 outline-none"
          />
          <kbd className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {resultados.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Sin resultados para “{consulta}”.</p>
          ) : resultados.map((r, i) => {
            const activo = i === indice;
            return (
              <React.Fragment key={r.id}>
                {i === 0 && r.tipo === 'vista' && <p className="px-3 pt-1 pb-1.5 text-xs font-medium text-slate-500">Ir a</p>}
                {i === indiceTickets && <p className="px-3 pt-3 pb-1.5 text-xs font-medium text-slate-500">Tickets</p>}
                <button
                  role="option"
                  aria-selected={activo}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => elegir(r)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm cursor-pointer ${activo ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
                >
                  {r.tipo === 'vista' ? (
                    <>
                      <r.icono size={16} strokeWidth={1.75} className="text-slate-400 shrink-0" />
                      <span className="flex-1">{r.texto}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-xs text-indigo-300 shrink-0">#{r.ticket.folio}</span>
                      <span className="flex-1 truncate">{r.ticket.asunto || r.ticket.subcategoria || 'Sin asunto'}</span>
                      <EtiquetaEstatus estatus={r.ticket.estatus} />
                    </>
                  )}
                  {activo && <CornerDownLeft size={14} strokeWidth={1.75} className="text-slate-400 shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Buscador;
