import React, { useState } from 'react';
import { equiposPorCampana } from '../../equiposData.cjs';
import { listaCampanas } from '../../campanasData.cjs';

function AsistenteTipificacionView({ categorias = [], campanas = [], user, usuarios = [], onGuardarTicket, onCancelar }) {
  const [paso, setPaso] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

  // Estados del formulario final (Paso 5)
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [campana, setCampana] = useState(user?.campana || '*111');
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [nivel, setNivel] = useState('Seleccione Una Opcion...');
  const [modo, setModo] = useState('Seleccione Una Opcion...');
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

  const campanasDisponibles = campanas.length > 0 ? campanas : listaCampanas;
  const listaEquiposActuales = equiposPorCampana[campana] || [];

  const reiniciar = () => {
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
    setPaso(4); // Pasamos al resumen y de ahí al formulario final
  };

  const handleFinalizarReporte = (e) => {
    e.preventDefault();
    const nuevoFolio = Math.floor(10000 + Math.random() * 90000).toString();
    const fechaHoy = new Date().toISOString().split('T')[0];

    const ticketNuevo = {
      folio: nuevoFolio,
      notas: [],
      estatus: 'Abierto',
      colorEstatus: 'bg-green-500',
      tecnico: 'Sin Asignar',
      creador: user?.name || 'VALERIA GOMEZ',
      asunto: asunto,
      descripcion: descripcion,
      campana: campana,
      equipo: equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno',
      nivel: nivel,
      modo: modo,
      fecha: fechaHoy,
      grupo: 'Soporte Técnico',
      categoria: categoriaSeleccionada?.nombre || 'GENERAL',
      subcategoria: subcatSeleccionada?.nombre || '',
      elemento: elementoSeleccionado?.nombre || '',
      resolucion: '',
      archivoNombre: archivo ? archivo.name : null,
      archivoUrl: archivo ? URL.createObjectURL(archivo) : null
    };

    if (onGuardarTicket) {
      onGuardarTicket(ticketNuevo);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
      
      {/* Encabezado */}
      <div className="bg-slate-800/80 py-4 px-8 text-center border-b border-slate-700 flex justify-between items-center shrink-0">
        <div></div>
        <h2 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-2">
          <span>🤖</span> ASISTENTE DE TIPIFICACIÓN GUIADA
        </h2>
        {onCancelar && (
          <button onClick={onCancelar} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">
            ✕
          </button>
        )}
      </div>

      <div className="p-8 space-y-6 overflow-y-auto flex-1">
        
        {/* Barra de progreso visual */}
        {paso < 5 && (
          <div className="flex items-center justify-between mb-4 px-6">
            <div className={`flex items-center gap-3 ${paso >= 1 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${paso >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span className="text-xs font-semibold uppercase">Área</span>
            </div>
            <div className={`flex-1 h-1 mx-3 rounded-full ${paso >= 2 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
            <div className={`flex items-center gap-3 ${paso >= 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${paso >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span className="text-xs font-semibold uppercase">Módulo</span>
            </div>
            <div className={`flex-1 h-1 mx-3 rounded-full ${paso >= 3 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
            <div className={`flex items-center gap-3 ${paso >= 3 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${paso >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span className="text-xs font-semibold uppercase">Falla</span>
            </div>
          </div>
        )}

        {/* PASO 1 */}
        {paso === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-white text-center">¿Qué área o servicio te está presentando problemas?</h3>
            <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
              {opcionesMostradas.map((cat, idx) => (
                <button
                  key={cat.id || idx}
                  onClick={() => seleccionarCat(cat)}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 transition-all text-left flex items-center justify-between group cursor-pointer shadow-md"
                >
                  <span className="font-bold text-white text-sm uppercase tracking-wide">{cat.nombre}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform font-bold">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && categoriaSeleccionada && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-300">Área: <strong className="text-indigo-400 uppercase">{categoriaSeleccionada.nombre}</strong></span>
              <button onClick={() => setPaso(1)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar área</button>
            </div>
            <h4 className="text-base font-bold text-white text-center">¿En qué módulo ocurre el problema?</h4>
            {(!categoriaSeleccionada.subcategorias || categoriaSeleccionada.subcategorias.length === 0) ? (
              <p className="text-slate-400 italic py-4 text-center text-xs">No hay módulos registrados. Puedes continuar.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoriaSeleccionada.subcategorias.map((sub) => (
                  <button
                    key={sub.id || sub.nombre}
                    onClick={() => seleccionarSubcat(sub)}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-white text-sm uppercase">{sub.nombre}</span>
                    <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && subcatSeleccionada && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-300">Módulo: <strong className="text-indigo-400 uppercase">{subcatSeleccionada.nombre}</strong></span>
              <button onClick={() => setPaso(2)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar módulo</button>
            </div>
            <h4 className="text-base font-bold text-white text-center">Selecciona la falla específica:</h4>
            {(!subcatSeleccionada.elementos || subcatSeleccionada.elementos.length === 0) ? (
              <p className="text-slate-400 italic py-4 text-center text-xs">No hay elementos específicos. Puedes continuar.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subcatSeleccionada.elementos.map((elem) => (
                  <button
                    key={elem.id || elem.nombre}
                    onClick={() => seleccionarElemento(elem)}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer"
                  >
                    <span className="font-semibold text-white text-sm uppercase">{elem.nombre}</span>
                    <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Resumen de Tipificación */}
        {paso === 4 && (
          <div className="space-y-4 animate-fade-in text-center py-2">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-emerald-500/30">
              ✓
            </div>
            <h3 className="text-lg font-black text-white uppercase">Tipificación Detectada</h3>
            
            <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 max-w-md mx-auto text-left space-y-1.5 text-xs">
              <div>Área: <strong className="text-white uppercase">{categoriaSeleccionada?.nombre}</strong></div>
              {subcatSeleccionada && <div>Módulo: <strong className="text-white uppercase">{subcatSeleccionada?.nombre}</strong></div>}
              {elementoSeleccionado && <div>Falla: <strong className="text-indigo-400 uppercase">{elementoSeleccionado?.nombre}</strong></div>}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button onClick={reiniciar} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer">
                Reiniciar
              </button>
              <button onClick={() => setPaso(5)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer">
                Continuar a Detalles del Reporte →
              </button>
            </div>
          </div>
        )}

        {/* PASO 5: Formulario Final (Asunto, Descripción, Equipo, Nivel, Modo, Archivo) */}
        {paso === 5 && (
          <form onSubmit={handleFinalizarReporte} className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-indigo-300 font-bold">📋 Complete los detalles finales de su reporte</span>
              <button type="button" onClick={() => setPaso(4)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Ver tipificación</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Área (Campaña):</label>
                <input type="text" value={campana} readOnly className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-indigo-300 text-xs font-bold cursor-not-allowed" />
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
                required
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
                required
                placeholder="Detalla los síntomas o pasos para reproducir el fallo..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Equipo (Seleccione uno o más):</label>
                <div className="w-full h-28 overflow-y-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs space-y-1">
                  {listaEquiposActuales.length === 0 ? (
                    <span className="text-slate-500 italic">No hay equipos listados para esta campaña</span>
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

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nivel:</label>
                  <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none">
                    <option value="Seleccione Una Opcion...">Seleccione Una Opcion...</option>
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Experto">Experto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Modo:</label>
                  <select value={modo} onChange={(e) => setModo(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none">
                    <option value="Seleccione Una Opcion...">Seleccione Una Opcion...</option>
                    <option value="CORREO">CORREO</option>
                    <option value="TELEFONO">TELEFONO</option>
                    <option value="VERBAL">VERBAL</option>
                    <option value="WEB">WEB</option>
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={onCancelar} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-xl font-bold text-xs cursor-pointer">
                Cancelar
              </button>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer">
                Guardar Solicitud
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default AsistenteTipificacionView;
