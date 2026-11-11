import React, { useState, useEffect } from 'react';
import { nombrePresentable, normalizarTexto, perteneceAGrupo, listaDeGrupos } from '../utils/texto';
import { EstadoVacio } from '../components/Estados';
import EtiquetaEstatus from '../components/EtiquetaEstatus';
import { useAvisos } from '../components/Avisos';
import { Plus, Search, Inbox, List, Columns3, Copy, Trash2, ListFilter, X } from 'lucide-react';
import TableroTickets from '../components/TableroTickets';
import VistasGuardadas from '../components/VistasGuardadas';
import { calcularSLA as calcularEstadoSLA, formatearDuracion } from '../utils/sla';
import { exportarCSV } from '../utils/exportar';
import AvisoHistorial from '../components/AvisoHistorial';

function SolicitudesView({ 
  historial,
  tickets = [], 
  categorias = [], 
  activeColumns = [], 
  columnLabels = {}, 
  user, 
  onOpenCustomizer, 
  onNuevaSolicitud, 
  onEditarTicket,
  onAbrirChat,
  onIrAEncuestaSpecific,
  filtroInicial,
  usuarios = [],
  grupos = [],
  foliosNuevos,
  onCambiarEstatus,
  onFiltroConsumido,
  estadisticasEncuestas = [] 
}) {
  const { avisar, confirmar } = useAvisos();
  // El panel de inicio puede mandar un filtro (texto) o un filtro con búsqueda ({ filtro, busqueda })
  const inicial = typeof filtroInicial === 'object' && filtroInicial ? filtroInicial : { filtro: filtroInicial, busqueda: '', grupo: '' };
  const [busqueda, setBusqueda] = useState(inicial.busqueda || '');
  const [grupo, setGrupo] = useState(inicial.grupo || '');
  const [vista, setVista] = useState('lista');
  const [filtroEstatus, setFiltroEstatus] = useState(inicial.filtro || 'activos');
  // Dentro de «Mis Tickets» y «Mis Grupos»: ver los abiertos/en proceso, los cerrados o todos
  const [subEstado, setSubEstado] = useState('activos');
  const [, setTick] = useState(0);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosCol, setFiltrosCol] = useState({});
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [masivo, setMasivo] = useState({ grupo: '', tecnico: '', estatus: '' });
  const [enviando, setEnviando] = useState(false);

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

  const esAdmin = !esCliente;
  const misGrupos = listaDeGrupos(user?.gruposAsignados);
  const esDeMisGrupos = (t) => misGrupos.some(g => perteneceAGrupo(t, g));
  const conteoMisGrupos = ticketsBase.filter(t => !(t.estatus || '').toLowerCase().includes('cerrado') && esDeMisGrupos(t)).length;

  const estaCerrado = (t) => (t.estatus || '').toLowerCase().includes('cerrado');
  const pasaSubEstado = (t) => (estaCerrado(t) ? subEstado !== 'activos' : subEstado !== 'cerrados');
  // Cuántos hay en cada opción del subfiltro, según la pestaña elegida (mis tickets o mis grupos)
  const pertenecePestana = (t) => (filtroEstatus === 'mios' ? esMiTicket(t) : esDeMisGrupos(t));
  const enPestana = ticketsBase.filter(pertenecePestana);
  const conteoSub = {
    activos: enPestana.filter(t => !estaCerrado(t)).length,
    cerrados: enPestana.filter(estaCerrado).length,
    todos: enPestana.length
  };

  const hayFiltrosCol = Object.values(filtrosCol).some(Boolean);
  const cambiarFiltroCol = (clave, valor) => setFiltrosCol(prev => ({ ...prev, [clave]: valor }));
  const limpiarFiltros = () => { setFiltrosCol({}); setBusqueda(''); setGrupo(''); };

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
    for (const [clave, valor] of Object.entries(filtrosCol)) {
      if (valor && !normalizarTexto(t[clave]).includes(normalizarTexto(valor))) return false;
    }
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
    if (filtroEstatus === 'mios' && (!esMiTicket(t) || !pasaSubEstado(t))) return false;
    if (filtroEstatus === 'mis_grupos' && (!esDeMisGrupos(t) || !pasaSubEstado(t))) return false;
    // 'todos' no excluye nada: útil cuando se llega desde una gráfica
    if (filtroEstatus === 'vencidos' && nivelSLA(t) !== 'vencido') return false;
    if (filtroEstatus === 'por_vencer' && nivelSLA(t) !== 'riesgo') return false;

    return coincideBusqueda(t);
  });

  const ticketsTablero = ticketsBase.filter(coincideBusqueda);

  const folioClave = (t) => String(t.folio);
  const alternarSeleccion = (t) => setSeleccion(prev => {
    const nuevo = new Set(prev);
    if (nuevo.has(folioClave(t))) nuevo.delete(folioClave(t)); else nuevo.add(folioClave(t));
    return nuevo;
  });
  const todosMarcados = ticketsFiltrados.length > 0 && ticketsFiltrados.every(t => seleccion.has(folioClave(t)));
  const alternarTodos = () => setSeleccion(prev => {
    const nuevo = new Set(prev);
    ticketsFiltrados.forEach(t => { if (todosMarcados) nuevo.delete(folioClave(t)); else nuevo.add(folioClave(t)); });
    return nuevo;
  });

  const tecnicos = usuarios
    .filter(u => String(u.nivel || '').toUpperCase().includes('ADMIN') && String(u.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
    .map(u => `${u.nombre || ''} ${u.paterno || ''}`.trim())
    .filter(Boolean);
  const nombresGrupos = grupos.map(g => (typeof g === 'string' ? g : g?.nombre)).filter(Boolean);

  const pedirAlServidor = async (url, opciones) => {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opciones });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(datos.error || 'No se pudo completar la acción.');
    return datos;
  };

  const aplicarMasivo = async () => {
    const cambios = Object.fromEntries(Object.entries(masivo).filter(([, v]) => v));
    if (Object.keys(cambios).length === 0) { avisar('Elige qué cambiar: grupo, técnico o estatus.', 'info'); return; }
    const folios = [...seleccion];
    if (!(await confirmar(`Se actualizarán ${folios.length} solicitudes. ¿Continuar?`, { textoConfirmar: 'Aplicar', peligro: false }))) return;
    setEnviando(true);
    try {
      const datos = await pedirAlServidor('/api/tickets/masivo', { method: 'POST', body: JSON.stringify({ folios, ...cambios }) });
      avisar(`${datos.actualizados.length} solicitudes actualizadas.`, 'exito');
      setSeleccion(new Set());
      setMasivo({ grupo: '', tecnico: '', estatus: '' });
    } catch (e) { avisar(e.message, 'error'); } finally { setEnviando(false); }
  };

  const copiarTicket = async (ticket) => {
    if (!(await confirmar(`Se creará una solicitud nueva y abierta con los mismos datos del folio #${ticket.folio}.`, { textoConfirmar: 'Copiar', peligro: false }))) return;
    try {
      const datos = await pedirAlServidor(`/api/tickets/${encodeURIComponent(ticket.folio)}/copiar`, { method: 'POST', body: JSON.stringify({ copias: 1 }) });
      avisar(`Copia creada: #${datos.folios[0]}.`, 'exito');
    } catch (e) { avisar(e.message, 'error'); }
  };

  const eliminarTicket = async (ticket) => {
    if (!(await confirmar(`¿Eliminar el folio #${ticket.folio}? No se puede deshacer; quedará registrado en la auditoría.`))) return;
    try {
      await pedirAlServidor(`/api/tickets/${encodeURIComponent(ticket.folio)}`, { method: 'DELETE' });
      setSeleccion(prev => { const nuevo = new Set(prev); nuevo.delete(folioClave(ticket)); return nuevo; });
      avisar(`Folio #${ticket.folio} eliminado.`, 'exito');
    } catch (e) { avisar(e.message, 'error'); }
  };

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
      <AvisoHistorial historial={historial} />
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

          <button
            onClick={() => setMostrarFiltros(v => !v)}
            aria-pressed={mostrarFiltros}
            className={`px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 border cursor-pointer ${mostrarFiltros || hayFiltrosCol ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
          >
            <ListFilter size={15} strokeWidth={1.75} /> Filtros{hayFiltrosCol ? ' •' : ''}
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
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'todos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {ticketsBase.length}
              </span>
            </button>

            <button 
              onClick={() => setFiltroEstatus('activos')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'activos' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              <span>Abiertos / En Proceso</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'activos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
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
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'sin_asignar' ? 'bg-black/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
                    {conteoSinAsignar}
                  </span>
                </button>

                <button 
                  onClick={() => setFiltroEstatus('mios')}
                  title="Tickets asignados a mí (aparece mi nombre como técnico)"
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'mios' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>Mis Tickets</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'mios' ? 'bg-black/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                    {conteoMios}
                  </span>
                </button>

                {misGrupos.length > 0 && (
                  <button
                    onClick={() => setFiltroEstatus('mis_grupos')}
                    title={`Grupos: ${misGrupos.join(', ')}`}
                    className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'mis_grupos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                  >
                    <span>Mis Grupos</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'mis_grupos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                      {conteoMisGrupos}
                    </span>
                  </button>
                )}
              </>
            )}

            {!esCliente && (
              <>
                <button 
                  onClick={() => setFiltroEstatus('vencidos')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'vencidos' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>SLA Vencido</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'vencidos' ? 'bg-black/20 text-white' : 'bg-slate-800 text-red-400'}`}>
                    {conteoVencidos}
                  </span>
                </button>

                <button 
                  onClick={() => setFiltroEstatus('por_vencer')}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 ${filtroEstatus === 'por_vencer' ? 'bg-indigo-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700'}`}
                >
                  <span>Por Vencer</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'por_vencer' ? 'bg-black/20 text-white' : 'bg-slate-800 text-amber-400'}`}>
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
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${filtroEstatus === 'cerrados' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
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

        {vista === 'lista' && (filtroEstatus === 'mios' || filtroEstatus === 'mis_grupos') && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{filtroEstatus === 'mios' ? 'Mis tickets (asignados a mí):' : 'Mis grupos:'}</span>
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Estado de los tickets">
              {[
                { clave: 'activos', texto: 'Abiertos / En proceso' },
                { clave: 'cerrados', texto: 'Cerrados' },
                { clave: 'todos', texto: 'Todos' }
              ].map(o => (
                <button
                  key={o.clave}
                  onClick={() => setSubEstado(o.clave)}
                  aria-pressed={subEstado === o.clave}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${subEstado === o.clave ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
                >
                  {o.texto}
                  <span className="tabular-nums text-slate-300">{conteoSub[o.clave]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {esAdmin && vista === 'lista' && seleccion.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-3 animate-entrada">
            <span className="text-sm font-semibold text-white">{seleccion.size} seleccionadas</span>
            <select value={masivo.grupo} onChange={(e) => setMasivo(m => ({ ...m, grupo: e.target.value }))} aria-label="Asignar a grupo"
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500">
              <option value="">Grupo: sin cambio</option>
              {nombresGrupos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={masivo.tecnico} onChange={(e) => setMasivo(m => ({ ...m, tecnico: e.target.value }))} aria-label="Asignar a técnico"
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500">
              <option value="">Técnico: sin cambio</option>
              {tecnicos.map(t => <option key={t} value={t}>{nombrePresentable(t)}</option>)}
            </select>
            <select value={masivo.estatus} onChange={(e) => setMasivo(m => ({ ...m, estatus: e.target.value }))} aria-label="Cambiar estatus"
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500">
              <option value="">Estatus: sin cambio</option>
              <option value="Abierto">Abierto</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Cerrado">Cerrado</option>
            </select>
            <button onClick={aplicarMasivo} disabled={enviando}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">
              {enviando ? 'Aplicando…' : 'Aplicar'}
            </button>
            <button onClick={() => setSeleccion(new Set())}
              className="ml-auto px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5">
              <X size={14} strokeWidth={1.75} /> Quitar selección
            </button>
          </div>
        )}

        <div className={vista === 'lista' ? 'overflow-x-auto border border-slate-700 rounded-lg' : 'hidden'}>
          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-700 text-slate-200 text-xs">
              <tr>
                {esAdmin && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label="Seleccionar todas las solicitudes visibles" className="cursor-pointer accent-indigo-500" />
                  </th>
                )}
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">{esCliente ? 'Ver' : 'Gestionar'}</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3">SLA / Tiempo</th>
                {activeColumns.map(colKey => (
                  <th key={colKey} className="px-4 py-3">{columnLabels[colKey] || colKey}</th>
                ))}
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
              {mostrarFiltros && (
                <tr className="bg-slate-800/80">
                  {esAdmin && <th className="px-4 py-2" />}
                  <th className="px-2 py-2">
                    <input value={filtrosCol.folio || ''} onChange={(e) => cambiarFiltroCol('folio', e.target.value)} placeholder="Folio" aria-label="Filtrar por folio"
                      className="w-24 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-normal rounded-md px-2 py-1.5 outline-none focus:border-indigo-500" />
                  </th>
                  <th className="px-2 py-2" />
                  <th className="px-2 py-2">
                    <select value={filtrosCol.estatus || ''} onChange={(e) => cambiarFiltroCol('estatus', e.target.value)} aria-label="Filtrar por estatus"
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-normal rounded-md px-2 py-1.5 outline-none focus:border-indigo-500">
                      <option value="">Estatus</option>
                      <option value="Abierto">Abierto</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  </th>
                  <th className="px-2 py-2" />
                  {activeColumns.map(colKey => (
                    <th key={colKey} className="px-2 py-2">
                      <input value={filtrosCol[colKey] || ''} onChange={(e) => cambiarFiltroCol(colKey, e.target.value)}
                        placeholder={columnLabels[colKey] || colKey} aria-label={`Filtrar por ${columnLabels[colKey] || colKey}`}
                        className="w-full min-w-28 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-normal rounded-md px-2 py-1.5 outline-none focus:border-indigo-500" />
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">
                    {hayFiltrosCol && (
                      <button onClick={() => setFiltrosCol({})} className="text-xs font-medium text-indigo-300 hover:text-white cursor-pointer">Limpiar</button>
                    )}
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 5 + (esAdmin ? 1 : 0)}>
                    <EstadoVacio
                      icono={Inbox}
                      titulo="No hay solicitudes en esta vista"
                      descripcion={(busqueda || hayFiltrosCol || grupo) ? 'Prueba con otro filtro o quita los filtros activos.' : 'Cuando se registre una solicitud aparecerá aquí.'}
                      accion={(busqueda || hayFiltrosCol || grupo) ? 'Quitar filtros' : (esCliente ? 'Crear solicitud' : undefined)}
                      onAccion={(busqueda || hayFiltrosCol || grupo) ? limpiarFiltros : onNuevaSolicitud}
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
                    <tr key={ticket.folio} className={`hover:bg-slate-700/50 transition-colors ${seleccion.has(folioClave(ticket)) ? 'bg-indigo-500/10' : ''} ${foliosNuevos && foliosNuevos.has(String(ticket.folio)) ? 'animate-resaltar' : ''}`}>
                      {esAdmin && (
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={seleccion.has(folioClave(ticket))} onChange={() => alternarSeleccion(ticket)} aria-label={`Seleccionar folio ${ticket.folio}`} className="cursor-pointer accent-indigo-500" />
                        </td>
                      )}
                      <td className="px-4 py-3 font-bold text-white">#{ticket.folio}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditarTicket(ticket)}
                            className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-indigo-500/30 cursor-pointer"
                          >
                            {esCliente ? 'Ver' : 'Gestionar'}
                          </button>
                          {esActivo && onAbrirChat && (
                            <button
                              onClick={() => onAbrirChat(ticket.folio)}
                              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-emerald-500/30 cursor-pointer"
                              title="Abrir Chat en Vivo"
                            >
                              Chat
                            </button>
                          )}
                        </div>
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
                          {esAdmin && (
                            <>
                              <button onClick={() => copiarTicket(ticket)} title="Copiar folio" aria-label={`Copiar folio ${ticket.folio}`}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                                <Copy size={15} strokeWidth={1.75} />
                              </button>
                              <button onClick={() => eliminarTicket(ticket)} title="Eliminar folio" aria-label={`Eliminar folio ${ticket.folio}`}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                                <Trash2 size={15} strokeWidth={1.75} />
                              </button>
                            </>
                          )}

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
