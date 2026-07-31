import React, { useState } from 'react';

function SolicitudesView({ 
  tickets = [], 
  activeColumns = [], 
  columnLabels = {}, 
  user, 
  onOpenCustomizer, 
  onOpenNotes, 
  onNuevaSolicitud, 
  onEditarTicket,
  onIrAEncuestaSpecific,
  estadisticasEncuestas = [] 
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('activos');

  const ticketsFiltrados = tickets.filter(t => {
    const estatusLower = t.estatus ? t.estatus.toLowerCase() : '';
    
    const esCerrado = estatusLower.includes('cerrado');
    if (filtroEstatus === 'activos' && esCerrado) return false;
    if (filtroEstatus === 'cerrados' && !esCerrado) return false;

    const query = busqueda.toLowerCase();
    return (
      (t.folio && t.folio.toLowerCase().includes(query)) ||
      (t.asunto && t.asunto.toLowerCase().includes(query)) ||
      (t.creador && t.creador.toLowerCase().includes(query)) ||
      (t.estatus && t.estatus.toLowerCase().includes(query))
    );
  });

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <h1 className="text-3xl font-light text-white tracking-wide uppercase">Listado de Solicitudes</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión y control de tickets de soporte técnico</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button 
            onClick={onOpenCustomizer}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 border border-slate-600"
          >
            ⚙️ Columnas
          </button>
          
          <button 
            onClick={onNuevaSolicitud}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2"
          >
            + NUEVA SOLICITUD
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => setFiltroEstatus('activos')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filtroEstatus === 'activos' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              Abiertos / En Proceso
            </button>
            <button 
              onClick={() => setFiltroEstatus('cerrados')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filtroEstatus === 'cerrados' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              Cerrados
            </button>
          </div>

          <div className="w-full md:w-72">
            <input 
              type="text"
              placeholder="Buscar por folio, asunto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
          <span>Mostrando registros de estatus: <strong className="text-white uppercase">{filtroEstatus}</strong></span>
          <span>Total: {ticketsFiltrados.length} registros</span>
        </div>

        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Estatus</th>
                {activeColumns.map(colKey => (
                  <th key={colKey} className="px-4 py-3">{columnLabels[colKey] || colKey}</th>
                ))}
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 4} className="px-4 py-8 text-center text-slate-500 italic">
                    No hay solicitudes registradas en esta vista o que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                ticketsFiltrados.map((ticket) => {
                  const yaEncuestado = estadisticasEncuestas.some(e => e.folio === ticket.folio || e.ticket_id === ticket.id);

                  return (
                    <tr key={ticket.folio} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">#{ticket.folio}</td>

                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => onOpenNotes(ticket.folio)}
                          className="relative p-2 bg-slate-900/60 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700 inline-flex items-center justify-center"
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

                      {activeColumns.map(colKey => (
                        <td key={colKey} className="px-4 py-3 text-slate-300 max-w-xs truncate">
                          {ticket[colKey] || '—'}
                        </td>
                      ))}

                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button 
                            onClick={() => onEditarTicket(ticket)}
                            className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-indigo-500/30"
                          >
                            Gestionar
                          </button>

                          {(ticket.estatus === 'Cerrado' || ticket.estatus === 'CERRADO') && user?.role === 'client' && (
                            yaEncuestado ? (
                              <span className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg font-semibold text-xs border border-slate-600">
                                Calificado ⭐
                              </span>
                            ) : (
                              <button 
                                onClick={() => onIrAEncuestaSpecific(ticket)}
                                className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-green-500/30"
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
