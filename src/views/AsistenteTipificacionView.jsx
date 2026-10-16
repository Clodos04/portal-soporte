import React, { useState } from 'react';

function AsistenteTipificacionView({ categorias = [], campanas = [], equipos = [], ticketsExistentes = [], user, usuarios = [], onGuardarTicket, onCancelar }) {
  const [tipoReporte, setTipoReporte] = useState(null); // 'REPORTE' o 'CENTINELA'
  const [paso, setPaso] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

  // Estados específicos para el árbol de Centinela (Periféricos y Monitores)
  const [perifericoCentinela, setPerifericoCentinela] = useState(null); // 'TECLADO', 'MOUSE', 'DIADEMA', 'MONITOR'
  const [subFallaCentinela, setSubFallaCentinela] = useState(null); // Opciones de segundo y tercer nivel

  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [campanaSeleccionadaId, setCampanaSeleccionadaId] = useState('');
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  // Valores internos por defecto para MySQL (sin mostrar selectores en pantalla)
  const [nivel] = useState('Bajo');
  const [modo] = useState('WEB');
  const [archivo, setArchivo] = useState(null);
  const [errorDuplicado, setErrorDuplicado] = useState('');
  const [enviando, setEnviando] = useState(false); // <--- Candado anti-doble clic

  // Filtramos dinámicamente las categorías ACTIVAS desde la Base de Datos
  const categoriasActivas = (categorias || []).filter(
    cat => (cat.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO'
  );

  // Si es CENTINELA, buscamos DISPOSITIVOS o HARDWARE; si es REPORTE normal, mostramos todas las de la BD
  const opcionesMostradas = tipoReporte === 'CENTINELA'
    ? categoriasActivas.filter(cat => 
        cat.nombre.toUpperCase().includes('DISPOSITIVO') || 
        cat.nombre.toUpperCase().includes('HARDWARE')
      )
    : categoriasActivas;

  const listaEquiposActuales = equipos
    .filter(eq => String(eq.idcamp) === String(campanaSeleccionadaId))
    .map(eq => eq.equipo);

  const reiniciar = () => {
    setTipoReporte(null);
    setPaso(1);
    setCategoriaSeleccionada(null);
    setSubcatSeleccionada(null);
    setElementoSeleccionado(null);
    setPerifericoCentinela(null);
    setSubFallaCentinela(null);
    setEquiposSeleccionados([]);
    setErrorDuplicado('');
    setAsunto('');
    setDescripcion('');
  };

  const seleccionarCat = (cat) => {
    setCategoriaSeleccionada(cat);
    setSubcatSeleccionada(null);
    setElementoSeleccionado(null);
    const subcatsActivas = (cat.subcategorias || []).filter(
      s => (s.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO'
    );
    if (subcatsActivas.length > 0) {
      setPaso(2);
    } else {
      setPaso(4);
    }
  };

  const seleccionarSubcat = (sub) => {
    setSubcatSeleccionada(sub);
    setElementoSeleccionado(null);

    const nombreSub = (sub.nombre || '').toUpperCase();
    if (tipoReporte === 'CENTINELA' && (nombreSub.includes('TECLADO') || nombreSub.includes('MOUSE') || nombreSub.includes('DIADEMA') || nombreSub.includes('MONITOR'))) {
      if (nombreSub.includes('TECLADO')) setPerifericoCentinela('TECLADO');
      else if (nombreSub.includes('MOUSE')) setPerifericoCentinela('MOUSE');
      else if (nombreSub.includes('DIADEMA')) setPerifericoCentinela('DIADEMA');
      else if (nombreSub.includes('MONITOR')) setPerifericoCentinela('MONITOR');
      
      setPaso(2.5);
    } else {
      const elementosActivos = (sub.elementos || []).filter(
        el => (el.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO'
      );
      if (elementosActivos.length > 0) {
        setPaso(3);
      } else {
        setPaso(4);
      }
    }
  };

  const seleccionarElemento = (elem) => {
    setElementoSeleccionado(elem);
    setPaso(5);
  };

  const handleFinalizarReporte = async () => {
    if (enviando) return; // Bloquear si ya hay una petición en curso
    setEnviando(true);
    setErrorDuplicado('');

    const fechaHoy = new Date().toISOString().split('T')[0];
    const campObj = campanas.find(c => String(c.idcamp) === String(campanaSeleccionadaId));

    if (tipoReporte === 'CENTINELA' && equiposSeleccionados.length > 0) {
      for (const [index, nodoUnico] of equiposSeleccionados.entries()) {
        const nuevoFolio = Math.floor(10000 + Math.random() * 90000).toString() + '-' + (index + 1);
        const compNombre = perifericoCentinela || subcatSeleccionada?.nombre || 'DISPOSITIVO';
        const detalleFalla = subFallaCentinela || elementoSeleccionado?.nombre || 'Falla general de dispositivo';
        
        const ticketIndependiente = {
          folio: nuevoFolio,
          notas: [],
          estatus: 'Abierto',
          colorEstatus: 'bg-purple-500',
          tecnico: 'Sin Asignar',
          creador: user?.name || 'VALERIA GOMEZ',
          asunto: `[CENTINELA] ${compNombre}: ${detalleFalla}`,
          descripcion: `Reporte automático de componente dañado. Componente: ${compNombre}, Falla: ${detalleFalla}, Nodo: ${nodoUnico}.`,
          campana: campObj ? campObj.nombre : 'General',
          equipo: nodoUnico,
          nivel: 'Medio',
          modo: modo,
          fecha: fechaHoy,
          grupo: 'CENTINELA',
          categoria: categoriaSeleccionada?.nombre || 'DISPOSITIVOS',
          subcategoria: compNombre,
          elemento: detalleFalla,
          resolucion: '',
          archivoNombre: archivo ? archivo.name : null,
          archivoUrl: archivo ? URL.createObjectURL(archivo) : null,
          tipo_solicitud: 'CENTINELA'
        };

        try {
          const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketIndependiente)
          });

          const data = await response.json();

          if (!response.ok) {
            setErrorDuplicado(data.error || `El nodo "${nodoUnico}" ya cuenta con un reporte de este componente hoy.`);
            setEnviando(false);
            return;
          }

          if (onGuardarTicket) {
            onGuardarTicket(ticketIndependiente);
          }
        } catch (err) {
          setErrorDuplicado('Error de red al intentar conectar con el servidor.');
          setEnviando(false);
          return;
        }
      }

      setEnviando(false);
      if (onCancelar) onCancelar();
      return;
    }

    // Comportamiento normal para reportes estándar
    const nuevoFolio = Math.floor(10000 + Math.random() * 90000).toString();
    const ticketNuevo = {
      folio: nuevoFolio,
      notas: [],
      estatus: 'Abierto',
      colorEstatus: 'bg-green-500',
      tecnico: 'Sin Asignar',
      creador: user?.name || 'VALERIA GOMEZ',
      asunto: asunto || 'Sin asunto',
      descripcion: descripcion || 'Sin descripción',
      campana: campObj ? campObj.nombre : 'General',
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
      archivoUrl: archivo ? URL.createObjectURL(archivo) : null,
      tipo_solicitud: 'REPORTE'
    };

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketNuevo)
      });
      if (response.ok && onGuardarTicket) {
        onGuardarTicket(ticketNuevo);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnviando(false);
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
                onClick={() => {
                  setTipoReporte('CENTINELA');
                  const catDispositivos = categoriasActivas.find(
                    c => c.nombre.toUpperCase().includes('DISPOSITIVO') || c.nombre.toUpperCase().includes('HARDWARE')
                  ) || categoriasActivas[0] || { id: 1, nombre: "DISPOSITIVOS", subcategorias: [] };
                  setCategoriaSeleccionada(catDispositivos);
                  if (catDispositivos.subcategorias && catDispositivos.subcategorias.length > 0) {
                    setPaso(2);
                  }
                }}
                className="p-5 rounded-2xl bg-purple-950/40 border-2 border-purple-800/60 hover:border-purple-500 text-left transition-all group cursor-pointer shadow-lg space-y-2"
              >
                <div className="text-2xl">🛡️</div>
                <div className="font-bold text-purple-300 text-sm uppercase">Reporte Centinela</div>
                <div className="text-xs text-slate-400">Árbol rápido para periféricos y dispositivos dañados.</div>
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
                <button type="button" onClick={reiniciar} className="text-xs font-bold text-slate-400 hover:text-white underline cursor-pointer">
                  « Cambiar tipo
                </button>
              </div>
            )}

            {/* PASO 1: CATEGORÍAS */}
            {paso === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-base font-bold text-white text-center">¿Qué área o servicio te está presentando problemas?</h3>
                {opcionesMostradas.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs italic py-4">
                    No hay categorías activas registradas en el sistema.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
                    {opcionesMostradas.map((cat, idx) => (
                      <button
                        key={cat.id || idx}
                        type="button"
                        onClick={() => seleccionarCat(cat)}
                        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 transition-all text-left flex items-center justify-between group cursor-pointer shadow-md"
                      >
                        <div className="pr-3">
                          <div className="font-bold text-white text-sm uppercase tracking-wide">{cat.nombre}</div>
                          {cat.descripcion && (
                            <div className="text-[11px] text-slate-400 mt-1 leading-snug">{cat.descripcion}</div>
                          )}
                        </div>
                        <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform font-bold shrink-0">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: SUBCATEGORÍAS (CON BREVE DESCRIPCIÓN) */}
            {paso === 2 && categoriaSeleccionada && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300">Área: <strong className="text-indigo-400 uppercase">{categoriaSeleccionada.nombre}</strong></span>
                  <button type="button" onClick={() => setPaso(1)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar área</button>
                </div>
                <h4 className="text-sm font-bold text-white text-center">¿En qué módulo o dispositivo ocurre el problema?</h4>
                {(!categoriaSeleccionada.subcategorias || categoriaSeleccionada.subcategorias.filter(s => (s.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO').length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400 italic text-xs mb-3">No hay subcategorías activas registradas en esta área.</p>
                    <button type="button" onClick={() => setPaso(4)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Continuar sin subcategoría →</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoriaSeleccionada.subcategorias
                      .filter(sub => (sub.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
                      .map((sub) => (
                        <button
                          key={sub.id || sub.nombre}
                          type="button"
                          onClick={() => seleccionarSubcat(sub)}
                          className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer transition-all shadow-sm"
                        >
                          <div className="pr-3">
                            <div className="font-bold text-white text-xs uppercase tracking-wide">{sub.nombre}</div>
                            {sub.descripcion && (
                              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed font-normal">
                                {sub.descripcion}
                              </div>
                            )}
                          </div>
                          <span className="text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 font-bold">→</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* PASO 2.5: ÁRBOL ESPECIAL CENTINELA */}
            {paso === 2.5 && perifericoCentinela && (
              <div className="space-y-4 animate-fade-in max-w-xl mx-auto">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300">Componente: <strong className="text-purple-400 uppercase">{perifericoCentinela}</strong></span>
                  <button type="button" onClick={() => setPaso(2)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar componente</button>
                </div>

                <h4 className="text-sm font-bold text-white text-center">Selecciona el problema específico:</h4>

                {perifericoCentinela === 'TECLADO' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {['Falso contacto / Falla intermitente', 'Sin teclas (Desgaste visual / No se ven)', 'Teclas duras / Trabajo pesado'].map((op, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSubFallaCentinela(op); setPaso(4); }}
                        className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                      >
                        <span>{op}</span>
                        <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {perifericoCentinela === 'MOUSE' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {['Falso contacto / Cable dañado', 'Clicks ya no responden / Fallan', 'Scroll (Ruedita) no responde'].map((op, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSubFallaCentinela(op); setPaso(4); }}
                        className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                      >
                        <span>{op}</span>
                        <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {perifericoCentinela === 'MONITOR' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {['No prende / Sin energía', 'Daño físico (Pantalla rota o golpeada)', 'Líneas en la pantalla', 'Manchas en la pantalla'].map((op, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSubFallaCentinela(op); setPaso(4); }}
                        className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                      >
                        <span>{op}</span>
                        <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {perifericoCentinela === 'DIADEMA' && (
                  <div className="space-y-3">
                    {!subFallaCentinela ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        <button
                          type="button"
                          onClick={() => { setSubFallaCentinela('Falso contacto'); setPaso(4); }}
                          className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                        >
                          <span>Falso contacto</span>
                          <span className="text-purple-400">→</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSubFallaCentinela('Volumen bajo'); setPaso(4); }}
                          className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                        >
                          <span>Volumen bajo</span>
                          <span className="text-purple-400">→</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSubFallaCentinela('DAÑO FÍSICO'); }}
                          className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-700/60 hover:border-purple-500 text-left font-semibold text-xs text-purple-200 uppercase flex justify-between items-center group cursor-pointer"
                        >
                          <span>🛡️ Daño Físico (Desplegar opciones)</span>
                          <span className="text-purple-400">↓</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSubFallaCentinela('Cable pelado'); setPaso(4); }}
                          className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-purple-500 text-left font-semibold text-xs text-white uppercase flex justify-between items-center group cursor-pointer"
                        >
                          <span>Cable pelado</span>
                          <span className="text-purple-400">→</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-800/70 p-4 rounded-xl border border-purple-500/40">
                        <div className="text-xs text-purple-300 font-bold uppercase">Selecciona el tipo de Daño Físico:</div>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            'Sin almohadilla',
                            'Micrófono roto (Pero lo demás sirve)',
                            'Diadema rota / Bocina zafada'
                          ].map((dano, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { setSubFallaCentinela(`Daño Físico: ${dano}`); setPaso(4); }}
                              className="p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-500 text-left text-xs font-bold text-white uppercase cursor-pointer"
                            >
                              • {dano}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => setSubFallaCentinela(null)} className="text-[11px] text-slate-400 hover:text-white underline pt-1 cursor-pointer">
                          « Volver a opciones de diadema
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: ELEMENTOS (CON BREVE DESCRIPCIÓN) */}
            {paso === 3 && subcatSeleccionada && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300">Módulo: <strong className="text-indigo-400 uppercase">{subcatSeleccionada.nombre}</strong></span>
                  <button type="button" onClick={() => setPaso(2)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar módulo</button>
                </div>
                <h4 className="text-sm font-bold text-white text-center">Selecciona la falla o requerimiento específico:</h4>
                {(!subcatSeleccionada.elementos || subcatSeleccionada.elementos.filter(el => (el.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO').length === 0) ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400 italic text-xs mb-3">No hay elementos específicos en este módulo.</p>
                    <button type="button" onClick={() => setPaso(5)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Continuar sin elemento →</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subcatSeleccionada.elementos
                      .filter(elem => (elem.estatus || 'ACTIVO').toUpperCase() === 'ACTIVO')
                      .map((elem) => (
                        <button
                          key={elem.id || elem.nombre}
                          type="button"
                          onClick={() => seleccionarElemento(elem)}
                          className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 text-left flex items-center justify-between group cursor-pointer transition-all shadow-sm"
                        >
                          <div className="pr-3">
                            <div className="font-bold text-white text-xs uppercase tracking-wide">{elem.nombre}</div>
                            {elem.descripcion && (
                              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed font-normal">
                                {elem.descripcion}
                              </div>
                            )}
                          </div>
                          <span className="text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 font-bold">→</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* PASO 4: CONFIRMACIÓN */}
            {paso === 4 && (
              <div className="space-y-4 animate-fade-in text-center py-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mx-auto text-xl border border-emerald-500/30">
                  ✓
                </div>
                <h3 className="text-base font-black text-white uppercase">Tipificación Detectada</h3>
                
                <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 max-w-md mx-auto text-left space-y-1.5 text-xs">
                  <div>Tipo: <strong className={tipoReporte === 'CENTINELA' ? 'text-purple-400' : 'text-indigo-400'}>{tipoReporte}</strong></div>
                  <div>Área: <strong className="text-white uppercase">{categoriaSeleccionada?.nombre}</strong></div>
                  {perifericoCentinela ? (
                    <>
                      <div>Componente: <strong className="text-purple-400 uppercase">{perifericoCentinela}</strong></div>
                      <div>Falla Específica: <strong className="text-indigo-300 uppercase">{subFallaCentinela}</strong></div>
                    </>
                  ) : (
                    <>
                      {subcatSeleccionada && (
                        <div>
                          Módulo: <strong className="text-white uppercase">{subcatSeleccionada?.nombre}</strong>
                          {subcatSeleccionada?.descripcion && (
                            <p className="text-[11px] text-slate-400 mt-0.5 italic">{subcatSeleccionada.descripcion}</p>
                          )}
                        </div>
                      )}
                      {elementoSeleccionado && (
                        <div>
                          Falla: <strong className="text-indigo-400 uppercase">{elementoSeleccionado?.nombre}</strong>
                          {elementoSeleccionado?.descripcion && (
                            <p className="text-[11px] text-slate-400 mt-0.5 italic">{elementoSeleccionado.descripcion}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
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

            {/* PASO 5: FORMULARIO FINAL */}
            {paso === 5 && (
              <div className="space-y-4 animate-fade-in pb-2">
                <div className="flex justify-between items-center bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-xs text-indigo-300 font-bold">📋 Complete los detalles de su {tipoReporte === 'CENTINELA' ? 'Centinela' : 'Reporte'}</span>
                  <button type="button" onClick={() => setPaso(4)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Ver tipificación</button>
                </div>

                {errorDuplicado && (
                  <div className="bg-red-950/80 border border-red-500 text-red-200 p-3 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                    <span>❌</span> {errorDuplicado}
                  </div>
                )}

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

                {tipoReporte !== 'CENTINELA' ? (
                  <>
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
                  </>
                ) : (
                  <div className="bg-purple-950/30 border border-purple-500/30 p-3.5 rounded-xl text-xs space-y-1">
                    <div className="text-purple-300 font-bold uppercase">🛡️ Resumen automático Centinela:</div>
                    <div className="text-slate-300">Asunto: <strong className="text-white font-mono">[CENTINELA] {perifericoCentinela || subcatSeleccionada?.nombre}: {subFallaCentinela || elementoSeleccionado?.nombre || 'Falla reportada'}</strong></div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Equipo / Nodo (Seleccione uno o más):</label>
                  <div className="w-full h-28 overflow-y-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs space-y-1">
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
                  <p className="text-[10px] text-indigo-400 mt-1">Seleccionados ({equiposSeleccionados.length}): {equiposSeleccionados.length > 0 ? equiposSeleccionados.join(', ') : 'Ninguno'}</p>
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
                    disabled={enviando}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {enviando ? 'Guardando...' : `Guardar ${tipoReporte === 'CENTINELA' ? `(${equiposSeleccionados.length}) Reportes Centinela` : 'Solicitud'}`}
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
