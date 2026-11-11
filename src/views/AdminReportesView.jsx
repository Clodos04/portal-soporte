import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAvisos } from '../components/Avisos';
import { exportarCSV } from '../utils/exportar';
import AvisoHistorial from '../components/AvisoHistorial';
import SupervisorPanel from './SupervisorPanel';
import EscCierra from '../components/EscCierra';
import { parsearFechaLocal, calcularSLA, esTicketCerrado, META_SLA, semaforoCumplimiento, ESTILOS_SEMAFORO } from '../utils/sla';
import { claveFecha } from '../utils/metricas';
import { normalizarTexto } from '../utils/texto';

const DIA_MS = 24 * 60 * 60 * 1000;
const PERIODOS = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'semana', texto: 'Esta semana' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'todo', texto: 'Todo' },
  { clave: 'rango', texto: 'Rango' }
];

const inicioDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const finDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate(), 23, 59, 59, 999);
const aFecha = (texto, fin = false) => {
  if (!texto) return null;
  const [y, m, d] = texto.split('-').map(Number);
  return fin ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
};
const textoCorto = (f) => f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '');

// Rango de fechas de cada periodo: semana = desde el lunes, mes = desde el día 1. null = sin límite.
function rangoDelPeriodo(periodo, desdeTexto, hastaTexto, ahora = new Date()) {
  if (periodo === 'hoy') return { desde: inicioDia(ahora), hasta: finDia(ahora) };
  if (periodo === 'semana') {
    const lunes = new Date(inicioDia(ahora).getTime() - ((ahora.getDay() + 6) % 7) * DIA_MS);
    return { desde: lunes, hasta: finDia(ahora) };
  }
  if (periodo === 'mes') return { desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1), hasta: finDia(ahora) };
  if (periodo === 'rango') return { desde: aFecha(desdeTexto), hasta: aFecha(hastaTexto, true) };
  return { desde: null, hasta: null };
}

export default function AdminReportesView({ historial, categorias = [], tickets = [], campanas = [], estadisticasEncuestas = [], user, onIrACentinela }) {
  const { avisar } = useAvisos();
  const [filtroCampana, setFiltroCampana] = useState('Todas');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  
  const [pestana, setPestana] = useState('resumen'); // 'resumen' | 'satisfaccion'

  // Periodo del reporte: todo el resumen se calcula con los tickets creados dentro de ese periodo
  const [periodo, setPeriodo] = useState('mes');
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');

  // Exportación a Excel con rango de fechas, categoría y subcategoría
  const [exportAbierto, setExportAbierto] = useState(false);
  const [expDesde, setExpDesde] = useState('');
  const [expHasta, setExpHasta] = useState('');
  const [expCategoria, setExpCategoria] = useState('');
  const [expSubcategoria, setExpSubcategoria] = useState('');

  // Estados para la consulta de Historial de Nodos
  const [nodoSeleccionadoHistorial, setNodoSeleccionadoHistorial] = useState('');
  const [busquedaNodoTexto, setBusquedaNodoTexto] = useState('');

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esAdmin = rolUsuario === 'support' || rolUsuario === 'administrador' || rolUsuario === 'admin';

  // Filtros de campaña y estatus (sin periodo): sirven para el mapa de nodos y la exportación
  const ticketsSinPeriodo = tickets.filter(t => {
    const matchCampana = filtroCampana === 'Todas' || (t.campana || '').trim().toUpperCase() === filtroCampana.trim().toUpperCase();
    const matchEstatus = filtroEstatus === 'Todos' || (t.estatus || '').trim().toUpperCase() === filtroEstatus.trim().toUpperCase();
    return matchCampana && matchEstatus;
  });

  // Periodo elegido y el periodo anterior de la misma duración, para comparar
  const { desde, hasta } = rangoDelPeriodo(periodo, rangoDesde, rangoHasta);
  const dentro = (t, d, h) => {
    if (!d && !h) return true;
    const f = parsearFechaLocal(t.created_at || t.fecha);
    if (!f) return false;
    return (!d || f >= d) && (!h || f <= h);
  };
  const ticketsFiltrados = ticketsSinPeriodo.filter(t => dentro(t, desde, hasta));
  const rangoAnterior = desde && hasta ? { desde: new Date(desde.getTime() - (hasta.getTime() - desde.getTime() + 1)), hasta: new Date(desde.getTime() - 1) } : null;
  const totalAnterior = rangoAnterior ? ticketsSinPeriodo.filter(t => dentro(t, rangoAnterior.desde, rangoAnterior.hasta)).length : null;
  const variacionTotal = totalAnterior ? Math.round(((ticketsFiltrados.length - totalAnterior) / totalAnterior) * 100) : null;
  const etiquetaPeriodo = !desde && !hasta ? 'Todo el historial cargado'
    : periodo === 'hoy' ? `Hoy, ${textoCorto(desde)}`
    : `${desde ? textoCorto(desde) : 'inicio'} – ${hasta ? textoCorto(hasta) : 'hoy'}`;

  // Métricas generales
  const totalTickets = ticketsFiltrados.length;
  const abiertos = ticketsFiltrados.filter(t => (t.estatus || '').toUpperCase() === 'ABIERTO').length;
  const enProceso = ticketsFiltrados.filter(t => (t.estatus || '').toUpperCase() === 'EN PROCESO').length;
  const cerrados = ticketsFiltrados.filter(t => {
    const est = (t.estatus || '').toUpperCase();
    return est === 'CERRADO' || est === 'RESUELTO';
  }).length;

  // 1. PRODUCTIVIDAD POR TÉCNICO (Normalizado)
  const productividadTecnicos = ticketsFiltrados.reduce((acc, t) => {
    const tecnicoCrudo = (t.tecnico || 'Sin asignar').trim();
    const tecnicoKey = tecnicoCrudo.toUpperCase() === 'SIN ASIGNAR' ? 'Sin Asignar' : tecnicoCrudo.toUpperCase();
    const tecnicoNombreReal = tecnicoCrudo.toUpperCase() === 'SIN ASIGNAR' ? 'Sin Asignar' : tecnicoCrudo;
    
    if (!acc[tecnicoKey]) {
      acc[tecnicoKey] = { nombre: tecnicoNombreReal, count: 0 };
    }
    acc[tecnicoKey].count += 1;
    return acc;
  }, {});

  // 2. TICKETS POR CATEGORÍA (Normalizado y limpio de duplicados por acentos)
  const porCategoria = ticketsFiltrados.reduce((acc, t) => {
    let catCruda = (t.categoria || 'Sin categoría').trim();
    let catKey = catCruda
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (catKey.includes('CENTINELA')) {
      catCruda = 'CENTINELA (PERIFÉRICO)';
      catKey = 'CENTINELA (PERIFÉRICO)';
    }

    if (!acc[catKey]) {
      acc[catKey] = { nombre: catCruda.toUpperCase(), count: 0 };
    }
    acc[catKey].count += 1;
    return acc;
  }, {});

  // 3. DISTRIBUCIÓN POR CAMPAÑA (Normalizado)
  const porCampana = ticketsFiltrados.reduce((acc, t) => {
    const campCruda = (t.campana || 'Sin campaña').trim();
    const campKey = campCruda.toUpperCase();

    if (!acc[campKey]) {
      acc[campKey] = { nombre: campCruda, count: 0 };
    }
    acc[campKey].count += 1;
    return acc;
  }, {});

  // 4. SATISFACCIÓN DEL CLIENTE
  const listaEncuestas = Array.isArray(estadisticasEncuestas) 
    ? estadisticasEncuestas 
    : (estadisticasEncuestas?.historial || []);

  // Encuestas respondidas dentro del periodo (por su fecha de respuesta)
  const encuestasPeriodo = periodo === 'todo' ? listaEncuestas : listaEncuestas.filter(e => {
    const f = parsearFechaLocal(e.fecha_respuesta || e.fecha);
    return f && (!desde || f >= desde) && (!hasta || f <= hasta);
  });
  const promedioSatisfaccion = encuestasPeriodo.length > 0
    ? (encuestasPeriodo.reduce((acc, e) => acc + (Number(e.calificacion) || Number(e.promedio) || 0), 0) / encuestasPeriodo.length).toFixed(1)
    : null;

  // Cumplimiento de SLA de los tickets cerrados del periodo (misma meta y colores que Inicio)
  const cerradosPeriodo = ticketsFiltrados.filter(esTicketCerrado);
  const cumplidosPeriodo = cerradosPeriodo.filter(t => calcularSLA(t, categorias).cumplido).length;
  const cumplimientoSla = cerradosPeriodo.length > 0 ? Math.round((cumplidosPeriodo / cerradosPeriodo.length) * 100) : null;
  const estiloSla = ESTILOS_SEMAFORO[semaforoCumplimiento(cumplimientoSla)];

  // Nodo activo a consultar (prioriza el input de texto libre si se escribió algo, de lo contrario usa el select)
  const nodoActivo = (busquedaNodoTexto.trim() !== '' ? busquedaNodoTexto.trim() : nodoSeleccionadoHistorial);

  // Historial de 3 meses para el nodo activo
  const ahora = new Date();
  const haceTresMeses = new Date();
  haceTresMeses.setMonth(ahora.getMonth() - 3);

  const historialNodoReporte = nodoActivo
    ? tickets.filter(t => {
        if (!t.equipo || t.equipo.toUpperCase() !== nodoActivo.toUpperCase()) return false;
        const fechaT = new Date(t.created_at || t.fecha);
        return fechaT >= haceTresMeses;
      })
    : [];

  // Mapa de calor: cuántos reportes tuvo cada nodo en los últimos 90 días
  const UMBRAL_REQUISICION = 5;
  const reportesPorNodo = Object.entries(
    ticketsSinPeriodo.reduce((acc, t) => {
      const nodo = (t.equipo || '').trim();
      if (!nodo || nodo === 'Ninguno') return acc;
      const fechaT = new Date(t.created_at || t.fecha);
      if (isNaN(fechaT.getTime()) || fechaT < haceTresMeses) return acc;
      acc[nodo] = (acc[nodo] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maximoReportes = reportesPorNodo.length ? reportesPorNodo[0][1] : 0;

  // Lista única de nodos con reportes previos
  const listaNodosConReportes = Array.from(
    new Set(tickets.map(t => t.equipo).filter(eq => eq && eq !== 'Ninguno' && eq.trim() !== ''))
  ).sort();

  // Categorías y subcategorías que aparecen en los tickets (sin duplicados por mayúsculas o acentos)
  const unicos = (valores) => {
    const mapa = new Map();
    valores.forEach(v => { const n = (v || '').trim(); if (n && !mapa.has(normalizarTexto(n))) mapa.set(normalizarTexto(n), n); });
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'es'));
  };
  const categoriasExport = unicos(ticketsSinPeriodo.map(t => t.categoria));
  const subcategoriasExport = unicos(ticketsSinPeriodo
    .filter(t => !expCategoria || normalizarTexto(t.categoria) === normalizarTexto(expCategoria))
    .map(t => t.subcategoria));

  // Los filtros de arriba (campaña y estatus) también aplican; aquí se afina por fechas, categoría y subcategoría
  const ticketsAExportar = ticketsSinPeriodo.filter(t => {
    if (expCategoria && normalizarTexto(t.categoria) !== normalizarTexto(expCategoria)) return false;
    if (expSubcategoria && normalizarTexto(t.subcategoria) !== normalizarTexto(expSubcategoria)) return false;
    if (expDesde || expHasta) {
      const f = parsearFechaLocal(t.created_at || t.fecha);
      if (!f) return false;
      const dia = claveFecha(f);
      if (expDesde && dia < expDesde) return false;
      if (expHasta && dia > expHasta) return false;
    }
    return true;
  });

  const exportarExcel = () => {
    if (ticketsAExportar.length === 0) { avisar('No hay tickets para exportar con esos filtros.', 'info'); return; }
    exportarCSV(ticketsAExportar, [
      { titulo: 'Folio', valor: t => t.folio },
      { titulo: 'Fecha', valor: t => t.fecha },
      { titulo: 'Estatus', valor: t => t.estatus },
      { titulo: 'Campaña', valor: t => t.campana },
      { titulo: 'Categoría', valor: t => t.categoria },
      { titulo: 'Subcategoría', valor: t => t.subcategoria },
      { titulo: 'Equipo / Nodo', valor: t => t.equipo },
      { titulo: 'Solicitante', valor: t => t.creador },
      { titulo: 'Técnico', valor: t => t.tecnico },
      { titulo: 'Asunto', valor: t => t.asunto },
      { titulo: 'Resolución', valor: t => t.resolucion },
      { titulo: 'Creado', valor: t => t.created_at },
      { titulo: 'Cerrado / Actualizado', valor: t => t.updated_at }
    ], 'reporte_tickets');
    setExportAbierto(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AvisoHistorial historial={historial} />
      <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Sección de reportes">
        {[{ clave: 'resumen', texto: 'Resumen' }, { clave: 'satisfaccion', texto: 'Satisfacción y encuestas' }].map(o => (
          <button
            key={o.clave}
            onClick={() => setPestana(o.clave)}
            aria-pressed={pestana === o.clave}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${pestana === o.clave ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
          >
            {o.texto}
          </button>
        ))}
      </div>

      {pestana === 'satisfaccion' ? (
        <SupervisorPanel user={user} embebido />
      ) : (
      <>
      {/* ENCABEZADO Y FILTROS */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Reportes y analíticas
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Métricas de rendimiento, productividad de técnicos, tiempos, categorías e historial de nodos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {esAdmin && onIrACentinela && (
            <button 
              onClick={onIrACentinela}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow flex items-center gap-2 cursor-pointer"
            >
              Panel Centinela
            </button>
          )}

          <select aria-label="Filtrar por campaña" 
            value={filtroCampana} 
            onChange={(e) => setFiltroCampana(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="Todas">Todas las Campañas</option>
            {campanas.map((c, idx) => (
              <option key={idx} value={c.nombre || c}>{c.nombre || c}</option>
            ))}
          </select>

          <select aria-label="Filtrar por estatus" 
            value={filtroEstatus} 
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos los Estatus</option>
            <option value="Abierto">Abierto</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Cerrado">Cerrado</option>
          </select>

          <button 
            onClick={() => {
              // La exportación arranca con las fechas del periodo elegido (se pueden cambiar en la ventana)
              setExpDesde(desde ? claveFecha(desde) : '');
              setExpHasta(hasta ? claveFecha(hasta) : '');
              setExportAbierto(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition shadow flex items-center gap-2 cursor-pointer"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* PERIODO DEL REPORTE */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Periodo del reporte">
          {PERIODOS.map(o => (
            <button
              key={o.clave}
              onClick={() => setPeriodo(o.clave)}
              aria-pressed={periodo === o.clave}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${periodo === o.clave ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {o.texto}
            </button>
          ))}
        </div>
        {periodo === 'rango' && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <input aria-label="Desde" type="date" value={rangoDesde} max={rangoHasta || undefined} onChange={(e) => setRangoDesde(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500" />
            a
            <input aria-label="Hasta" type="date" value={rangoHasta} min={rangoDesde || undefined} onChange={(e) => setRangoHasta(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500" />
          </div>
        )}
        <span className="text-xs text-slate-400">
          {etiquetaPeriodo} · tickets creados en ese periodo
          {periodo !== 'todo' && historial && historial.parcial && ` · solo hay ${historial.dias} días de historial cargados`}
        </span>
      </div>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Tickets creados</p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalTickets}</p>
          {variacionTotal !== null && (
            <p className="text-xs text-slate-400 mt-1">{variacionTotal > 0 ? '+' : ''}{variacionTotal}% vs. periodo anterior ({totalAnterior})</p>
          )}
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Abiertos</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">{abiertos}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">En Proceso</p>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{enProceso}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Cerrados / Resueltos</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{cerrados}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Cumplimiento de SLA</p>
          <p className={`text-3xl font-extrabold mt-2 ${estiloSla.texto}`}>{cumplimientoSla === null ? '—' : `${cumplimientoSla}%`}</p>
          <p className="text-xs text-slate-400 mt-1">Meta {META_SLA}% · {estiloSla.leyenda}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Satisfacción promedio</p>
          <p className="text-3xl font-semibold text-white mt-2">{promedioSatisfaccion ?? '—'} </p>
          <p className="text-xs text-slate-400 mt-1">{encuestasPeriodo.length} {encuestasPeriodo.length === 1 ? 'encuesta' : 'encuestas'} en el periodo</p>
        </div>
      </div>

      {/* ANALÍTICAS DETALLADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Productividad por Técnico */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Productividad por Técnico
            </h3>
            {Object.keys(productividadTecnicos).length === 0 ? (
              <p className="text-slate-500 text-sm italic">No hay registros suficientes</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {Object.values(productividadTecnicos).map((item, idx) => {
                  const porcentaje = totalTickets > 0 ? Math.round((item.count / totalTickets) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{item.nombre}</span>
                        <span className="text-slate-400">{item.count} tickets ({porcentaje}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-400">
            Mide el volumen de carga de trabajo atendida por cada elemento.
          </div>
        </div>

        {/* Tickets por Categoría */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Tickets por Categoría
            </h3>
            {Object.keys(porCategoria).length === 0 ? (
              <p className="text-slate-500 text-sm italic">No hay registros suficientes</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {Object.values(porCategoria).map((item, idx) => {
                  const porcentaje = totalTickets > 0 ? Math.round((item.count / totalTickets) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{item.nombre}</span>
                        <span className="text-slate-400">{item.count} ({porcentaje}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-400">
            Muestra las áreas de mayor demanda y recurrencia de incidencias.
          </div>
        </div>

        {/* Distribución por Campaña */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Distribución por Campaña
            </h3>
            {Object.keys(porCampana).length === 0 ? (
              <p className="text-slate-500 text-sm italic">No hay registros suficientes</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {Object.values(porCampana).map((item, idx) => {
                  const porcentaje = totalTickets > 0 ? Math.round((item.count / totalTickets) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{item.nombre}</span>
                        <span className="text-slate-400">{item.count} ({porcentaje}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-400">
            Analiza el comportamiento operativo por cada campaña o departamento.
          </div>
        </div>

      </div>

      {/* SECCIÓN ADICIONAL: CONSULTA DE HISTORIAL DE NODOS (SELECT NATIVO) */}
      <div className="bg-slate-800 border border-slate-700 p-5 sm:p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Mapa de calor de nodos</h3>
            <p className="text-slate-400 text-sm mt-1">
              Reportes por nodo en los últimos 90 días. Con {UMBRAL_REQUISICION} o más reportes se recomienda requisición de compra. Haz clic en un nodo para ver su expediente.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0" aria-hidden="true">
            Menos
            {[0.15, 0.35, 0.55, 0.8, 1].map(n => (
              <span key={n} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(94, 106, 210, ${n})` }} />
            ))}
            Más
          </div>
        </div>

        {reportesPorNodo.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">No hay reportes de nodos en los últimos 90 días con los filtros actuales.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {reportesPorNodo.slice(0, 48).map(([nodo, cantidad]) => {
              const requiereCompra = cantidad >= UMBRAL_REQUISICION;
              const intensidad = 0.15 + 0.85 * (cantidad / maximoReportes);
              return (
                <button
                  key={nodo}
                  onClick={() => { setNodoSeleccionadoHistorial(nodo); setBusquedaNodoTexto(''); }}
                  title={`${nodo}: ${cantidad} reporte${cantidad === 1 ? '' : 's'}${requiereCompra ? ' · requiere requisición' : ''}`}
                  className={`rounded-lg px-2.5 py-2 text-left border transition-colors cursor-pointer ${requiereCompra ? 'border-red-400/60' : 'border-transparent hover:border-slate-500'}`}
                  style={{ backgroundColor: `rgba(94, 106, 210, ${intensidad})` }}
                >
                  <span className="block font-mono text-xs text-white truncate">{nodo}</span>
                  <span className="block text-lg font-semibold text-white leading-tight">{cantidad}</span>
                </button>
              );
            })}
          </div>
        )}
        {reportesPorNodo.length > 48 && (
          <p className="text-xs text-slate-500">Mostrando los 48 nodos con más reportes de {reportesPorNodo.length}.</p>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Expediente e Historial de Nodos (Últimos 3 Meses)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Selecciona un nodo con reportes previos o escribe cualquier nombre de nodo para consultar sus incidencias en los últimos 90 días.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input aria-label="Escribir el nombre de un nodo" 
              type="text"
              placeholder="Escribe nodo (ej. B-02)…"
              value={busquedaNodoTexto}
              onChange={(e) => {
                setBusquedaNodoTexto(e.target.value);
                if (e.target.value) setNodoSeleccionadoHistorial('');
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono w-full md:w-48"
            />
            <select aria-label="Seleccionar un nodo"
              value={nodoSeleccionadoHistorial}
              onChange={(e) => {
                setNodoSeleccionadoHistorial(e.target.value);
                if (e.target.value) setBusquedaNodoTexto('');
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">-- Seleccionar Nodo --</option>
              {listaNodosConReportes.map((nodo, idx) => (
                <option key={idx} value={nodo}>{nodo}</option>
              ))}
            </select>
          </div>
        </div>

        {nodoActivo && (
          <div className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 mt-4 animate-fade-in">
            <h4 className="text-sm font-medium text-indigo-400">
              Resultados para el nodo: <span className="text-white font-mono">{nodoActivo}</span> ({historialNodoReporte.length} incidencias en 3 meses)
            </h4>

            {historialNodoReporte.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
                <p className="text-slate-400 text-sm font-medium">No hay registros previos para este nodo en los últimos 3 meses.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {historialNodoReporte.map((t, idx) => (
                  <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-indigo-300 font-mono">
                      <span>Folio #{t.folio}</span>
                      <span className="text-slate-400">{t.fecha || t.created_at}</span>
                    </div>
                    <p className="font-bold text-white text-sm">{t.asunto || t.subcategoria}</p>
                    <p className="text-xs text-slate-300">Reportado por: {t.creador} | Técnico: {t.tecnico || 'Sin asignar'} | Estatus: <span className="text-amber-400 font-bold">{t.estatus}</span></p>
                    {t.resolucion && <p className="text-xs text-emerald-400 mt-1">Resolución: {t.resolucion}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      </>
      )}

      {exportAbierto && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 flex justify-center items-center z-50 p-4" onClick={() => setExportAbierto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-exportar"
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-slate-200"
          >
            <EscCierra onCerrar={() => setExportAbierto(false)} />
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 id="titulo-exportar" className="text-lg font-semibold text-white tracking-tight">Exportar a Excel</h3>
              <button onClick={() => setExportAbierto(false)} aria-label="Cerrar" className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 -m-1.5 rounded-lg"><X size={18} strokeWidth={1.75} aria-hidden="true" /></button>
            </div>

            {historial && historial.parcial && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                Solo se cargaron los tickets activos y los cerrados de los últimos {historial.dias} días. Para exportar fechas más antiguas, carga primero el historial completo.
                {' '}<button type="button" onClick={historial.cargarTodo} disabled={historial.cargando} className="underline font-medium cursor-pointer">{historial.cargando ? 'Cargando…' : 'Cargar historial completo'}</button>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="exp-desde" className="block text-xs font-medium text-slate-300 mb-1">Desde</label>
                <input id="exp-desde" type="date" value={expDesde} max={expHasta || undefined} onChange={(e) => setExpDesde(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="exp-hasta" className="block text-xs font-medium text-slate-300 mb-1">Hasta</label>
                <input id="exp-hasta" type="date" value={expHasta} min={expDesde || undefined} onChange={(e) => setExpHasta(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="exp-categoria" className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                <select id="exp-categoria" value={expCategoria} onChange={(e) => { setExpCategoria(e.target.value); setExpSubcategoria(''); }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500">
                  <option value="">Todas las categorías</option>
                  {categoriasExport.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-subcategoria" className="block text-xs font-medium text-slate-300 mb-1">Subcategoría</label>
                <select id="exp-subcategoria" value={expSubcategoria} onChange={(e) => setExpSubcategoria(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500">
                  <option value="">Todas las subcategorías</option>
                  {subcategoriasExport.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Se exportarán <strong className="text-white">{ticketsAExportar.length}</strong> {ticketsAExportar.length === 1 ? 'ticket' : 'tickets'}
              {' '}(se respetan también los filtros de campaña y estatus de arriba). La fecha es la de creación del ticket.
            </p>

            <div className="flex justify-between items-center pt-3 border-t border-slate-700">
              <button type="button" onClick={() => { setExpDesde(''); setExpHasta(''); setExpCategoria(''); setExpSubcategoria(''); }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer">Limpiar filtros</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setExportAbierto(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 cursor-pointer">Cancelar</button>
                <button type="button" onClick={exportarExcel} disabled={ticketsAExportar.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">Exportar</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
