import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({ user, tickets = [], categorias = [], onIrANuevaSolicitud, onIrAEncuesta, estadisticasEncuestas = [] }) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const [categoriasBD, setCategoriasBD] = useState(Array.isArray(categorias) ? categorias : []);
  const [soloHoyGrafica, setSoloHoyGrafica] = useState(true); // Por defecto muestra las categorías de HOY

  // Si App.jsx no pasa 'categorias', las consultamos directamente de la BD
  useEffect(() => {
    if (Array.isArray(categorias) && categorias.length > 0) {
      setCategoriasBD(categorias);
    } else {
      fetch('/api/categorias')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setCategoriasBD(data);
        })
        .catch(err => console.error('Error al cargar categorías en Dashboard:', err));
    }
  }, [categorias]);

  // Obtener la fecha real de HOY en zona horaria de México (YYYY-MM-DD)
  const obtenerFechaHoyMexico = () => {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fechaHoyMX = obtenerFechaHoyMexico();

  // Función que valida si un ticket REALMENTE se hizo hoy en hora de México
  // (Corrige aquellos tickets hechos ayer después de las 6pm que guardaron fecha UTC adelantada)
  const esTicketDeHoy = (t) => {
    if (t.created_at) {
      const fechaCreacion = new Date(t.created_at);
      if (!isNaN(fechaCreacion.getTime())) {
        const mxDate = new Date(fechaCreacion.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        const yyyy = mxDate.getFullYear();
        const mm = String(mxDate.getMonth() + 1).padStart(2, '0');
        const dd = String(mxDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === fechaHoyMX;
      }
    }
    return String(t.fecha || '').slice(0, 10) === fechaHoyMX;
  };

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esCliente = rolUsuario === 'client' || rolUsuario === 'cliente';

  if (esCliente) {
    const misTickets = safeTickets.filter(t => 
      t.creador && user?.name && t.creador.toLowerCase() === user.name.toLowerCase()
    );

    const misTicketsAbiertos = misTickets.filter(t => t.estatus !== 'Cerrado' && t.estatus !== 'CERRADO');
    const ticketsCerradosCliente = misTickets.filter(t => t.estatus === 'Cerrado' || t.estatus === 'CERRADO');
    
    const ultimoTicketCerradoPendiente = ticketsCerradosCliente.slice().reverse().find(t => {
      return !estadisticasEncuestas.some(e => 
        (t.folio && e.folio && String(e.folio).trim() === String(ticket?.folio || t.folio).trim()) || 
        (t.id && e.ticket_id && Number(e.ticket_id) === Number(t.id))
      );
    });

    const ultimoTicketGeneral = misTickets.length > 0 ? misTickets[0] : null;
    
    const ultimaNota = ultimoTicketGeneral && Array.isArray(ultimoTicketGeneral.notas) && ultimoTicketGeneral.notas.length > 0  
      ? ultimoTicketGeneral.notas[ultimoTicketGeneral.notas.length - 1]  
      : null;

    return (
      <div className="animate-fade-in space-y-8">
        
        {/* Banner de Bienvenida y Asistencia Rápida */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/80 via-slate-900 to-blue-950 p-8 rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <span>✨</span> Centro de Asistencia Inteligente
            </div>
            <h1 className="text-3xl font-black text-white tracking-wide">
              ¡Hola, {user?.name || 'Cliente'}! 👋
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Utiliza nuestro asistente guiado para reportar tus incidencias rápidamente y recibir atención especializada en tiempo real.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto">
            <button 
              onClick={onIrANuevaSolicitud} 
              className="w-full md:w-auto px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/40 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀</span> Iniciar Solicitud / Reporte
            </button>
          </div>
        </div>

        {/* Cuadrícula de Contenido (Tickets y Actualizaciones) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Mis Tickets Abiertos */}
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📂</span> Mis Tickets Abiertos
                </h2>
                <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
                  {misTicketsAbiertos?.length || 0} activos
                </span>
              </div>

              {misTicketsAbiertos.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
                  <p className="text-slate-400 text-sm font-medium">No tienes solicitudes abiertas actualmente.</p>
                  <p className="text-slate-500 text-xs mt-1">Todo funciona con normalidad en tus servicios.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misTicketsAbiertos.map(t => (
                    <div key={t.folio} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-mono text-xs text-indigo-400 font-bold">#{t.folio}</p>
                        <p className="font-bold text-white text-sm mt-0.5">{t.asunto}</p>
                        <p className="text-xs text-slate-400 mt-1">Fecha: {t.fecha}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${t.colorEstatus || 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {t.estatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Última Actualización / Respuesta */}
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> Última Actualización
                </h2>
              </div>

              {!ultimoTicketGeneral ? (
                <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
                  <p className="text-slate-400 text-sm font-medium">Aún no has registrado ningún ticket.</p>
                </div>
              ) : (
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-indigo-300 font-mono">Folio #{ultimoTicketGeneral.folio}: {ultimoTicketGeneral.asunto}</span>
                    <span className="text-slate-500">{ultimoTicketGeneral.fecha}</span>
                  </div>
                  {ultimaNota ? (
                    <div>
                      <p className="text-xs text-indigo-400 font-semibold mb-1">Nota de {ultimaNota.autor} ({ultimaNota.fecha}):</p>
                      <p className="text-sm text-slate-200">{ultimaNota.texto}</p>
                    </div>
                  ) : ultimoTicketGeneral.resolucion ? (
                    <div>
                      <p className="text-xs text-emerald-400 font-semibold mb-1">Resolución:</p>
                      <p className="text-sm text-slate-200">{ultimoTicketGeneral.resolucion}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Tu ticket ha sido creado y está en espera de revisión por el equipo técnico.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerta de Encuesta Pendiente */}
        {ultimoTicketCerradoPendiente && (
          <div className="bg-gradient-to-r from-indigo-900/60 via-slate-800 to-slate-800 rounded-2xl shadow-xl p-6 border border-indigo-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">¿Tienes un momento?</h2>
              <p className="text-xs text-slate-300 mt-1">Comparte tu opinión sobre la atención recibida en tu ticket cerrado <strong className="text-indigo-300">#{ultimoTicketCerradoPendiente.folio}</strong>.</p>
            </div>
            <button onClick={onIrAEncuesta} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-colors text-sm cursor-pointer whitespace-nowrap">
              📋 Contestar Encuesta TI
            </button>
          </div>
        )}
      </div>
    );
  }

  // ========================================================================
  // VISTA DE SOPORTE / ADMINISTRADORES
  // ========================================================================
  const totalAbiertas = safeTickets.filter(t => t.estatus === 'Abierto' || t.estatus === 'ABIERTO').length;
  const totalEnProceso = safeTickets.filter(t => t.estatus === 'En Proceso' || t.estatus === 'EN PROCESO').length;
  
  // Tickets creados REALMENTE el día de hoy en hora de México
  const ticketsDeHoy = safeTickets.filter(esTicketDeHoy);

  // Construimos las barras de la gráfica basadas en las CATEGORÍAS activas de la BD
  const categoriasActivas = categoriasBD
    .filter(c => (c.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
    .map(c => c.nombre.toUpperCase());

  // Si no han cargado aún de la BD, aseguramos mostrar DISPOSITIVOS y TOUCHPOINT
  const listaNombresCategorias = categoriasActivas.length > 0 
    ? [...categoriasActivas] 
    : ['DISPOSITIVOS', 'TOUCHPOINT'];

  if (!listaNombresCategorias.includes('CENTINELA')) {
    listaNombresCategorias.push('CENTINELA');
  }

  const baseTicketsGrafica = soloHoyGrafica ? ticketsDeHoy : safeTickets;

  const datosCategorias = listaNombresCategorias.map(nombreCat => {
    const cantidad = baseTicketsGrafica.filter(t => {
      const catTicket = (t.categoria || '').toUpperCase();
      if (nombreCat === 'CENTINELA') {
        return t.tipo_solicitud === 'CENTINELA' || catTicket.includes('CENTINELA');
      }
      return catTicket === nombreCat && t.tipo_solicitud !== 'CENTINELA';
    }).length;

    return {
      nombre: nombreCat,
      tickets: cantidad
    };
  });

  // FILTRO SLA: Excluimos los tickets Centinela del cálculo del SLA
  const ticketsEstandar = safeTickets.filter(t => 
    t.tipo_solicitud !== 'CENTINELA' && 
    !(t.categoria || '').toUpperCase().includes('CENTINELA') &&
    !(t.grupo || '').toUpperCase().includes('CENTINELA')
  );

  const ticketsAtendidosSla = ticketsEstandar.filter(t => t.estatus && t.estatus.toLowerCase() !== 'abierto').length;
  const porcentajeSla = ticketsEstandar.length > 0  
    ? Math.round((ticketsAtendidosSla / ticketsEstandar.length) * 100)  
    : 100;

  const encuestasPorTecnico = (estadisticasEncuestas || []).reduce((acc, curr) => {
    if (!curr.tecnico) return acc;
    if (!acc[curr.tecnico]) {
      acc[curr.tecnico] = { suma: 0, cantidad: 0 };
    }
    const val = Number(curr.promedio) || Number(curr.calificacion) || 5;
    acc[curr.tecnico].suma += val;
    acc[curr.tecnico].cantidad += 1;
    return acc;
  }, {});

  const listaTecnicosRendimiento = Object.keys(encuestasPorTecnico).map(tec => {
    const datos = encuestasPorTecnico[tec];
    const prom = datos.cantidad > 0 ? (datos.suma / datos.cantidad).toFixed(1) : '5.0';
    return {
      nombre: tec,
      promedio: isNaN(prom) ? '5.0' : prom,
      evaluaciones: datos.cantidad
    };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Panel de Control de Inicio</h1>
        <button onClick={onIrANuevaSolicitud} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer flex items-center gap-2">
          <span>🚀</span> + NUEVA SOLICITUD
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">Solicitudes Abiertas</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{totalAbiertas}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(totalAbiertas * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">En Proceso</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{totalEnProceso}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(totalEnProceso * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">Tickets Hoy ({fechaHoyMX})</h3>
          <div className="flex justify-center items-center mb-4 px-2">
            <span className="text-5xl font-black text-white">
              {ticketsDeHoy.length}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(ticketsDeHoy.length * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 text-center">SLA de Respuesta</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-5xl font-black text-white">{porcentajeSla}%</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${porcentajeSla}%` }}></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wide">
              Distribución por Categoría
            </h2>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setSoloHoyGrafica(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${soloHoyGrafica ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setSoloHoyGrafica(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${!soloHoyGrafica ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Total
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosCategorias} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc'}} />
                <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wide">Indicador de Satisfacción por Asesor</h2>
          <p className="text-xs text-slate-400 mb-4">Promedio de encuestas obtenidas individualmente.</p>
          
          <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
            {listaTecnicosRendimiento.length === 0 ? (
              <p className="text-slate-500 italic text-center py-10">Aún no hay encuestas registradas para ningún asesor.</p>
            ) : (
              listaTecnicosRendimiento.map((tec, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
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
