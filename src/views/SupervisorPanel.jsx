import React, { useState, useEffect } from 'react';

function SupervisorPanel({ user }) {
  const [tickets, setTickets] = useState([]);
  const [encuestasData, setEncuestasData] = useState({ estadisticas: { promedio: 0, total: 0 }, historial: [] });
  const [kpiTiempos, setKpiTiempos] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroCampana, setFiltroCampana] = useState('TODAS');
  const [filtroTecnico, setFiltroTecnico] = useState('TODOS');
  const [busquedaFolio, setBusquedaFolio] = useState('');

  const [encuestaModal, setEncuestaModal] = useState(null);

  useEffect(() => {
    const cargarDatosSupervisor = async () => {
      try {
        setLoading(true);
        const [resTickets, resEncuestas, resTiempos, resCampanas, resUsuarios] = await Promise.all([
          fetch('/api/tickets').then(res => res.json()),
          fetch('/api/encuestas/reporte').then(res => res.json()),
          fetch('/api/kpis/tiempos').then(res => res.json()),
          fetch('/api/campanas').then(res => res.json()),
          fetch('/api/usuarios').then(res => res.json())
        ]);

        const ticketsFormateados = (resTickets || []).map(t => {
          let notas = t.notas;
          if (typeof notas === 'string') {
            try { notas = JSON.parse(notas); } catch (e) { notas = []; }
          }
          return { ...t, notas: notas || [] };
        });

        setTickets(ticketsFormateados);
        setEncuestasData(resEncuestas || { estadisticas: { promedio: 0, total: 0 }, historial: [] });
        setKpiTiempos(resTiempos || []);
        setCampanas(resCampanas || []);
        
        const techs = (resUsuarios || []).filter(u => u.nivel === 'TECNICO' || u.nivel === 'TECNICO SUPERVISOR' || u.nivel === 'ADMINISTRADOR');
        setTecnicos(techs);
      } catch (error) {
        console.error('Error cargando datos del panel de supervisor:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosSupervisor();
  }, []);

  const ticketsFiltrados = tickets.filter(t => {
    const cumpleCampana = filtroCampana === 'TODAS' || t.campana === filtroCampana;
    const cumpleTecnico = filtroTecnico === 'TODOS' || t.tecnico === filtroTecnico;
    const cumpleFolio = (t.folio || '').toLowerCase().includes(busquedaFolio.toLowerCase()) || 
                        (t.asunto || '').toLowerCase().includes(busquedaFolio.toLowerCase());
    return cumpleCampana && cumpleTecnico && cumpleFolio;
  });

  const totalTickets = ticketsFiltrados.length;
  const cerradosCount = ticketsFiltrados.filter(t => t.estatus === 'Cerrado' || t.estatus === 'CERRADO').length;
  const abiertosCount = ticketsFiltrados.filter(t => t.estatus === 'Abierto' || t.estatus === 'En Proceso').length;

  const idsFiltrados = new Set(ticketsFiltrados.map(t => t.id));
  const tiemposFiltrados = kpiTiempos.filter(k => idsFiltrados.has(k.id));
  
  let tiempoPromedioMinutos = 0;
  if (tiemposFiltrados.length > 0) {
    const sumaMinutos = tiemposFiltrados.reduce((acc, curr) => acc + (Number(curr.minutos_resolucion) || 0), 0);
    tiempoPromedioMinutos = Math.round(sumaMinutos / tiemposFiltrados.length);
  }

  const historialEncuestasFiltrado = encuestasData.historial.filter(e => idsFiltrados.has(e.ticket_id) || idsFiltrados.has(e.folio));
  
  // Cálculo exacto del CSAT sincronizado con el promedio real de las encuestas
  let promedioCSAT = 0;
  if (historialEncuestasFiltrado.length > 0) {
    const sumaCalif = historialEncuestasFiltrado.reduce((acc, curr) => acc + (Number(curr.promedio) || Number(curr.calificacion) || 0), 0);
    promedioCSAT = (sumaCalif / historialEncuestasFiltrado.length).toFixed(1);
  } else if (encuestasData.estadisticas?.promedio) {
    promedioCSAT = encuestasData.estadisticas.promedio;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 text-white text-lg">
        Cargando métricas y panel de supervisor...
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200 pb-12">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide uppercase flex items-center gap-3">
            📊 Panel de Control y Supervisión
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitoreo en tiempo real de KPIs, SLAs, cargas de trabajo y satisfacción del cliente (CSAT).
          </p>
        </div>
        <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-indigo-400">
          Supervisor: {user?.nombre || user?.name || 'Administrador'}
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-lg">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Filtrar por Campaña:</label>
          <select 
            value={filtroCampana} 
            onChange={(e) => setFiltroCampana(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
          >
            <option value="TODAS">TODAS LAS CAMPAÑAS</option>
            {campanas.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Filtrar por Técnico / Asesor:</label>
          <select 
            value={filtroTecnico} 
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
          >
            <option value="TODOS">TODOS LOS TÉCNICOS</option>
            {tecnicos.map((t, idx) => (
              <option key={idx} value={t.username}>{t.nombre} {t.paterno} ({t.username})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Buscar por Folio o Asunto:</label>
          <input 
            type="text" 
            placeholder="Ej. TICKET-001 o impresora..." 
            value={busquedaFolio}
            onChange={(e) => setBusquedaFolio(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Tickets Filtrados</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-white">{totalTickets}</span>
            <span className="text-xs text-indigo-400 font-semibold">{abiertosCount} abiertos</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Tiempo Promedio Resolución</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-green-400 font-mono">
              {tiempoPromedioMinutos} <span className="text-sm font-normal text-slate-400">min</span>
            </span>
            <span className="text-xs text-slate-400">({(tiempoPromedioMinutos / 60).toFixed(1)} hrs aprox)</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Tickets Cerrados</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-blue-400">{cerradosCount}</span>
            <span className="text-xs text-slate-400">{totalTickets > 0 ? Math.round((cerradosCount / totalTickets) * 100) : 0}% del total</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase">Satisfacción Cliente (CSAT)</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-yellow-400">
              {promedioCSAT} <span className="text-lg text-slate-400">/ 5.0</span>
            </span>
            <span className="text-xs text-slate-400">{historialEncuestasFiltrado.length} encuestas</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            📋 Auditoría de Tickets y Resultados de Encuestas
          </h2>
          <span className="text-xs text-slate-400">Mostrando {ticketsFiltrados.length} registros</span>
        </div>

        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Campaña / Grupo</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3 text-center">Calificación CSAT</th>
                <th className="px-4 py-3 text-center">Acciones / Encuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 italic">
                    No se encontraron tickets con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ticketsFiltrados.map((t) => {
                  const encuestaAsociada = encuestasData.historial.find(e => e.ticket_id === t.id || e.folio === t.folio);
                  const califTicket = encuestaAsociada ? (Number(encuestaAsociada.promedio) || Number(encuestaAsociada.calificacion) || 0).toFixed(1) : null;

                  return (
                    <tr key={t.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-300">{t.folio}</td>
                      <td className="px-4 py-3 text-white font-medium">{t.asunto}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className="bg-slate-900 px-2 py-1 rounded text-xs border border-slate-700">{t.campana || 'N/D'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{t.tecnico || 'Sin asignar'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          t.estatus === 'Cerrado' || t.estatus === 'CERRADO' ? 'bg-blue-600/30 text-blue-400' : 
                          t.estatus === 'En Proceso' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-green-600/30 text-green-400'
                        }`}>
                          {t.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {encuestaAsociada ? (
                          <span className="font-extrabold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full border border-yellow-400/30">
                            ★ {califTicket} / 5
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs italic">Pendiente / Sin responder</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {encuestaAsociada ? (
                          <button
                            onClick={() => setEncuestaModal({ ...encuestaAsociada, ticketActual: t })}
                            className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition-colors border border-indigo-500/40"
                          >
                            Ver Comentarios
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {encuestaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-200 p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                💬 Resultados de Encuesta - {encuestaModal.folio}
              </h3>
              <button onClick={() => setEncuestaModal(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 space-y-1">
                <p><strong className="text-slate-400">Cliente:</strong> {encuestaModal.cliente_username}</p>
                <p><strong className="text-slate-400">Técnico Atendió:</strong> {encuestaModal.tecnico || 'N/D'}</p>
                <p><strong className="text-slate-400">Categoría:</strong> {encuestaModal.categoria || 'N/D'}</p>
                <p><strong className="text-slate-400">Calificación Asignada:</strong> <span className="text-yellow-400 font-bold text-base">★ {(Number(encuestaModal.promedio) || Number(encuestaModal.calificacion) || 0).toFixed(1)} de 5</span></p>
                <p><strong className="text-slate-400">Fecha de Respuesta:</strong> {new Date(encuestaModal.fecha_respuesta).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Comentarios o Nota del Ticket:</label>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-slate-200 italic min-h-[80px]">
                  {encuestaModal.comentarios && encuestaModal.comentarios.trim() !== '' 
                    ? `"${encuestaModal.comentarios}"` 
                    : (encuestaModal.ticketActual?.resolucion 
                        ? `"${encuestaModal.ticketActual.resolucion}"` 
                        : <span className="text-slate-500 not-italic">El cliente no dejó comentarios escritos.</span>)}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-700">
              <button 
                onClick={() => setEncuestaModal(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SupervisorPanel;
