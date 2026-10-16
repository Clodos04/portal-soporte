import React, { useState, useEffect } from 'react';

function SolicitudesView({ 
  tickets = [], 
  categorias = [], 
  activeColumns = [], 
  columnLabels = {}, 
  user, 
  onOpenCustomizer, 
  onOpenNotes, 
  onNuevaSolicitud, 
  onEditarTicket,
  onAbrirChat,
  onIrAEncuestaSpecific,
  estadisticasEncuestas = [] 
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('activos');
  const [, setTick] = useState(0);

  // Actualizar el semáforo de SLA cada minuto automáticamente
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esCliente = rolUsuario === 'client' || rolUsuario === 'cliente';

  const ticketsBase = esCliente 
    ? tickets.filter(t => t.creador && user?.name && t.creador.toLowerCase() === user.name.toLowerCase())
    : tickets;

  const estaSinAsignar = (t) => {
    const asig = (t.tecnico || t.asignado || t.responsable || '').trim().toLowerCase();
    return !asig || asig === 'sin asignar' || asig === 'pendiente' || asig === 'ninguno' || asig === '—';
  };

  const esMiTicket = (t) => {
    const asig = (t.tecnico || t.asignado || t.responsable || '').trim().toLowerCase();
    const miNombre = (user?.name || '').trim().toLowerCase();
    const miUser = (user?.username || '').trim().toLowerCase();
    return (miNombre && asig.includes(miNombre)) || (miUser && asig.includes(miUser));
  };

  const conteoActivos = ticketsBase.filter(t => !(t.estatus || '').toLowerCase().includes('cerrado')).length;
  const conteoSinAsignar = ticketsBase.filter(t => !(t.estatus || '').toLowerCase().includes('cerrado') && estaSinAsignar(t)).length;
  const conteoMios = ticketsBase.filter(t => !(t.estatus || '').toLowerCase().includes('cerrado') && esMiTicket(t)).length;
  const conteoCerrados = ticketsBase.filter(t => (t.estatus || '').toLowerCase().includes('cerrado')).length;

  // Cálculo del Semáforo de SLA basado en la categoría seleccionada
  const calcularSLA = (ticket) => {
    const estatusLower = (ticket.estatus || '').toLowerCase();
    const esCerrado = estatusLower.includes('cerrado');
    const fechaInicioStr = ticket.created_at || ticket.fecha;

    if (!fechaInicioStr) {
      return { texto: '—', color: 'bg-slate-700/50 text-slate-400 border-slate-600', icono: '⏱️' };
    }

    const inicio = new Date(fechaInicioStr);
    if (isNaN(inicio.getTime())) {
      return { texto: ticket.fecha || '—', color: 'bg-slate-700/50 text-slate-400 border-slate-600', icono: '📅' };
    }

    const fin = (esCerrado && ticket.updated_at) ? new Date(ticket.updated_at) : new Date();
    const diffMs = Math.max(0, fin - inicio);
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = diffMin / 60;

    let tiempoStr = '';
    if (diffMin < 60) {
      tiempoStr = `${diffMin}m`;
    } else if (diffHrs < 24) {
      const h = Math.floor(diffHrs);
      const m = diffMin % 60;
      tiempoStr = `${h}h ${m}m`;
    } else {
      const d = Math.floor(diffHrs / 24);
      const h = Math.floor(diffHrs % 24);
      tiempoStr = `${d}d ${h}h`;
    }

    if (esCerrado) {
      return {
        texto: `Resuelto (${tiempoStr})`,
        color: 'bg-slate-800 text-slate-400 border-slate-700',
        icono: '✔️'
      };
    }

    // Buscar el SLA configurado en la categoría
    const catObj = categorias.find(c => c.nombre && ticket.categoria && c.nombre.toUpperCase() === ticket.categoria.toUpperCase());
    const slaLimite = Number(catObj?.sla) || Number(ticket.sla) || 24;

    if (diffHrs < slaLimite * 0.5) {
      return {
        texto: `${tiempoStr} • En tiempo`,
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icono: '🟢'
      };
    } else if (diffHrs < slaLimite) {
      return {
        texto: `${tiempoStr} • Por vencer`,
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icono: '🟡'
      };
    } else {
      return {
        texto: `${tiempoStr} • Vencido`,
        color: 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse',
        icono: '🔴'
      };
    }
  };

  const ticketsFiltrados = ticketsBase.filter(t => {
    const estatusLower = t.estatus ? t.estatus.toLowerCase() : '';
    const esCerrado = estatusLower.includes('cerrado');

    if (filtroEstatus === 'activos' && esCerrado) return false;
    if (filtroEstatus === 'cerrados' && !esCerrado) return false;
    if (filtroEstatus === 'sin_asignar' && (esCerrado || !estaSinAsignar(t))) return false;
    if (filtroEstatus === 'mios' && (esCerrado || !esMiTicket(t))) return false;

    const query = busqueda.toLowerCase().trim();
    if (!query) return true;

    return (
      (t.folio && String(t.folio).toLowerCase().includes(query)) ||
      (t.asunto && t.asunto.toLowerCase().includes(query)) ||
      (t.creador && t.creador.toLowerCase().includes(query)) ||
      (t.solicitante && t.solicitante.toLowerCase().includes(query)) ||
      (t.estatus && t.estatus.toLowerCase().includes(query)) ||
      (t.equipo && t.equipo.toLowerCase().includes(query)) ||
      (t.campana && t.campana.toLowerCase().includes(query)) ||
      (t.categoria && t.categoria.toLowerCase().includes(query)) ||
      (t.subcategoria && t.subcategoria.toLowerCase().includes(query)) ||
      (t.tecnico && t.tecnico.toLowerCase().includes(query)) ||
      (t.asignado && t.asignado.toLowerCase().includes(query))
    );
  });

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <h1 className="text-3xl font-light text-white tracking-wide uppercase">Listado de Solicitudes</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión y control de tickets en tiempo real • Clodos TI Assist</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button 
            onClick={onOpenCustomizer}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 border border-slate-600 cursor-pointer"
          >
            ⚙️ Columnas
          </button>
          
          <button 
            onClick={onNuevaSolicitud}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 cursor-pointer"
          >
            + NUEVA SOLICITUD
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 border-b border-slate-700 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setFiltroEstatus('activos')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${filtroEstatus === 'activos' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>🔥 Abiertos / En Proceso</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'activos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {conteoActivos}
              </span>
            </button>

            {!esCliente && (
              <>
                <button 
                  onClick={() => setFiltroEstatus('sin_asignar')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${filtroEstatus === 'sin_asignar' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>🚨 Sin Asignar</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'sin_asignar' ? 'bg-black/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
                    {conteoSinAsignar}
                  </span>
                </button>

                <button 
                  onClick={() => setFiltroEstatus('mios')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${filtroEstatus === 'mios' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>👤 Mis Tickets</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'mios' ? 'bg-black/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                    {conteoMios}
                  </span>
                </button>
              </>
            )}

            <button 
              onClick={() => setFiltroEstatus('cerrados')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${filtroEstatus === 'cerrados' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>🔒 Cerrados</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'cerrados' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {conteoCerrados}
              </span>
            </button>
          </div>

          <div className="relative w-full lg:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              🔍
            </span>
            <input 
              type="text"
              placeholder="Folio, equipo, campaña, usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
          <span>
            Filtro activo: <strong className="text-white uppercase">{filtroEstatus.replace('_', ' ')}</strong>
            {busqueda && <> • Buscando: <strong className="text-green-400">"{busqueda}"</strong></>}
          </span>
          <span>Mostrando: <strong className="text-white">{ticketsFiltrados.length}</strong> registros</span>
        </div>

        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3">SLA / Tiempo</th>
                {activeColumns.map(colKey => (
                  <th key={colKey} className="px-4 py-3">{columnLabels[colKey] || colKey}</th>
                ))}
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 5} className="px-4 py-8 text-center text-slate-500 italic">
                    No hay solicitudes registradas en esta bandeja o que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                ticketsFiltrados.map((ticket) => {
                  const yaEncuestado = estadisticasEncuestas.some(e => 
                    (ticket.folio && e.folio && String(e.folio).trim() === String(ticket.folio).trim()) || 
                    (ticket.id && e.ticket_id && Number(e.ticket_id) === Number(ticket.id))
                  );

                  const estatusLower = (ticket.estatus || '').toLowerCase();
                  const esActivo = estatusLower === 'abierto' || estatusLower === 'en proceso';
                  const infoSLA = calcularSLA(ticket);

                  return (
                    <tr key={ticket.folio} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">#{ticket.folio}</td>

                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => onOpenNotes(ticket.folio)}
                          className="relative p-2 bg-slate-900/60 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700 inline-flex items-center justify-center cursor-pointer"
                          title="Ver Notas"
                        >
                          📄
                          {ticket.notas && ticket.notas.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                              {ticket.notas.length}
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block text-white shadow-sm ${ticket.colorEstatus || 'bg-green-600'}`}>
                          {ticket.estatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border ${infoSLA.color}`}>
                          <span>{infoSLA.icono}</span>
                          <span>{infoSLA.texto}</span>
                        </span>
                      </td>

                      {activeColumns.map(colKey => (
                        <td key={colKey} className="px-4 py-3 text-slate-300 max-w-xs truncate">
                          {ticket[colKey] || '—'}
                        </td>
                      ))}

                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {esActivo && onAbrirChat && (
                            <button 
                              onClick={() => onAbrirChat(ticket.folio)}
                              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-emerald-500/30 cursor-pointer"
                              title="Abrir Chat en Vivo"
                            >
                              💬 Chat
                            </button>
                          )}

                          <button 
                            onClick={() => onEditarTicket(ticket)}
                            className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-indigo-500/30 cursor-pointer"
                          >
                            {esCliente ? 'Ver' : 'Gestionar'}
                          </button>

                          {(ticket.estatus === 'Cerrado' || ticket.estatus === 'CERRADO') && user?.role === 'client' && (
                            yaEncuestado ? (
                              <span className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg font-semibold text-xs border border-slate-600">
                                Calificado ⭐
                              </span>
                            ) : (
                              <button 
                                onClick={() => onIrAEncuestaSpecific(ticket)}
                                className="px-3.5 py-2 bg-slate-800/80 hover:bg-green-600/20 text-slate-300 hover:text-green-300 rounded-xl text-xs font-medium border border-slate-700/60 hover:border-green-500/40 transition-all cursor-pointer"
                              >
                                Encuesta
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SolicitudesView;
