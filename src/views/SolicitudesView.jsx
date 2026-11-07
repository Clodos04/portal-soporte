import React, { useState, useEffect } from 'react';
import { nombrePresentable, normalizarTexto, perteneceAGrupo } from '../utils/texto';
import { EstadoVacio } from '../components/Estados';
import EtiquetaEstatus from '../components/EtiquetaEstatus';
import { useAvisos } from '../components/Avisos';
import { Plus, Search, StickyNote, Inbox, List, Columns3 } from 'lucide-react';
import TableroTickets from '../components/TableroTickets';
import VistasGuardadas from '../components/VistasGuardadas';
import { calcularSLA as calcularEstadoSLA, formatearDuracion } from '../utils/sla';
import { exportarCSV } from '../utils/exportar';

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
  filtroInicial,
  foliosNuevos,
  onCambiarEstatus,
  onFiltroConsumido,
  estadisticasEncuestas = [] 
}) {
  const { avisar } = useAvisos();
  // El panel de inicio puede mandar un filtro (texto) o un filtro con búsqueda ({ filtro, busqueda })
  const inicial = typeof filtroInicial === 'object' && filtroInicial ? filtroInicial : { filtro: filtroInicial, busqueda: '', grupo: '' };
  const [busqueda, setBusqueda] = useState(inicial.busqueda || '');
  const [grupo, setGrupo] = useState(inicial.grupo || '');
  const [vista, setVista] = useState('lista');
  const [filtroEstatus, setFiltroEstatus] = useState(inicial.filtro || 'activos');
  const [, setTick] = useState(0);

  // El filtro que llegó desde el panel de inicio se usa una sola vez
  useEffect(() => { if (filtroInicial && onFiltroConsumido) onFiltroConsumido(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Semáforo de SLA (cálculo compartido en utils/sla.js)
  const calcularSLA = (ticket) => {
    const sla = calcularEstadoSLA(ticket, categorias);
    const base = { sla };
    if (sla.nivel === 'sin_fecha') {
      return { ...base, texto: ticket.fecha || '—', color: 'bg-slate-700/50 text-slate-400 border-slate-600', punto: 'bg-slate-500' };
    }
    if (sla.nivel === 'cerrado') {
      return {
        ...base,
        texto: `Resuelto (${formatearDuracion(sla.transcurridoMin)})${sla.cumplido ? ' • En SLA' : ' • Fuera de SLA'}`,
        color: 'bg-slate-800 text-slate-400 border-slate-700',
        punto: sla.cumplido ? 'bg-slate-500' : 'bg-red-400'
      };
    }
    if (sla.nivel === 'ok') {
      return { ...base, texto: `Vence en ${formatearDuracion(sla.restanteMin)}`, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', punto: 'bg-emerald-400' };
    }
    if (sla.nivel === 'riesgo') {
      return { ...base, texto: `Por vencer • ${formatearDuracion(sla.restanteMin)}`, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', punto: 'bg-amber-400' };
    }
    return { ...base, texto: `Vencido hace ${formatearDuracion(-sla.restanteMin)}`, color: 'bg-red-500/10 text-red-400 border-red-500/30', punto: 'bg-red-400' };
  };

  const nivelSLA = (t) => calcularEstadoSLA(t, categorias).nivel;
  const conteoVencidos = ticketsBase.filter(t => nivelSLA(t) === 'vencido').length;
  const conteoPorVencer = ticketsBase.filter(t => nivelSLA(t) === 'riesgo').length;

  const coincideBusqueda = (t) => {
    if (grupo && !perteneceAGrupo(t, grupo)) return false;
    const query = normalizarTexto(busqueda);
    if (!query) return true;

    return [t.folio, t.asunto, t.creador, t.solicitante, t.estatus, t.equipo, t.campana, t.categoria, t.grupo, t.subcategoria, t.tecnico, t.asignado]
      .some(campo => campo && normalizarTexto(campo).includes(query));
  };

  const ticketsFiltrados = ticketsBase.filter(t => {
    const estatusLower = t.estatus ? t.estatus.toLowerCase() : '';
    const esCerrado = estatusLower.includes('cerrado');

    if (filtroEstatus === 'activos' && esCerrado) return false;
    if (filtroEstatus === 'cerrados' && !esCerrado) return false;
    if (filtroEstatus === 'sin_asignar' && (esCerrado || !estaSinAsignar(t))) return false;
    if (filtroEstatus === 'mios' && (esCerrado || !esMiTicket(t))) return false;
    // 'todos' no excluye nada: útil cuando se llega desde una gráfica
    if (filtroEstatus === 'vencidos' && nivelSLA(t) !== 'vencido') return false;
    if (filtroEstatus === 'por_vencer' && nivelSLA(t) !== 'riesgo') return false;

    return coincideBusqueda(t);
  });

  const ticketsTablero = ticketsBase.filter(coincideBusqueda);

  const exportarListado = () => {
    if (ticketsFiltrados.length === 0) { avisar('No hay solicitudes para exportar con el filtro actual.', 'info'); return; }
    const textoNivel = { ok: 'En tiempo', riesgo: 'Por vencer', vencido: 'Vencido', sin_fecha: '—' };
    exportarCSV(ticketsFiltrados, [
      { titulo: 'Folio', valor: t => t.folio },
      { titulo: 'Fecha', valor: t => t.fecha },
      { titulo: 'Estatus', valor: t => t.estatus },
      { titulo: 'Solicitante', valor: t => t.creador },
      { titulo: 'Técnico', valor: t => t.tecnico },
      { titulo: 'Campaña', valor: t => t.campana },
      { titulo: 'Categoría', valor: t => t.categoria },
      { titulo: 'Subcategoría', valor: t => t.subcategoria },
      { titulo: 'Equipo / Nodo', valor: t => t.equipo },
      { titulo: 'Asunto', valor: t => t.asunto },
      { titulo: 'SLA (horas)', valor: t => calcularEstadoSLA(t, categorias).limiteMin / 60 },
      { titulo: 'Estado SLA', valor: t => {
        const sla = calcularEstadoSLA(t, categorias);
        return sla.nivel === 'cerrado' ? (sla.cumplido ? 'Resuelto en SLA' : 'Resuelto fuera de SLA') : textoNivel[sla.nivel];
      } },
      { titulo: 'Tiempo transcurrido (min)', valor: t => calcularEstadoSLA(t, categorias).transcurridoMin }
    ], 'solicitudes');
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Listado de Solicitudes</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión y control de tickets en tiempo real • Clodos TI Assist</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Tipo de vista">
            <button
              onClick={() => setVista('lista')}
              aria-pressed={vista === 'lista'}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${vista === 'lista' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
            >
              <List size={15} strokeWidth={1.75} /> Lista
            </button>
            <button
              onClick={() => setVista('tablero')}
              aria-pressed={vista === 'tablero'}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${vista === 'tablero' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
            >
              <Columns3 size={15} strokeWidth={1.75} /> Tablero
            </button>
          </div>
          <button 
            onClick={onOpenCustomizer}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 border border-slate-600 cursor-pointer"
          >
            Columnas
          </button>

          {!esCliente && (
            <button
              onClick={exportarListado}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              Exportar
            </button>
          )}
          
          <button 
            onClick={onNuevaSolicitud}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2} /> Nueva solicitud
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 border-b border-slate-700 pb-4">
          <div className={`flex flex-wrap items-center gap-2 ${vista === 'tablero' ? 'invisible hidden lg:flex lg:invisible' : ''}`}>
            <button 
              onClick={() => setFiltroEstatus('todos')}
              className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'todos' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>Todos</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'todos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {ticketsBase.length}
              </span>
            </button>

            <button 
              onClick={() => setFiltroEstatus('activos')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'activos' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>Abiertos / En Proceso</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'activos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {conteoActivos}
              </span>
            </button>

            {!esCliente && (
              <>
                <button 
                  onClick={() => setFiltroEstatus('sin_asignar')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'sin_asignar' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>Sin Asignar</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'sin_asignar' ? 'bg-black/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
                    {conteoSinAsignar}
                  </span>
                </button>

                <button 
                  onClick={() => setFiltroEstatus('mios')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'mios' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>Mis Tickets</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'mios' ? 'bg-black/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                    {conteoMios}
                  </span>
                </button>
              </>
            )}

            {!esCliente && (
              <>
                <button 
                  onClick={() => setFiltroEstatus('vencidos')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'vencidos' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>SLA Vencido</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'vencidos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-red-400'}`}>
                    {conteoVencidos}
                  </span>
                </button>

                <button 
                  onClick={() => setFiltroEstatus('por_vencer')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'por_vencer' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>Por Vencer</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'por_vencer' ? 'bg-black/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
                    {conteoPorVencer}
                  </span>
                </button>
              </>
            )}

            <button 
              onClick={() => setFiltroEstatus('cerrados')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'cerrados' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>Cerrados</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroEstatus === 'cerrados' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {conteoCerrados}
              </span>
            </button>
          </div>

          <div className="lg:ml-auto lg:mr-3">
            <VistasGuardadas
              usuario={user?.username}
              actual={{ filtroEstatus, busqueda, vista }}
              onAplicar={(v) => { setGrupo(''); setFiltroEstatus(v.filtroEstatus || 'activos'); setBusqueda(v.busqueda || ''); setVista(v.vista || 'lista'); }}
            />
          </div>

          <div className="relative w-full lg:w-80">
            <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input 
              type="text"
              placeholder="Folio, equipo, campaña, usuario…"
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

        <div className={`${vista === 'tablero' ? 'hidden' : 'flex'} justify-between items-center text-xs text-slate-400 pt-1`}>
          <span>
            Filtro activo: <strong className="text-white">{filtroEstatus.replace('_', ' ')}</strong>
            {grupo && (
              <> • Grupo: <strong className="text-indigo-300">{grupo}</strong>{' '}
                <button type="button" onClick={() => setGrupo('')} className="text-slate-400 hover:text-white cursor-pointer" aria-label="Quitar filtro de grupo">✕</button>
              </>
            )}
            {busqueda && <> • Buscando: <strong className="text-green-400">"{busqueda}"</strong></>}
          </span>
          <span>Mostrando: <strong className="text-white">{ticketsFiltrados.length}</strong> registros</span>
        </div>

        {vista === 'tablero' && (
          <TableroTickets
            tickets={ticketsTablero}
            categorias={categorias}
            puedeMover={!esCliente && !!onCambiarEstatus}
            onAbrir={onEditarTicket}
            onMover={onCambiarEstatus}
            foliosNuevos={foliosNuevos}
          />
        )}

        <div className={vista === 'lista' ? 'overflow-x-auto border border-slate-700 rounded-lg' : 'hidden'}>
          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-700 text-slate-200 text-xs">
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
                  <td colSpan={activeColumns.length + 5}>
                    <EstadoVacio
                      icono={Inbox}
                      titulo="No hay solicitudes en esta vista"
                      descripcion={busqueda ? 'Prueba con otro folio, equipo o nombre.' : 'Cuando se registre una solicitud aparecerá aquí.'}
                      accion={esCliente ? 'Crear solicitud' : undefined}
                      onAccion={onNuevaSolicitud}
                    />
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
                    <tr key={ticket.folio} className={`hover:bg-slate-700/50 transition-colors ${foliosNuevos && foliosNuevos.has(String(ticket.folio)) ? 'animate-resaltar' : ''}`}>
                      <td className="px-4 py-3 font-bold text-white">#{ticket.folio}</td>

                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => onOpenNotes(ticket.folio)}
                          className="relative p-2 bg-slate-900/60 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700 inline-flex items-center justify-center cursor-pointer"
                          title="Ver Notas"
                        >
                          <StickyNote size={15} strokeWidth={1.75} />
                          {ticket.notas && ticket.notas.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center shadow">
                              {ticket.notas.length}
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <EtiquetaEstatus estatus={ticket.estatus} />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border ${infoSLA.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${infoSLA.punto}`} />
                          <span>{infoSLA.texto}</span>
                        </span>
                      </td>

                      {activeColumns.map(colKey => (
                        <td key={colKey} className="px-4 py-3 text-slate-300 max-w-xs truncate">
                          {(colKey === 'creador' || colKey === 'tecnico' ? nombrePresentable(ticket[colKey]) : ticket[colKey]) || '—'}
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
                              Chat
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
                                Calificado 
                              </span>
                            ) : (
                              <button 
                                onClick={() => onIrAEncuestaSpecific(ticket)}
                                className="px-3.5 py-2 bg-slate-800/80 hover:bg-green-600/20 text-slate-300 hover:text-green-300 rounded-xl text-xs font-medium border border-slate-700/60 hover:border-green-500/40 transition-colors cursor-pointer"
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
