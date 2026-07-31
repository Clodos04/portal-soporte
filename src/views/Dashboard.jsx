import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({ user, tickets = [], onIrANuevaSolicitud, onIrAEncuesta, estadisticasEncuestas = [] }) {
  const safeTickets = tickets || [];

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esCliente = rolUsuario === 'client' || rolUsuario === 'cliente';

  if (esCliente) {
    const misTicketsAbiertos = safeTickets.filter(t => t.estatus !== 'Cerrado');
    const ultimoTicket = safeTickets.length > 0 ? safeTickets[safeTickets.length - 1] : null;
    const ultimaNota = ultimoTicket && ultimoTicket.notas && ultimoTicket.notas.length > 0  
      ? ultimoTicket.notas[ultimoTicket.notas.length - 1]  
      : null;

    // Verificamos si el último ticket ya tiene encuesta registrada
    const yaEncuestado = ultimoTicket ? estadisticasEncuestas.some(e => e.folio === ultimoTicket.folio || e.ticket_id === ultimoTicket.id) : false;

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Panel de Inicio - Cliente</h1>
          <button onClick={onIrANuevaSolicitud} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded shadow font-medium transition-colors">
            + NUEVA SOLICITUD
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-indigo-300 mb-4">Mis Tickets Abiertos ({misTicketsAbiertos?.length || 0})</h2>
            {misTicketsAbiertos.length === 0 ? (
              <p className="text-slate-400 italic">No tienes solicitudes abiertas actualmente.</p>
            ) : (
              <div className="space-y-3">
                {misTicketsAbiertos.map(t => (
                  <div key={t.folio} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">#{t.folio} - {t.asunto}</p>
                      <p className="text-xs text-slate-400">Fecha: {t.fecha}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${t.colorEstatus || 'bg-green-600'}`}>
                      {t.estatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-indigo-300 mb-4">Última Actualización / Respuesta</h2>
            {!ultimoTicket ? (
              <p className="text-slate-400 italic">Aún no has registrado ningún ticket.</p>
            ) : (
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 space-y-2">
                <div className="flex justify-between text-xs text-slate-400 border-b border-slate-600 pb-2">
                  <span className="font-bold text-white">Folio #{ultimoTicket.folio}: {ultimoTicket.asunto}</span>
                  <span>{ultimoTicket.fecha}</span>
                </div>
                {ultimaNota ? (
                  <div>
                    <p className="text-xs text-indigo-300 font-semibold mb-1">Nota de {ultimaNota.autor} ({ultimaNota.fecha}):</p>
                    <p className="text-sm text-slate-200">{ultimaNota.texto}</p>
                  </div>
                ) : ultimoTicket.resolucion ? (
                  <div>
                    <p className="text-xs text-green-300 font-semibold mb-1">Resolución:</p>
                    <p className="text-sm text-slate-200">{ultimoTicket.resolucion}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Tu ticket ha sido creado y está en espera de revisión por el equipo técnico.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {ultimoTicket && (ultimoTicket.estatus === 'Cerrado' || ultimoTicket.estatus === 'CERRADO') && !yaEncuestado && (
          <div className="bg-gradient-to-r from-indigo-900/60 to-slate-800 rounded-xl shadow-lg p-6 border border-indigo-500/30 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">¿Tienes un momento?</h2>
              <p className="text-xs text-slate-300 mt-1">Comparte tu opinión sobre la atención recibida por parte del área de soporte técnico.</p>
            </div>
            <button onClick={onIrAEncuesta} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-colors text-sm">
              📋 Contestar Encuesta TI
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA DE INICIO PARA SOPORTE TI / TECNICOS / ADMINISTRADORES ---
  const totalAbiertas = safeTickets.filter(t => t.estatus === 'Abierto').length;
  const totalEnProceso = safeTickets.filter(t => t.estatus === 'En Proceso').length;

  const countSoporte = safeTickets.filter(t => t.grupo?.toLowerCase().includes('soporte')).length;
  const countDesarrollo = safeTickets.filter(t => t.grupo?.toLowerCase().includes('desarrollo')).length;
  const countCalidad = safeTickets.filter(t => t.grupo?.toLowerCase().includes('calidad') || t.grupo?.toLowerCase().includes('estadistico')).length;
  const countAtencion = safeTickets.filter(t => t.grupo?.toLowerCase().includes('atencion') || t.grupo?.toLowerCase().includes('telefonia')).length;

  const datosGrupos = [
    { nombre: 'Soporte Técnico', tickets: countSoporte },
    { nombre: 'Desarrollo', tickets: countDesarrollo },
    { nombre: 'Calidad', tickets: countCalidad },
    { nombre: 'Atención a Clientes', tickets: countAtencion },
  ];

  const ticketsAtendidosSla = safeTickets.filter(t => t.tecnico && t.tecnico !== 'Sin Asignar').length;
  const porcentajeSla = safeTickets.length > 0  
    ? Math.round((ticketsAtendidosSla / safeTickets.length) * 100)  
    : 98;

  const encuestasPorTecnico = (estadisticasEncuestas || []).reduce((acc, curr) => {
    if (!acc[curr.tecnico]) {
      acc[curr.tecnico] = { suma: 0, cantidad: 0 };
    }
    acc[curr.tecnico].suma += curr.promedio;
    acc[curr.tecnico].cantidad += 1;
    return acc;
  }, {});

  const listaTecnicosRendimiento = Object.keys(encuestasPorTecnico).map(tec => ({
    nombre: tec,
    promedio: (encuestasPorTecnico[tec].suma / encuestasPorTecnico[tec].cantidad).toFixed(1),
    evaluaciones: encuestasPorTecnico[tec].cantidad
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Panel de Control de Inicio</h1>
        <button onClick={onIrANuevaSolicitud} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded shadow font-medium transition-colors">
          + NUEVA SOLICITUD
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">Solicitudes Abiertas</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{totalAbiertas}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(totalAbiertas * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">En Proceso</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{totalEnProceso}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(totalEnProceso * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">Tickets Hoy</h3>
          <div className="flex justify-center items-center mb-4 px-2">
            <span className="text-5xl font-black text-white">
              {safeTickets.filter(t => t.fecha === new Date().toISOString().split('T')[0]).length}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '50%' }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">SLA de Respuesta</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{porcentajeSla}%</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${porcentajeSla}%` }}></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-slate-300 mb-6 uppercase tracking-wide">Distribución por Grupo</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrupos} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc'}} />
                <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wide">Indicador de Satisfacción por Asesor</h2>
          <p className="text-xs text-slate-400 mb-4">Promedio de encuestas obtenidas individualmente.</p>
          
          <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
            {listaTecnicosRendimiento.length === 0 ? (
              <p className="text-slate-500 italic text-center py-10">Aún no hay encuestas registradas para ningún asesor.</p>
            ) : (
              listaTecnicosRendimiento.map((tec, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white">{tec.nombre}</h3>
                    <p className="text-xs text-slate-400">Evaluaciones recibidas: {tec.evaluaciones}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-green-400">{tec.promedio}</span>
                    <span className="text-yellow-400 text-lg ml-1">⭐</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
