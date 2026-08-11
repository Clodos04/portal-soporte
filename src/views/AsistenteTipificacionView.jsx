import React, { useState } from 'react';

function AsistenteTipificacionView({ categorias = [], onSeleccionarTipificacion, onCancelar }) {
  const [paso, setPaso] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

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
    setPaso(4);
  };

  const confirmarSeleccion = () => {
    if (onSeleccionarTipificacion) {
      onSeleccionarTipificacion({
        categoria: categoriaSeleccionada,
        subcategoria: subcatSeleccionada,
        elemento: elementoSeleccionado
      });
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden font-sans">
      
      {/* Encabezado */}
      <div className="bg-slate-800/80 py-5 px-8 text-center border-b border-slate-700 flex justify-between items-center">
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

      <div className="p-8 space-y-8">
        
        {/* Barra de progreso visual más grande y moderna */}
        <div className="flex items-center justify-between mb-8 px-6">
          <div className={`flex items-center gap-3 ${paso >= 1 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md ${paso >= 1 ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span className="text-sm font-semibold hidden sm:inline uppercase tracking-wider">Servicio / Área</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded-full ${paso >= 2 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
          <div className={`flex items-center gap-3 ${paso >= 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md ${paso >= 2 ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span className="text-sm font-semibold hidden sm:inline uppercase tracking-wider">Módulo / Sistema</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded-full ${paso >= 3 ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
          <div className={`flex items-center gap-3 ${paso >= 3 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md ${paso >= 3 ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span className="text-sm font-semibold hidden sm:inline uppercase tracking-wider">Falla Específica</span>
          </div>
        </div>

        {/* PASO 1: Seleccionar Categoría */}
        {paso === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-xl font-bold text-white text-center">¿Qué área o servicio te está presentando problemas?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => seleccionarCat(cat)}
                  className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 transition-all text-left flex items-center justify-between group cursor-pointer shadow-lg"
                >
                  <span className="font-bold text-white text-base uppercase tracking-wide">{cat.nombre}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform text-xl font-bold">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Seleccionar Subcategoría */}
        {paso === 2 && categoriaSeleccionada && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
              <h3 className="text-base font-medium text-slate-300">
                Área: <span className="text-indigo-400 font-bold uppercase">{categoriaSeleccionada.nombre}</span>
              </h3>
              <button onClick={() => setPaso(1)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar área</button>
            </div>
            
            <h4 className="text-lg font-bold text-white text-center">¿En dónde o en qué módulo ocurre el problema?</h4>

            {(!categoriaSeleccionada.subcategorias || categoriaSeleccionada.subcategorias.length === 0) ? (
              <p className="text-slate-400 italic py-6 text-center">Esta categoría no tiene subcategorías registradas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                {categoriaSeleccionada.subcategorias.map((sub) => (
                  <button
                    key={sub.id || sub.nombre}
                    onClick={() => seleccionarSubcat(sub)}
                    className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 transition-all text-left flex items-center justify-between group cursor-pointer shadow-lg"
                  >
                    <span className="font-semibold text-white text-base uppercase tracking-wide">{sub.nombre}</span>
                    <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform text-xl font-bold">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Seleccionar Elemento */}
        {paso === 3 && subcatSeleccionada && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
              <h3 className="text-base font-medium text-slate-300">
                Módulo: <span className="text-indigo-400 font-bold uppercase">{subcatSeleccionada.nombre}</span>
              </h3>
              <button onClick={() => setPaso(2)} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">« Cambiar módulo</button>
            </div>

            <h4 className="text-lg font-bold text-white text-center">Selecciona el síntoma o falla específica:</h4>

            {(!subcatSeleccionada.elementos || subcatSeleccionada.elementos.length === 0) ? (
              <p className="text-slate-400 italic py-6 text-center">No hay elementos específicos en esta subcategoría.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                {subcatSeleccionada.elementos.map((elem) => (
                  <button
                    key={elem.id || elem.nombre}
                    onClick={() => seleccionarElemento(elem)}
                    className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 transition-all text-left flex items-center justify-between group cursor-pointer shadow-lg"
                  >
                    <span className="font-semibold text-white text-base uppercase tracking-wide">{elem.nombre}</span>
                    <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform text-xl font-bold">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Resultado y Confirmación */}
        {paso === 4 && (
          <div className="space-y-6 animate-fade-in text-center py-6">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xl shadow-emerald-500/10 border border-emerald-500/30">
              ✓
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-wide">¡Tipificación Exitosa!</h3>
              <p className="text-slate-400 text-sm mt-1">El asistente ha clasificado correctamente tu incidencia:</p>
            </div>

            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700 max-w-lg mx-auto text-left space-y-3 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase">Área: <span className="font-black text-white text-sm block mt-0.5">{categoriaSeleccionada?.nombre}</span></div>
              {subcatSeleccionada && (
                <div className="text-xs font-bold text-slate-400 uppercase">Módulo: <span className="font-black text-white text-sm block mt-0.5">{subcatSeleccionada?.nombre}</span></div>
              )}
              {elementoSeleccionado && (
                <div className="text-xs font-bold text-slate-400 uppercase">Falla Específica: <span className="font-black text-indigo-400 text-sm block mt-0.5">{elementoSeleccionado?.nombre}</span></div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={reiniciar} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-700 cursor-pointer"
              >
                Volver a empezar
              </button>
              <button 
                onClick={confirmarSeleccion} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/30 font-bold text-sm transition-colors cursor-pointer"
              >
                Usar esta tipificación
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AsistenteTipificacionView;
