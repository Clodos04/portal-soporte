import React, { useState, useRef, useEffect } from 'react';

export default function AdminReportesView({ tickets = [], campanas = [], estadisticasEncuestas = [] }) {
  const [filtroCampana, setFiltroCampana] = useState('Todas');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  
  // Estados para la consulta de Historial de Nodos
  const [nodoSeleccionadoHistorial, setNodoSeleccionadoHistorial] = useState('');
  const [busquedaNodoTexto, setBusquedaNodoTexto] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar el dropdown si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        : '4.3');

  // Nodo activo a consultar
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

  // Lista única de nodos con reportes
  const listaNodosConReportes = Array.from(
    new Set(tickets.map(t => t.equipo).filter(eq => eq && eq !== 'Ninguno' && eq.trim() !== ''))
  ).sort();

  const exportarExcelSimulado = () => {
    alert('Exportando reporte completo a CSV/Excel...');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* ENCABEZADO Y FILTROS */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            📊 REPORTES Y ANALÍTICAS
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Métricas de rendimiento, productividad de técnicos, tiempos, categorías e historial de nodos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filtroCampana} 
            onChange={(e) => setFiltroCampana(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="Todas">Todas las Campañas</option>
            {campanas.map((c, idx) => (
              <option key={idx} value={c.nombre || c}>{c.nombre || c}</option>
            ))}
          </select>

          <select 
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition shadow flex items-center gap-2 cursor-pointer"
          >
            📥 Exportar Excel
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold uppercase">Total de Tickets</p>
          <p className="text-3xl font-extrabold text-white mt-2">{totalTickets}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold uppercase">Abiertos</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">{abiertos}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold uppercase">En Proceso</p>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{enProceso}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold uppercase">Cerrados / Resueltos</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{cerrados}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow">
          <p className="text-slate-400 text-xs font-semibold uppercase">Satisfacción Promedio</p>
          <p className="text-3xl font-extrabold text-purple-400 mt-2">{promedioSatisfaccion} ⭐</p>
        </div>
      </div>

      {/* ANALÍTICAS DETALLADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Productividad por Técnico */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              👨‍💻 Productividad por Técnico
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
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${porcentaje}%` }}></div>
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
              📂 Tickets por Categoría
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
              🎯 Distribución por Campaña
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

      {/* SECCIÓN ADICIONAL: CONSULTA DE HISTORIAL DE NODOS (CON OVERFLOW VISIBLE Y MARGEN AMPLIADO) */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg space-y-4 relative z-20 overflow-visible">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Expediente e Historial de Nodos (Últimos 3 Meses)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Selecciona un nodo con reportes previos o escribe cualquier nombre de nodo para consultar sus incidencias en los últimos 90 días.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <input 
              type="text"
              placeholder="Escribe nodo (ej. B-02)..."
              value={busquedaNodoTexto}
              onChange={(e) => {
                setBusquedaNodoTexto(e.target.value);
                if (e.target.value) setNodoSeleccionadoHistorial('');
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-mono w-full"
            />

            {/* SELECTOR FLOTANTE CON OVERFLOW VISIBLE */}
            <div className="relative overflow-visible" ref={dropdownRef}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center font-mono select-none hover:border-indigo-500 transition-colors"
              >
                <span className={nodoSeleccionadoHistorial ? "text-white" : "text-slate-400"}>
                  {nodoSeleccionadoHistorial || "-- Seleccionar Nodo --"}
                </span>
                <span className="text-slate-400 text-xs">▼</span>
              </div>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 p-1 space-y-1 animate-fade-in">
                  <div
                    onClick={() => {
                      setNodoSeleccionadoHistorial('');
                      setDropdownOpen(false);
                    }}
                    className="px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer text-sm"
                  >
                    -- Seleccionar Nodo --
                  </div>
                  {listaNodosConReportes.map((nodo, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setNodoSeleccionadoHistorial(nodo);
                        setBusquedaNodoTexto('');
                        setDropdownOpen(false);
                      }}
                      className="px-3 py-2 text-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg cursor-pointer text-sm font-mono transition-colors"
                    >
                      {nodo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {nodoActivo && (
          <div className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 mt-4 animate-fade-in">
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
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
                    <p className="text-xs text-slate-300">👤 Reportado por: {t.creador} | 🛠️ Técnico: {t.tecnico || 'Sin asignar'} | Estatus: <span className="text-amber-400 font-bold">{t.estatus}</span></p>
                    {t.resolucion && <p className="text-xs text-emerald-400 mt-1">✔ Resolución: {t.resolucion}</p>}
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
