import React, { useState, useEffect } from 'react';

function CentinelaDetallesView({ tickets = [], onVolver, onEditarTicket }) {
  const safeTickets = tickets || [];
  const [datosCentinela, setDatosCentinela] = useState({ campanas: [], equipos: [] });
  const [cargando, setCargando] = useState(true);

  // Consultar la base de datos de Centinela para obtener IPs, Nodos y Campañas actualizadas
  useEffect(() => {
    fetch('/api/centinela/datos')
      .then(res => res.json())
      .then(data => {
        if (data && data.equipos) {
          setDatosCentinela(data);
        }
        setCargando(false);
      })
      .catch(err => {
        console.error("Error al cargar datos técnicos de Centinela:", err);
        setCargando(false);
      });
  }, []);

  // Filtrar únicamente los tickets que sean de tipo Centinela
  const ticketsCentinela = safeTickets.filter(t => 
    t.tipo_solicitud === 'CENTINELA' || 
    (t.categoria || '').toUpperCase().includes('CENTINELA') ||
    (t.grupo || '').toUpperCase().includes('CENTINELA')
  );

  // Agrupar por Nodo y por Componente (Subcategoría)
  const acumulados = {};
  ticketsCentinela.forEach(t => {
    const nodo = (t.equipo || 'DESCONOCIDO').trim().toUpperCase();
    const componente = (t.subcategoria || 'GENERAL').trim().toUpperCase();
    const clave = `${nodo}___${componente}`;

    if (!acumulados[clave]) {
      acumulados[clave] = {
        nodo,
        componente,
        reportes: []
      };
    }
    acumulados[clave].reportes.push(t);
  });

  // Filtrar solo los grupos que alcanzan o superan los 5 reportes (Umbral de requisición de compra)
  const requisicionesPendientes = Object.values(acumulados).filter(item => item.reportes.length >= 5);

  // Función auxiliar para buscar los datos técnicos de Centinela por Nodo
  const obtenerDetallesTecnicosNodo = (nombreNodo) => {
    const equipoEncontrado = datosCentinela.equipos.find(
      eq => (eq.equipo || '').trim().toUpperCase() === nombreNodo.trim().toUpperCase()
    );

    if (!equipoEncontrado) return { ip: 'N/D', campanaNombre: 'N/D' };

    const campanaEncontrada = datosCentinela.campanas.find(
      c => String(c.idcamp) === String(equipoEncontrado.idcamp)
    );

    return {
      ip: equipoEncontrado.ip || 'N/D',
      campanaNombre: campanaEncontrada ? campanaEncontrada.nombre : 'N/D'
    };
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto p-4 text-slate-200">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-800/90 p-6 rounded-2xl border border-slate-700 shadow-xl gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🛡️</span> Módulo de Compras e Inventario
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide uppercase">
            Detalle de Requisiciones Pendientes (5+ Centinelas)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Desglose técnico con IP, Estación/Nodo, Campaña y folios acumulados para trámite de compra urgente.
          </p>
        </div>

        {onVolver && (
          <button 
            onClick={onVolver}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-600 flex items-center gap-2"
          >
            <span>←</span> Regresar al Panel
          </button>
        )}
      </div>

      {/* Contenido Principal */}
      {cargando ? (
        <div className="text-center py-16 text-slate-400 text-sm">Cargando detalles técnicos de Centinela...</div>
      ) : requisicionesPendientes.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 border border-dashed border-slate-700 rounded-3xl space-y-3">
          <div className="text-4xl">✨</div>
          <h2 className="text-lg font-bold text-white">No hay requisiciones pendientes</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Actualmente ningún nodo cuenta con 5 o más reportes del mismo periférico acumulados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requisicionesPendientes.map((item, idx) => {
            const infoTecnica = obtenerDetallesTecnicosNodo(item.nodo);

            return (
              <div key={idx} className="bg-slate-800/90 rounded-2xl border border-purple-500/40 shadow-xl overflow-hidden">
                
                {/* Tarjeta Header con Detalles Técnicos (IP, Estación y Campaña) */}
                <div className="bg-gradient-to-r from-purple-950/80 to-slate-900 px-6 py-4 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🖥️</span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-white uppercase">
                          Nodo / Estación: <span className="text-purple-400 font-mono text-base">{item.nodo}</span>
                        </h2>
                        <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-700 font-mono text-xs text-emerald-400">
                          IP: {infoTecnica.ip}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Campaña / Área: <strong className="text-indigo-300 uppercase">{infoTecnica.campanaNombre}</strong> | Componente Afectado: <strong className="text-white uppercase">{item.componente}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="bg-purple-600/30 border border-purple-500 text-purple-300 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">
                    {item.reportes.length} Reportes Acumulados ⚠️
                  </div>
                </div>

                {/* Tabla de Reportes Asociados */}
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-bold uppercase">
                        <th className="py-2.5 px-3">Folio</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Falla Específica</th>
                        <th className="py-2.5 px-3">Estatus</th>
                        <th className="py-2.5 px-3">Creador</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-medium">
                      {item.reportes.map((rep, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-indigo-400 font-bold">#{rep.folio}</td>
                          <td className="py-3 px-3 text-slate-300">{rep.fecha || rep.created_at?.split('T')[0]}</td>
                          <td className="py-3 px-3 text-white uppercase">{rep.elemento || 'Falla general'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rep.estatus === 'Cerrado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                              {rep.estatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{rep.creador}</td>
                          <td className="py-3 px-3 text-right">
                            {onEditarTicket && (
                              <button
                                onClick={() => onEditarTicket(rep)}
                                className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-indigo-500/40 cursor-pointer"
                              >
                                Gestionar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default CentinelaDetallesView;
