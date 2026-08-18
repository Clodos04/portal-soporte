import React, { useState } from 'react';

function EditarSolicitudModal({ ticket, user, usuarios = [], grupos = [], usuariosPorGrupo = {}, categorias = [], onClose, onActualizar, onAbrirChat }) {
  const esCentinela = ticket.tipo_solicitud === 'CENTINELA' || (ticket.categoria || '').toUpperCase().includes('CENTINELA') || (ticket.asunto || '').toUpperCase().includes('CENTINELA');

  const [estatus, setEstatus] = useState(ticket.estatus || 'Abierto');
  // Si es Centinela, por defecto asignamos el grupo 'CENTINELA' si existe, o el que tenga
  const [grupo, setGrupo] = useState(ticket.grupo || (esCentinela ? 'CENTINELA' : (grupos[0] || '')));
  const [tecnico, setTecnico] = useState(ticket.tecnico || 'Sin Asignar');
  const [categoria, setCategoria] = useState(ticket.categoria || (esCentinela ? 'CENTINELA (PERIFÉRICO)' : ''));
  const [subcategoria, setSubcategoria] = useState(ticket.subcategoria || '');
  const [elemento, setElemento] = useState(ticket.elemento || '');
  const [resolucion, setResolucion] = useState(ticket.resolucion || '');
  const [cargando, setCargando] = useState(false);
  
  const [nuevoArchivo, setNuevoArchivo] = useState(null);

  const esCliente = user?.role === 'client';
  const tecnicosDisponibles = usuariosPorGrupo[grupo] || [];

  const categoriaObj = categorias.find(c => c.nombre === categoria);
  const subcategoriasDisponibles = categoriaObj ? categoriaObj.subcategorias.filter(s => s.estatus === 'ACTIVO') : [];
  const subcategoriaObj = subcategoriasDisponibles.find(s => s.nombre === subcategoria);
  const elementosDisponibles = subcategoriaObj ? subcategoriaObj.elementos : [];

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
      resolucion: resolucion,
      archivoNombre: nuevoArchivo ? nuevoArchivo.name : ticket.archivoNombre,
      archivoUrl: nuevoArchivo ? URL.createObjectURL(nuevoArchivo) : ticket.archivoUrl
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
        
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center bg-slate-900/80 px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
              {esCentinela && <span className="text-purple-400">🛡️</span>}
              {esCliente ? `Ver Solicitud #${ticket.folio}` : `Gestionar Solicitud #${ticket.folio}`}
              {esCentinela && <span className="text-xs bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800 ml-2">CENTINELA</span>}
            </h2>
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

        {/* Cuerpo del Formulario */}
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
              onChange={(e) => { setGrupo(e.target.value); setTecnico('Sin Asignar'); }} 
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione Grupo</option>
              {grupos.map((g, idx) => (
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
              {tecnicosDisponibles.map((tec, idx) => (
                <option key={idx} value={tec}>{tec}</option>
              ))}
            </select>
          </div>

          {/* SI ES CENTINELA, MOSTRAMOS LOS DATOS FIJOS DE TIPIFICACIÓN RÁPIDA PARA EVITAR RETRABAJO */}
          {esCentinela ? (
            <div className="bg-purple-950/30 border border-purple-500/30 p-4 rounded-xl space-y-2 text-xs">
              <div className="text-purple-300 font-bold uppercase">🛡️ Tipificación Automática Centinela:</div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Componente: <strong className="text-white uppercase">{ticket.subcategoria || 'Periférico'}</strong></div>
                <div>Falla: <strong className="text-white uppercase">{ticket.elemento || 'Daño reportado'}</strong></div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Categoría:</label>
                <select 
                  value={categoria} 
                  disabled={esCliente}
                  onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); setElemento(''); }} 
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione Categoría</option>
                  {categorias.filter(c => c.estatus === 'ACTIVO').map((cat, idx) => (
                    <option key={idx} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Sub-Categoría:</label>
                <select 
                  value={subcategoria} 
                  disabled={esCliente}
                  onChange={(e) => { setSubcategoria(e.target.value); setElemento(''); }} 
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione Sub-Categoría</option>
                  {subcategoriasDisponibles.map((sub, idx) => (
                    <option key={idx} value={sub.nombre}>{sub.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Elemento:</label>
                <select 
                  value={elemento} 
                  disabled={esCliente}
                  onChange={(e) => setElemento(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione Elemento</option>
                  {elementosDisponibles.map((elem, idx) => (
                    <option key={idx} value={elem.nombre}>{elem.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Equipo(s) / Nodo:</label>
            <input 
              type="text" 
              value={ticket.equipo || 'Ninguno'} 
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

      </div>
    </div>
  );
}

export default EditarSolicitudModal;
