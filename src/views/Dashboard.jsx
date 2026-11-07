import React, { useState, useEffect } from 'react';
import { EstadoVacio } from '../components/Estados';
import EtiquetaEstatus from '../components/EtiquetaEstatus';
import { Plus, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';
import { calcularSLA, esTicketCerrado } from '../utils/sla';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({ user, tickets = [], categorias = [], onIrASolicitudes, grupos = [], onIrANuevaSolicitud, onIrAEncuesta, onIrABuzon, estadisticasEncuestas = [], onTomarTicket, onAbrirChat }) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const [gruposBD, setGruposBD] = useState(Array.isArray(grupos) ? grupos : []);
  const [soloHoyGrafica, setSoloHoyGrafica] = useState(false);

  // CORREGIDO: Evita bucles infinitos de red al comparar o inicializar grupos
  useEffect(() => {
    if (Array.isArray(grupos) && grupos.length > 0) {
      setGruposBD(grupos);
    }
  }, [grupos]);

  const obtenerFechaHoyMexico = () => {
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fechaHoyMX = obtenerFechaHoyMexico();

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

  const normalizarTexto = (str) => {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
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
        (t.folio && e.folio && String(e.folio).trim() === String(t.folio).trim()) || 
        (t.id && e.ticket_id && Number(e.ticket_id) === Number(t.id))
      );
    });

    const ultimoTicketGeneral = misTickets.length > 0 ? misTickets[0] : null;
    const ultimaNota = ultimoTicketGeneral && Array.isArray(ultimoTicketGeneral.notas) && ultimoTicketGeneral.notas.length > 0  
      ? ultimoTicketGeneral.notas[ultimoTicketGeneral.notas.length - 1]  
      : null;

    return (
      <div className="animate-fade-in space-y-8">
        <div className="relative overflow-hidden bg-slate-900 p-8 rounded-2xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium">
              Centro de Asistencia Inteligente
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">¡Hola, {(user?.name || 'Cliente').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase())}! </h1>
            <p className="text-slate-300 text-sm max-w-xl">Utiliza nuestro asistente guiado para reportar tus incidencias rápidamente y recibir atención especializada en tiempo real.</p>
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <button onClick={onIrANuevaSolicitud} className="w-full md:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
              Iniciar Solicitud / Reporte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">Mis Tickets Abiertos</h2>
                <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-500/30">{misTicketsAbiertos?.length || 0} activos</span>
              </div>
              {misTicketsAbiertos.length === 0 ? (
                <EstadoVacio compacto icono={CheckCircle2} titulo="No tienes solicitudes abiertas" descripcion="Todo funciona con normalidad en tus servicios." />
              ) : (
                <div className="space-y-3">
                  {misTicketsAbiertos.map(t => (
                    <div key={t.folio} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-mono text-xs text-indigo-400 font-bold">#{t.folio}</p>
                        <p className="font-bold text-white text-sm mt-0.5">{t.asunto}</p>
                        <p className="text-xs text-slate-400 mt-1">Fecha: {t.fecha}</p>
                      </div>
                      <EtiquetaEstatus estatus={t.estatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">Última Actualización</h2>
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

        {/* TARJETA DIRECTA AL BUZÓN DE SUGERENCIAS Y REPORTE DE BUGS */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">
              Buzón de Sugerencias y Reporte de Errores del Portal
            </h2>
            <p className="text-xs text-slate-300">
              ¿Notaste algún fallo en la página o tienes alguna idea para mejorar el sistema? Envíanos tu comentario directo.
            </p>
          </div>
          {onIrABuzon && (
            <button
              onClick={onIrABuzon}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg transition-colors text-xs cursor-pointer whitespace-nowrap"
            >
              Abrir Buzón de Feedback
            </button>
          )}
        </div>

        {ultimoTicketCerradoPendiente && (
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">¿Tienes un momento?</h2>
              <p className="text-xs text-slate-300 mt-1">Comparte tu opinión sobre la atención recibida en tu ticket cerrado <strong className="text-indigo-300">#{ultimoTicketCerradoPendiente.folio}</strong>.</p>
            </div>
            <button onClick={onIrAEncuesta} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-colors text-sm cursor-pointer whitespace-nowrap">
              Contestar Encuesta TI
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
  const ticketsDeHoy = safeTickets.filter(esTicketDeHoy);

  const ticketsSinAsignar = safeTickets.filter(t => 
    (t.estatus !== 'Cerrado' && t.estatus !== 'CERRADO') && 
    (!t.tecnico || t.tecnico === 'Sin Asignar')
  );

  const listaNombresGrupos = gruposBD.length > 0 ? gruposBD : [
    'BASES E INFORMES', 'CENTINELA', 'CLAVES', 'CONTROL ESTADISTICO',
    'DESARROLLO DE SOFTWARE', 'FOLIOS BIT', 'MANTENIMIENTO',
    'SOPORTE TECNICO', 'TELEFONIA, COMUNICACIONES Y REDES', 'TI'
  ];

  const baseTicketsGrafica = soloHoyGrafica ? ticketsDeHoy : safeTickets;

  const datosGrupos = listaNombresGrupos.map(nombreGrupo => {
    const grupoNorm = normalizarTexto(nombreGrupo);
    const cantidad = baseTicketsGrafica.filter(t => {
      const ticketGrupoNorm = normalizarTexto(t.grupo);
      if (grupoNorm === 'CENTINELA') {
        return t.tipo_solicitud === 'CENTINELA' || ticketGrupoNorm === 'CENTINELA';
      }
      return ticketGrupoNorm === grupoNorm;
    }).length;
    return { nombre: nombreGrupo, tickets: cantidad };
  });

  const ticketsEstandar = safeTickets.filter(t => 
    t.tipo_solicitud !== 'CENTINELA' && 
    !(t.categoria || '').toUpperCase().includes('CENTINELA') &&
    !(t.grupo || '').toUpperCase().includes('CENTINELA')
  );

  // SLA real: cerrados dentro de su tiempo / (cerrados + abiertos ya vencidos)
  const estadosSla = safeTickets.map(t => calcularSLA(t, categorias));
  const slaVencidos = estadosSla.filter(e => e.nivel === 'vencido').length;
  const slaPorVencer = estadosSla.filter(e => e.nivel === 'riesgo' && e.critico).length;
  const cerradosEnSla = estadosSla.filter(e => e.nivel === 'cerrado' && e.cumplido).length;
  const cerradosTotal = estadosSla.filter(e => e.nivel === 'cerrado').length;
  const baseCumplimiento = cerradosTotal + slaVencidos;
  const porcentajeSla = baseCumplimiento > 0 ? Math.round((cerradosEnSla / baseCumplimiento) * 100) : null;

  const encuestasPorTecnico = (estadisticasEncuestas || []).reduce((acc, curr) => {
    if (!curr.tecnico) return acc;
    if (!acc[curr.tecnico]) acc[curr.tecnico] = { suma: 0, cantidad: 0 };
    const val = Number(curr.promedio) || Number(curr.calificacion) || 0;
    if (!val) return acc; // una encuesta sin calificación válida no cuenta como un 5
    acc[curr.tecnico].suma += val;
    acc[curr.tecnico].cantidad += 1;
    return acc;
  }, {});

  const listaTecnicosRendimiento = Object.keys(encuestasPorTecnico).map(tec => {
    const datos = encuestasPorTecnico[tec];
    const prom = datos.cantidad > 0 ? (datos.suma / datos.cantidad).toFixed(1) : '5.0';
    return { nombre: tec, promedio: isNaN(prom) ? '5.0' : prom, evaluaciones: datos.cantidad };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Panel de Control de Inicio</h1>
        <button onClick={onIrANuevaSolicitud} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer flex items-center gap-2">
          <Plus size={16} strokeWidth={2} /> Nueva solicitud
        </button>
      </div>
      
      {(slaVencidos > 0 || slaPorVencer > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => onIrASolicitudes && onIrASolicitudes('vencidos')}
            disabled={slaVencidos === 0}
            className="flex items-center gap-4 text-left bg-red-500/10 border border-red-500/25 rounded-2xl px-5 py-4 transition-colors enabled:hover:bg-red-500/15 enabled:cursor-pointer disabled:opacity-50"
          >
            <AlertOctagon size={22} strokeWidth={1.75} className="text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-semibold text-white leading-none">{slaVencidos}</p>
              <p className="text-xs text-red-300 mt-1">{slaVencidos === 1 ? 'ticket con SLA vencido' : 'tickets con SLA vencido'}</p>
            </div>
          </button>
          <button
            onClick={() => onIrASolicitudes && onIrASolicitudes('por_vencer')}
            disabled={slaPorVencer === 0}
            className="flex items-center gap-4 text-left bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-4 transition-colors enabled:hover:bg-amber-500/15 enabled:cursor-pointer disabled:opacity-50"
          >
            <Clock size={22} strokeWidth={1.75} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-semibold text-white leading-none">{slaPorVencer}</p>
              <p className="text-xs text-amber-300 mt-1">{slaPorVencer === 1 ? 'ticket por vencer (80% del tiempo)' : 'tickets por vencer (80% del tiempo)'}</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3">
          <CheckCircle2 size={18} strokeWidth={1.75} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-slate-300">Sin tickets en riesgo de SLA en este momento.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-medium text-slate-400 mb-4 text-center">Solicitudes Abiertas</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-4xl sm:text-5xl font-semibold text-white">{totalAbiertas}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(totalAbiertas * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-medium text-slate-400 mb-4 text-center">En Proceso</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-4xl sm:text-5xl font-semibold text-white">{totalEnProceso}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(totalEnProceso * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-medium text-slate-400 mb-4 text-center">Tickets Hoy ({fechaHoyMX})</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-4xl sm:text-5xl font-semibold text-white">{ticketsDeHoy.length}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(ticketsDeHoy.length * 10, 100)}%` }}></div></div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-700 flex flex-col justify-between">
          <h3 className="text-xs font-medium text-slate-400 mb-4 text-center">Cumplimiento de SLA</h3>
          <div className="flex justify-center items-center mb-4 px-2"><span className="text-4xl sm:text-5xl font-semibold text-white">{porcentajeSla === null ? '—' : `${porcentajeSla}%`}</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${porcentajeSla ?? 0}%` }}></div></div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">
            Solicitudes Recientes en Espera / Sin Asignar
          </h2>
          <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            {ticketsSinAsignar.length} pendientes
          </span>
        </div>

        {ticketsSinAsignar.length === 0 ? (
          <EstadoVacio compacto icono={CheckCircle2} titulo="Todo asignado" descripcion="No hay tickets pendientes sin asignar en este momento." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-72 overflow-y-auto pr-2">
            {ticketsSinAsignar.map(t => (
              <div key={t.folio} className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 flex flex-col justify-between gap-3 shadow-sm hover:border-indigo-500/50 transition-all">
                <div>
                  <div className="flex justify-between items-center text-xs text-indigo-400 font-bold mb-1">
                    <span>Folio #{t.folio}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{t.fecha}</span>
                  </div>
                  <p className="font-bold text-white text-sm line-clamp-1">{t.asunto || t.subcategoria}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.creador || 'Cliente'} | {t.equipo || 'Nodo General'}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onTomarTicket(t.folio)}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1"
                  >
                    Tomar Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => onAbrirChat(t.folio)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1"
                  >
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-300 tracking-tight">Distribución por Grupo</h2>
              <p className="text-xs text-slate-400">{soloHoyGrafica ? `Mostrando tickets creados hoy (${fechaHoyMX})` : `Mostrando histórico total (${safeTickets.length} tickets)`}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button type="button" onClick={() => setSoloHoyGrafica(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${soloHoyGrafica ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                Hoy ({ticketsDeHoy.length})
              </button>
              <button type="button" onClick={() => setSoloHoyGrafica(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${!soloHoyGrafica ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                Total ({safeTickets.length})
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrupos} margin={{ top: 15, right: 20, left: -10, bottom: 55 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="nombre" axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
                <Bar dataKey="tickets" fill="#5e6ad2" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-700 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-300 tracking-tight">Indicador de Satisfacción por Asesor</h2>
            <p className="text-xs text-slate-400 mb-4">Promedio de encuestas obtenidas individualmente.</p>
          </div>
          
          <div className="space-y-4 overflow-y-auto max-h-64 pr-2 my-auto">
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
                    <span className="text-2xl font-semibold text-green-400 tracking-tight">{tec.promedio}</span>
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
