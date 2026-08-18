import React, { useState } from 'react';

function AsistenteTipificacionView({ categorias = [], campanas = [], equipos = [], user, usuarios = [], onGuardarTicket, onCancelar }) {
  const [tipoReporte, setTipoReporte] = useState(null); // 'REPORTE' o 'CENTINELA'
  const [paso, setPaso] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [campanaSeleccionadaId, setCampanaSeleccionadaId] = useState('');
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [nivel, setNivel] = useState('Bajo');
  const [modo, setModo] = useState('WEB');
  const [archivo, setArchivo] = useState(null);

  const opcionesFijas = [
    { id: 1, nombre: "HARDWARE (EQUIPO)" },
    { id: 2, nombre: "SOFTWARE" },
    { id: 3, nombre: "APLICACIONES INHOUSE" },
    { id: 4, nombre: "MANTENIMIENTO" }
  ];

  const opcionesMostradas = opcionesFijas.map(opcion => {
    const encontradaEnBD = categorias.find(cat => cat.nombre.toUpperCase().includes(opcion.nombre.split(' ')[0]));
    return encontradaEnBD ? encontradaEnBD : { id: opcion.id, nombre: opcion.nombre, subcategorias: [] };
  });

  const listaEquiposActuales = equipos
    .filter(eq => String(eq.idcamp) === String(campanaSeleccionadaId))
    .map(eq => eq.equipo);

  const reiniciar = () => {
    setTipoReporte(null);
    setPaso(1);
    setCategoriaSeleccionada(null);
    setSubcatSeleccionada(null);
    setElementoSeleccionado(null);
  };

  const seleccionarCat = (cat) => {
    setCategoriaSeleccionada(cat);
    setSubcatSeleccionada(null);
    setElementoSeleccionado(null);
    if (cat.subcategorias && cat.subcategorias.length > 0) {
      setPaso(2);
    } else {
      setPaso(4);
    }
  };

  const seleccionarSubcat = (sub) => {
    setSubcatSeleccionada(sub);
    setElementoSeleccionado(null);
    if (sub.elementos && sub.elementos.length > 0) {
      setPaso(3);
    } else {
      setPaso(4);
    }
  };

  const seleccionarElemento = (elem) => {
    setElementoSeleccionado(elem);
    setPaso(5);
  };

  const handleFinalizarReporte = () => {
    const nuevoFolio = Math.floor(10000 + Math.random() * 90000).toString();
    const fechaHoy = new Date().toISOString().split('T')[0];
    const campObj = campanas.find(c => String(c.idcamp) === String(campanaSeleccionadaId));

    // Si es Centinela, ajustamos el prefijo del asunto o una etiqueta especial para identificarlo
    const prefijoTitulo = tipoReporte === 'CENTINELA' ? '[CENTINELA - REQUISICIÓN] ' : '[REPORTE] ';

    const ticketNuevo = {
      folio: nuevoFolio,
      notas: [],
      estatus: 'Abierto',
      colorEstatus: tipoReporte === 'CENTINELA' ? 'bg-purple-500' : 'bg-green-500',
      tecnico: 'Sin Asignar',
      creador: user?.name || 'VALERIA GOMEZ',
      asunto: prefijoTitulo + (asunto || (tipoReporte === 'CENTINELA' ? 'Falla recurrente de periférico' : 'Sin asunto')),
      descripcion: descripcion || 'Sin descripción',
      campana: campObj ? campObj.nombre : 'General',
      equipo: equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno',
      nivel: tipoReporte === 'CENTINELA' ? 'Medio' : nivel,
      modo: modo,
      fecha: fechaHoy,
      grupo: 'Soporte Técnico',
      categoria: tipoReporte === 'CENTINELA' ? 'CENTINELA (PERIFÉRICO)' : (categoriaSeleccionada?.nombre || 'GENERAL'),
      subcategoria: subcatSeleccionada?.nombre || '',
      elemento: elementoSeleccionado?.nombre || '',
      resolucion: '',
      archivoNombre: archivo ? archivo.name : null,
      archivoUrl: archivo ? URL.createObjectURL(archivo) : null,
      tipo_solicitud: tipoReporte // Guardamos si es REPORTE o CENTINELA
    };

    if (onGuardarTicket) {
      onGuardarTicket(ticketNuevo);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden font-sans my-auto flex flex-col max-h-[85vh]">
      
      <div className="bg-slate-800/90 py-4 px-6 text-center border-b border-slate-700 flex justify-between items-center shrink-0">
        <div></div>
        <h2 className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
          <span>🤖</span> ASISTENTE DE TIPIFICACIÓN GUIADA
        </h2>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">
            ✕
          </button>
        )}
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        
        {/* PASO 0: Seleccionar tipo de solicitud (Reporte vs Centinela) */}
        {!tipoReporte ? (
          <div className="space-y-4 animate-fade-in py-4 text-center">
            <h3 className="text-lg font-bold text-white">¿Qué tipo de registro deseas realizar?</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">Selecciona si se trata de un reporte de falla común o un reporte Centinela para acumulación de periféricos dañados.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
              <button
                type="button"
                onClick={() => setTipoReporte('REPORTE')}
                className="p-5 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-indigo-500 text-left transition-all group cursor-pointer shadow-lg space-y-2"
              >
                <div className="text-2xl">🛠️</div>
                <div className="font-bold text-white text-sm uppercase">Reporte de Soporte / Falla</div>
                <div className="text-xs text-slate-400">Incidencia técnica general o problema operativo cotidiano.</div>
              </button>

              <button
                type="button"
                onClick={() => setTipoReporte('CENTINELA')}
                className="p-5 rounded-2xl bg-purple-950/40 border-2 border-purple-800/60 hover:border-purple-500 text-left transition-all group cursor-pointer shadow-lg space-y-2"
              >
                <div className="text-2xl">🛡️</div>
                <div className="font-bold text-purple-300 text-sm uppercase">Reporte Centinela</div>
                <div className="text-xs text-slate-400">Acumulación de reportes por periférico dañado (Requiere 5+ para requisición).</div>
              </button>
            </div>
          </div>
        ) : (
          <>
            {paso < 5 && (
              <div className="flex items-center justify-between mb-2 px-4">
                <div className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800">
                  Modo: {tipoReporte === 'CENTINELA' ? '🛡️ CENTINELA' : '🛠️ REPORTE NORMAL'}
                </div>
                <button type="button" onClick={() => setTipoReporte(null)} className="text-xs font-bold text-slate-400 hover:text-white underline cursor-pointer">
                  « Cambiar tipo
                </button>
              </div>
            )}

            {paso === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-base font-bold text-white text-center">¿Qué área o servicio te está presentando problemas?</h3>
                <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
                  {opcionesMostradas.map((cat, idx) => (
                    <button
                      key={cat.id || idx}
                      type="button"
                      onClick={() => seleccionarCat(cat)}
                      className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 transition-all text-left flex items-center justify-between group cursor-pointer shadow-md"
                    >
                      <span className="font-bold text-white text-sm uppercase tracking-wide">{cat.nombre}</span>
                      <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform font-bold">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === 2 && categoriaSeleccionada && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300">Área: <strong className="text-indigo-400 uppercase">{categoriaSeleccionada.nombre}</strong></span>
                  <button type="button" onClick={() => setPaso(1)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar área</button>
                </div>
                <h4 className="text-sm font-bold text-white text-center">¿En qué módulo ocurre el problema?</h4>
                {(!categoriaSeleccionada.subcategorias || categoriaSeleccionada.subcategorias.length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400 italic text-xs mb-3">No hay módulos registrados en esta área.</p>
                    <button type="button" onClick={() => setPaso(4)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Continuar sin módulo →</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoriaSeleccionada.subcategorias.map((sub) => (
                      <button
                        key={sub.id || sub.nombre}
                        type="button"
                        onClick={() => seleccionarSubcat(sub)}
                        className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer"
                      >
                        <span className="font-semibold text-white text-xs uppercase">{sub.nombre}</span>
                        <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paso === 3 && subcatSeleccionada && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300">Módulo: <strong className="text-indigo-400 uppercase">{subcatSeleccionada.nombre}</strong></span>
                  <button type="button" onClick={() => setPaso(2)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar módulo</button>
                </div>
                <h4 className="text-sm font-bold text-white text-center">Selecciona la falla específica:</h4>
                {(!subcatSeleccionada.elementos || subcatSeleccionada.elementos.length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400 italic text-xs mb-3">No hay elementos específicos en este módulo.</p>
                    <button type="button" onClick={() => setPaso(5)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Continuar a Detalles →</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subcatSeleccionada.elementos.map((elem) => (
                      <button
                        key={elem.id || elem.nombre}
                        type="button"
                        onClick={() => seleccionarElemento(elem)}
                        className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer"
                      >
                        <span className="font-semibold text-white text-xs uppercase">{elem.nombre}</span>
                        <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paso === 4 && (
              <div className="space-y-4 animate-fade-in text-center py-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mx-auto text-xl border border-emerald-500/30">
                  ✓
                </div>
                <h3 className="text-base font-black text-white uppercase">Tipificación Detectada</h3>
                
                <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 max-w-md mx-auto text-left space-y-1 text-xs">
                  <div>Tipo: <strong className={tipoReporte === 'CENTINELA' ? 'text-purple-400' : 'text-indigo-400'}>{tipoReporte}</strong></div>
                  <div>Área: <strong className="text-white uppercase">{categoriaSeleccionada?.nombre}</strong></div>
                  {subcatSeleccionada && <div>Módulo: <strong className="text-white uppercase">{subcatSeleccionada?.nombre}</strong></div>}
                  {elementoSeleccionado && <div>Falla: <strong className="text-indigo-400 uppercase">{elementoSeleccionado?.nombre}</strong></div>}
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button type="button" onClick={() => setPaso(1)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer">
                    Regresar
                  </button>
                  <button type="button" onClick={() => setPaso(5)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer">
                    Continuar a Detalles del Reporte →
                  </button>
                </div>
              </div>
            )}

            {paso === 5 && (
              <div className="space-y-4 animate-fade-in pb-2">
                <div className="flex justify-between items-center bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-xs text-indigo-300 font-bold">📋 Complete los detalles de su {tipoReporte === 'CENTINELA' ? 'Centinela' : 'Reporte'}</span>
                  <button type="button" onClick={() => setPaso(4)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Ver tipificación</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Área (Campaña):</label>
                    <select value={campanaSeleccionadaId} onChange={(e) => setCampanaSeleccionadaId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none">
                      <option value="">Seleccione Campaña</option>
                      {campanas.map((camp) => (
                        <option key={camp.idcamp} value={camp.idcamp}>{camp.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nombre (Usuario Logueado):</label>
                    <input type="text" value={user?.name || 'VALERIA GOMEZ'} readOnly className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-indigo-300 text-xs font-bold cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Asunto:</label>
                  <input 
                    type="text" 
                    placeholder="Breve resumen del problema..."
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Descripción:</label>
                  <textarea 
                    rows="2" 
                    placeholder="Detalla los síntomas o pasos para reproducir el fallo..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Equipo / Nodo (Seleccione uno o más):</label>
                    <div className="w-full h-24 overflow-y-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs space-y-1">
                      {listaEquiposActuales.length === 0 ? (
                        <span className="text-slate-500 italic">Seleccione una campaña</span>
                      ) : (
                        listaEquiposActuales.map((eq, idx) => (
                          <label key={idx} className="flex items-center gap-2 cursor-pointer hover:bg-slate-900 p-1 rounded">
                            <input 
                              type="checkbox"
                              checked={equiposSeleccionados.includes(eq)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEquiposSeleccionados([...equiposSeleccionados, eq]);
                                } else {
                                  setEquiposSeleccionados(equiposSeleccionados.filter(item => item !== eq));
                                }
                              }}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600 w-3 h-3 cursor-pointer"
                            />
                            <span className="text-slate-200 font-mono text-[11px]">{eq}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-1">Seleccionados: {equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno'}</p>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nivel:</label>
                      <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none">
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Experto">Experto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Modo:</label>
                      <select value={modo} onChange={(e) => setModo(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none">
                        <option value="WEB">WEB</option>
                        <option value="CORREO">CORREO</option>
                        <option value="TELEFONO">TELEFONO</option>
                        <option value="VERBAL">VERBAL</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Adjuntar Archivo:</label>
                  <input 
                    type="file" 
                    onChange={(e) => setArchivo(e.target.files[0])}
                    className="text-[11px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 cursor-pointer bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full" 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button type="button" onClick={onCancelar} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer">
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFinalizarReporte} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Guardar {tipoReporte === 'CENTINELA' ? 'Reporte Centinela' : 'Solicitud'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default AsistenteTipificacionView;
