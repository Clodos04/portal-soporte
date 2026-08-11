import React, { useState, useEffect } from 'react';
import { equiposPorCampana } from '../../equiposData.cjs';
import { listaCampanas } from '../../campanasData.cjs';
import AsistenteTipificacionView from './AsistenteTipificacionView';

function NuevaSolicitudView({ user, usuarios = [], grupos = [], campanas = [], usuariosPorGrupo = {}, categorias = [], onVolver, onGuardar }) {
  const [estado, setEstado] = useState('ABIERTO');
  const [grupo, setGrupo] = useState('');
  const [usuarioAsignado, setUsuarioAsignado] = useState('Sin Asignar');
  
  const categoriasActivas = categorias.filter(c => c.estatus === 'ACTIVO');
  const [categoria, setCategoria] = useState('');
  
  const categoriaObj = categoriasActivas.find(c => c.nombre === categoria);
  const subcategoriasDisponibles = categoriaObj ? (categoriaObj?.subcategorias || []).filter(s => s.estatus === 'ACTIVO') : [];
  const [subCategoria, setSubCategoria] = useState('');

  const subcategoriaObj = subcategoriasDisponibles.find(s => s.nombre === subCategoria);
  const elementosDisponibles = subcategoriaObj ? (subcategoriaObj?.elementos || []) : [];
  const [elemento, setElemento] = useState('');

  // Por defecto, si entra un cliente, abrimos de inmediato el asistente de tipificación grande para guiarlo
  const [isAsistenteOpen, setIsAsistenteOpen] = useState(true);

  const campanasDisponibles = campanas.length > 0 ? campanas : listaCampanas;
  
  const [areaCliente, setAreaCliente] = useState('');
  const [campana, setCampana] = useState('');

  const clientesDisponibles = usuarios.filter(u => u.campana === campana && u.estatus === 'ACTIVO');
  
  const [nombreCliente, setNombreCliente] = useState('');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const listaEquiposActuales = equiposPorCampana[campana] || [];

  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [nivel, setNivel] = useState('Seleccione Una Opcion...');
  const [modo, setModo] = useState('Seleccione Una Opcion...');
  const [archivo, setArchivo] = useState(null);

  const tecnicosDisponibles = usuariosPorGrupo[grupo] || [];

  // Autocompletar datos del usuario logueado al cargar
  useEffect(() => {
    if (user && user.name) {
      // Buscamos si el usuario actual existe en la lista de usuarios registrados
      const usuarioEnBD = usuarios.find(u => `${u.nombre} ${u.paterno}`.toLowerCase() === user.name.toLowerCase() || u.username === user.username);
      
      if (usuarioEnBD) {
        setCampana(usuarioEnBD.campana || '');
        setAreaCliente(usuarioEnBD.campana || '');
        setNombreCliente(`${usuarioEnBD.nombre} ${usuarioEnBD.paterno}`);
      } else {
        setNombreCliente(user.name);
      }
    }
  }, [user, usuarios]);

  const handleCambioCampana = (e) => {
    const nuevaCampana = e.target.value;
    setCampana(nuevaCampana);
    setAreaCliente(nuevaCampana);
    setEquiposSeleccionados([]);

    const filtrados = usuarios.filter(u => u.campana === nuevaCampana && u.estatus === 'ACTIVO');
    if (filtrados.length > 0) {
      setNombreCliente(`${filtrados[0].nombre} ${filtrados[0].paterno}`);
    } else {
      setNombreCliente('');
    }
  };

  const handleCambioCategoria = (e) => {
    const nuevaCat = e.target.value;
    setCategoria(nuevaCat);
    setSubCategoria('');
    setElemento('');
  };

  const handleCambioSubcategoria = (e) => {
    const nuevaSub = e.target.value;
    setSubCategoria(nuevaSub);
    setElemento('');
  };

  const handleSeleccionarTipificacionDelAsistente = (resultado) => {
    if (resultado.categoria) setCategorySafe(resultado.categoria.nombre);
    if (resultado.subcategoria) setSubCategoria(resultado.subcategoria.nombre);
    if (resultado.elemento) setElemento(resultado.elemento.nombre);
    setIsAsistenteOpen(false);
  };

  // Función auxiliar interna para categoría
  const setCategorySafe = (nombreCat) => {
    setCategoria(nombreCat);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nuevoFolio = Math.floor(10000 + Math.random() * 90000).toString();
    const fechaHoy = new Date().toISOString().split('T')[0];

    let colorEstatus = 'bg-green-500';
    if (estado === 'EN PROCESO') colorEstatus = 'bg-orange-500';
    if (estado === 'CERRADO') colorEstatus = 'bg-red-500';

    const ticketNuevo = {
      folio: nuevoFolio,
      notas: [],
      estatus: estado === 'ABIERTO' ? 'Abierto' : (estado === 'EN PROCESO' ? 'En Proceso' : 'Cerrado'),
      colorEstatus: colorEstatus,
      tecnico: usuarioAsignado,
      creador: nombreCliente || user?.name || 'SIN ASIGNAR',
      asunto: asunto,
      descripcion: descripcion,
      campana: campana,
      equipo: equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno',
      nivel: nivel,
      modo: modo,
      fecha: fechaHoy,
      grupo: grupo || 'Soporte Técnico',
      categoria: categoria || 'GENERAL',
      subcategoria: subCategoria,
      elemento: elemento,
      resolucion: '',
      archivoNombre: archivo ? archivo.name : null,
      archivoUrl: archivo ? URL.createObjectURL(archivo) : null
    };

    onGuardar(ticketNuevo);
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-black text-white tracking-wide uppercase">Asistente de Solicitud Nueva</h1>
          <p className="text-slate-400 text-sm mt-1">Registro guiado de incidencias y soporte técnico</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setIsAsistenteOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>🤖</span> Abrir Asistente Guiado
          </button>
          <button 
            type="button" 
            onClick={onVolver} 
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow transition-colors border border-slate-600 cursor-pointer"
          >
            Regresar
          </button>
        </div>
      </div>

      {/* ASISTENTE DE TIPIFICACIÓN EN PANTALLA GRANDE SI ESTÁ ACTIVO */}
      {isAsistenteOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="max-w-4xl w-full">
            <AsistenteTipificacionView
              categorias={categoriasActivas}
              onSeleccionarTipificacion={handleSeleccionarTipificacionDelAsistente}
              onCancelar={() => setIsAsistenteOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/60 p-6 rounded-xl border border-slate-700">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Estado:</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="ABIERTO">ABIERTO</option>
                  <option value="EN PROCESO">EN PROCESO</option>
                  <option value="CERRADO">CERRADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Grupo Asignado:</label>
                <select value={grupo} onChange={(e) => { setGrupo(e.target.value); setUsuarioAsignado('Sin Asignar'); }} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Grupo</option>
                  {grupos.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Técnico / Usuario asignado:</label>
                <select value={usuarioAsignado} onChange={(e) => setUsuarioAsignado(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="Sin Asignar">Sin Asignar</option>
                  {tecnicosDisponibles.map((tec, idx) => (
                    <option key={idx} value={tec}>{tec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-300 uppercase">Categorización del Ticket:</label>
                <button
                  type="button"
                  onClick={() => setIsAsistenteOpen(true)}
                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-indigo-500/40 flex items-center gap-1.5 shadow cursor-pointer"
                >
                  🤖 Abrir Asistente Guiado
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoría:</label>
                <select value={categoria} onChange={handleCambioCategoria} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Categoría</option>
                  {categoriasActivas.map((cat, idx) => (
                    <option key={idx} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub-Categoría:</label>
                <select value={subCategoria} onChange={handleCambioSubcategoria} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Sub-Categoría</option>
                  {subcategoriasDisponibles.map((sub, idx) => (
                    <option key={idx} value={sub.nombre}>{sub.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Elemento:</label>
                <select value={elemento} onChange={(e) => setElemento(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Elemento</option>
                  {elementosDisponibles.map((elem, idx) => (
                    <option key={idx} value={elem.nombre}>{elem.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-indigo-300 border-b border-slate-700 pb-2">Información del Cliente (Autocompletada)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Área (Campaña):</label>
                <select value={areaCliente} onChange={(e) => { setAreaCliente(e.target.value); handleCambioCampana(e); }} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Área</option>
                  {campanasDisponibles.map((camp, idx) => (
                    <option key={idx} value={camp}>{camp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nombre (Usuario Logueado):</label>
                <input 
                  type="text" 
                  value={nombreCliente} 
                  readOnly 
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-indigo-300 font-medium text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Asunto:</label>
              <input 
                type="text" 
                required
                placeholder="Breve resumen del problema..."
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Descripción:</label>
              <textarea 
                rows="3" 
                required
                placeholder="Detalla los síntomas o pasos para reproducir el fallo..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 resize-none transition-colors"
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Equipo (Seleccione uno o más):</label>
              <div className="w-full h-36 overflow-y-auto px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm space-y-1.5">
                {listaEquiposActuales.length === 0 ? (
                  <span className="text-slate-500 italic text-xs">Seleccione una campaña para ver los equipos disponibles</span>
                ) : (
                  listaEquiposActuales.map((eq, idx) => {
                    const isSelected = equiposSeleccionados.includes(eq);
                    return (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/80 p-1.5 rounded transition-colors">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEquiposSeleccionados([...equiposSeleccionados, eq]);
                            } else {
                              setEquiposSeleccionados(equiposSeleccionados.filter(item => item !== eq));
                            }
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span className="text-xs text-slate-200 font-mono">{eq}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-indigo-400 mt-1 font-medium">
                Seleccionados: {equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nivel:</label>
                <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="Seleccione Una Opcion...">Seleccione Una Opcion...</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Experto">Experto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Campaña:</label>
                <select value={campana} onChange={handleCambioCampana} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Seleccione Campaña</option>
                  {campanasDisponibles.map((camp, idx) => (
                    <option key={idx} value={camp}>{camp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Modo:</label>
                <select value={modo} onChange={(e) => setModo(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-colors">
                  <option value="Seleccione Una Opcion...">Seleccione Una Opcion...</option>
                  <option value="CORREO">CORREO</option>
                  <option value="TELEFONO">TELEFONO</option>
                  <option value="VERBAL">VERBAL</option>
                  <option value="WEB">WEB</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Adjuntar Archivo:</label>
            <input 
              type="file" 
              onChange={(e) => setArchivo(e.target.files[0])}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer bg-slate-900/60 p-2 rounded-xl border border-slate-700 w-full" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
            <button 
              type="button" 
              onClick={onVolver} 
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
            >
              Guardar Solicitud
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default NuevaSolicitudView;
