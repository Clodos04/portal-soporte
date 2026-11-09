import React, { useState } from 'react';
import { useAvisos } from '../components/Avisos';
import { exportarCSV } from '../utils/exportar';
import AvisoHistorial from '../components/AvisoHistorial';

export default function AdminReportesView({ historial, tickets = [], campanas = [], estadisticasEncuestas = [], user, onIrACentinela }) {
  const { avisar } = useAvisos();
  const [filtroCampana, setFiltroCampana] = useState('Todas');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  
  // Estados para la consulta de Historial de Nodos
  const [nodoSeleccionadoHistorial, setNodoSeleccionadoHistorial] = useState('');
  const [busquedaNodoTexto, setBusquedaNodoTexto] = useState('');

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esAdmin = rolUsuario === 'support' || rolUsuario === 'administrador' || rolUsuario === 'admin';

  // Filtrar tickets según los selectores superiores
  const ticketsFiltrados = tickets.filter(t => {
    const matchCampana = filtroCampana === 'Todas' || (t.campana || '').trim().toUpperCase() === filtroCampana.trim().toUpperCase();
    const matchEstatus = filtroEstatus === 'Todos' || (t.estatus || '').trim().toUpperCase() === filtroEstatus.trim().toUpperCase();
    return matchCampana && matchEstatus;
  });

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

  const promedioSatisfaccion = estadisticasEncuestas?.estadisticas?.promedio 
    ? Number(estadisticasEncuestas.estadisticas.promedio).toFixed(1)
    : (listaEncuestas.length > 0
        ? (listaEncuestas.reduce((acc, e) => acc + (Number(e.calificacion) || Number(e.promedio) || 0), 0) / listaEncuestas.length).toFixed(1)
        : null);

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
    ticketsFiltrados.reduce((acc, t) => {
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

  const exportarExcelSimulado = () => {
    if (ticketsFiltrados.length === 0) { avisar('No hay tickets para exportar con los filtros seleccionados.', 'info'); return; }
    exportarCSV(ticketsFiltrados, [
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
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AvisoHistorial historial={historial} />
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
            onClick={exportarExcelSimulado}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition shadow flex items-center gap-2 cursor-pointer"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold">Total de Tickets</p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalTickets}</p>
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
          <p className="text-slate-400 text-xs font-semibold">Satisfacción Promedio</p>
          <p className="text-3xl font-semibold text-white mt-2">{promedioSatisfaccion ?? '—'} </p>
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

    </div>
  );
}
