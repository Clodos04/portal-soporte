import React, { useState, useEffect } from 'react';

function EditarSolicitudModal({ ticket = {}, user, usuarios = [], grupos = [], usuariosPorGrupo = {}, categorias = [], onClose, onActualizar, onAbrirChat }) {
  const esCentinela = ticket.tipo_solicitud === 'CENTINELA' || (ticket.categoria || '').toUpperCase().includes('CENTINELA') || (ticket.asunto || '').toUpperCase().includes('CENTINELA');

  const listaGrupos = Array.isArray(grupos) ? grupos : [];
  const listaCategorias = Array.isArray(categorias) ? categorias : [];

  const [estatus, setEstatus] = useState(ticket.estatus || 'Abierto');
  
  // CORREGIDO: Inicialización robusta para que detecte grupo y técnico sin perderlos
  const grupoInicial = esCentinela ? 'CENTINELA' : (ticket.grupo || listaGrupos[0] || '');
  const [grupo, setGrupo] = useState(grupoInicial);
  const [tecnico, setTecnico] = useState(ticket.tecnico || 'Sin Asignar');
  
  const [categoria, setCategoria] = useState(ticket.categoria || (esCentinela ? 'CENTINELA (PERIFÉRICO)' : ''));
  const [subcategoria, setSubcategoria] = useState(ticket.subcategoria || '');
  const [elemento, setElemento] = useState(ticket.elemento || '');
  const [equipoNodo, setEquipoNodo] = useState(ticket.equipo || 'Ninguno');
  const [resolucion, setResolucion] = useState(ticket.resolucion || '');
  const [cargando, setCargando] = useState(false);

  // Estados para la mini-ventana de Cambiar Nodo (Centinela) e Historial
  const [modalCambiarNodoOpen, setModalCambiarNodoOpen] = useState(false);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [nodosCentinela, setNodosCentinela] = useState([]);
  const [campanasCentinela, setCampanasCentinela] = useState([]);
  const [busquedaNodo, setBusquedaNodo] = useState('');
  const [historialNodo, setHistorialNodo] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const esCliente = user?.role === 'client';
  const esSoporte = user?.role === 'support' || (user?.nivel || '').toUpperCase() === 'ADMINISTRADOR' || (user?.nivel || '').toUpperCase() === 'TECNICO';

  // Obtener técnicos del grupo seleccionado (con búsqueda flexible)
  const grupoEncontrado = listaGrupos.find(g => g.toUpperCase() === grupo.toUpperCase()) || grupo;
  const tecnicosDisponibles = (usuariosPorGrupo && Array.isArray(usuariosPorGrupo[grupoEncontrado])) 
    ? usuariosPorGrupo[grupoEncontrado] 
    : [];

  // Asegurar que si el ticket trae un técnico asignado, aparezca en las opciones aunque pertenezca a otro grupo
  const tecnicosFinales = [...newSetTecnicos([...tecnicosDisponibles, ticket.tecnico])];
  function setTecnicosUnicos(arr) {
    return Array.from(new Set(arr.filter(t => t && t !== 'Sin Asignar')));
  }

  const categoriaObj = listaCategorias.find(
    c => (c?.nombre || '').toUpperCase() === (categoria || '').toUpperCase()
  );

  const subcategoriasDisponibles = Array.isArray(categoriaObj?.subcategorias)
    ? categoriaObj.subcategorias.filter(s => (s?.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
    : [];

  const subcategoriaObj = subcategoriasDisponibles.find(
    s => (s?.nombre || '').toUpperCase() === (subcategoria || '').toUpperCase()
  );

  const elementosDisponibles = Array.isArray(subcategoriaObj?.elementos)
    ? subcategoriaObj.elementos.filter(el => (el?.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
    : [];

  // Cargar datos de Centinela para el cambio de nodo
  const abrirSelectorNodo = async () => {
    setModalCambiarNodoOpen(true);
    try {
      const res = await fetch('/api/centinela/datos');
      const data = await res.json();
      if (data && data.equipos) {
        setNodosCentinela(data.equipos);
        setCampanasCentinela(data.campanas || []);
      }
    } catch (err) {
      console.error('Error al cargar datos de Centinela:', err);
    }
  };

  // Cargar historial de 3 meses del nodo
  const abrirHistorialNodo = async () => {
    setModalHistorialOpen(true);
    setCargandoHistorial(true);
    try {
      const res = await fetch('/api/tickets');
      const todosLosTickets = await res.json();
      if (Array.isArray(todosLosTickets)) {
        // Filtrar tickets de los últimos 3 meses para este mismo equipo/nodo
        const ahora = new Date();
        const haceTresMeses = new Date();
        haceTresMeses.setMonth(ahora.getMonth() - 3);

        const filtrados = todosLosTickets.filter(t => {
          if (!t.equipo || t.equipo.toUpperCase() !== (equipoNodo || '').toUpperCase()) return false;
          const fechaT = new Date(t.created_at || t.fecha);
          return fechaT >= haceTresMeses;
        });
        setHistorialNodo(filtrados);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleCambioTecnico = (e) => {
    if (esCliente) return;
    const nuevoTecnico = e.target.value;
    setTecnico(nuevoTecnico);

    if (nuevoTecnico !== 'Sin Asignar' && (estatus === 'Abierto' || estatus === 'ABIERTO')) {
      setEstatus('En Proceso');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (esCliente) {
      onClose();
      return;
    }

    let colorEstatus = 'bg-green-500';
    if (estatus === 'En Proceso' || estatus === 'EN PROCESO') colorEstatus = 'bg-orange-500';
    if (estatus === 'Cerrado' || estatus === 'CERRADO') colorEstatus = 'bg-red-500';

    const datosActualizados = {
      estatus: estatus,
      colorEstatus: colorEstatus,
      grupo: grupo,
      tecnico: tecnico,
      categoria: categoria,
      subcategoria: subcategoria,
      elemento: elemento,
      equipo: equipoNodo,
      resolucion: resolucion
    };

    setCargando(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.folio}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosActualizados),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el ticket en el servidor');
      }

      const ticketFinal = { ...ticket, ...datosActualizados };
      if (onActualizar) {
        onActualizar(ticketFinal);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('No se pudo guardar el cambio en la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-200 animate-fade-in max-h-[90vh] flex flex-col">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center bg-slate-900/80 px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
              {esCentinela && <span className="text-purple-400">🛡️</span>}
              {esCliente ? `Ver Solicitud #${ticket.folio}` : `Gestionar Solicitud #${ticket.folio}`}
            </h2>
            
            {esSoporte && (
              <button
                type="button"
                onClick={abrirHistorialNodo}
                className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-indigo-500/40 flex items-center gap-1 cursor-pointer"
              >
                <span>📋</span> Historial Nodo (3m)
              </button>
            )}

            {!esCliente && onAbrirChat && (
              <button
                type="button"
                onClick={() => { onClose(); onAbrirChat(ticket.folio); }}
                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
              >
                💬 Abrir Chat
              </button>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
          
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Estado:</label>
            <select 
              value={estatus} 
              disabled={esCliente}
              onChange={(e) => setEstatus(e.target.value)} 
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Abierto">Abierto</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Grupo Asignado:</label>
            <select 
              value={grupo} 
              disabled={esCliente}
              onChange={(e) => { setGrupo(e.target.value); }} 
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione Grupo</option>
              {listaGrupos.map((g, idx) => (
                <option key={idx} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Técnico / Usuario Asignado:</label>
            <select 
              value={tecnico} 
              disabled={esCliente}
              onChange={handleCambioTecnico} 
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Sin Asignar">Sin Asignar</option>
              {setTecnicosUnicos([...tecnicosDisponibles, ticket.tecnico]).map((tec, idx) => (
                <option key={idx} value={tec}>{tec}</option>
              ))}
            </select>
          </div>

          {/* EQUIPO / NODO CON BOTÓN DE CAMBIO DESDE CENTINELA */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase">Equipo(s) / Nodo:</label>
              {esSoporte && (
                <button
                  type="button"
                  onClick={abrirSelectorNodo}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span> Cambiar Nodo (Centinela)
                </button>
              )}
            </div>
            <input 
              type="text" 
              value={equipoNodo} 
              disabled 
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-green-400 font-mono text-sm outline-none opacity-90 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Resolución / Comentarios:</label>
            <textarea 
              rows="3" 
              value={resolucion} 
              disabled={esCliente}
              onChange={(e) => setResolucion(e.target.value)}
              placeholder="Describa cómo se resolvió el requerimiento..."
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 resize-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer"
            >
              {esCliente ? 'Cerrar' : 'Cancelar'}
            </button>
            {!esCliente && (
              <button 
                type="submit" 
                disabled={cargando}
                className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-600/30 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cargando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}
          </div>
        </form>

        {/* MINI MODAL: CAMBIAR NODO DESDE CENTINELA */}
        {modalCambiarNodoOpen && (
          <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <span>🔍</span> Seleccionar Nodo Correcto (Centinela)
              </h3>
              <button 
                onClick={() => setModalCambiarNodoOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <input 
              type="text"
              placeholder="Escribe para buscar nodo (ej. B-02-250)..."
              value={busquedaNodo}
              onChange={(e) => setBusquedaNodo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 mb-4 font-mono"
            />
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {nodosCentinela
                .filter(n => (n.equipo || '').toLowerCase().includes(busquedaNodo.toLowerCase()))
                .slice(0, 50)
                .map((n, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      setEquipoNodo(n.equipo);
                      setModalCambiarNodoOpen(false);
                    }}
                    className="p-3 bg-slate-900 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-mono font-bold text-green-400">{n.equipo}</span>
                      <span className="text-xs text-slate-400 ml-3">IP: {n.ip || 'S/N'}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-400">Seleccionar ➔</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MINI MODAL: HISTORIAL DE NODO (ÚLTIMOS 3 MESES) */}
        {modalHistorialOpen && (
          <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <span>📋</span> Historial de Mantenimiento y Reportes (Últimos 3 Meses) - Nodo: <strong className="text-indigo-400">{equipoNodo}</strong>
              </h3>
              <button 
                onClick={() => setModalHistorialOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cargandoHistorial ? (
                <p className="text-center text-slate-400 py-10">Cargando expediente del nodo...</p>
              ) : historialNodo.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
                  <p className="text-slate-400 text-sm font-medium">No hay registros previos para este nodo en los últimos 3 meses.</p>
                </div>
              ) : (
                historialNodo.map((t, idx) => (
                  <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-indigo-400 font-mono">
                      <span>Folio #{t.folio}</span>
                      <span className="text-slate-400">{t.fecha || t.created_at}</span>
                    </div>
                    <p className="font-bold text-white text-sm">{t.asunto || t.subcategoria}</p>
                    <p className="text-xs text-slate-300">👤 Creado por: {t.creador} | 🛠️ Atendido por: {t.tecnico || 'Sin asignar'}</p>
                    {t.resolucion && <p className="text-xs text-emerald-400 mt-1">✔ Resolución: {t.resolucion}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EditarSolicitudModal;
