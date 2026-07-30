import React, { useState } from 'react';

function AsistenteTipificacionView({ categorias = [], onSeleccionarTipificacion, onCancelar }) {
  const [paso, setPaso] = useState(1);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [subcatSeleccionada, setSubcatSeleccionada] = useState(null);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

  // Reiniciar asistente
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
    <div className="animate-fade-in max-w-3xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden font-sans">
      
      {/* Encabezado */}
      <div className="bg-slate-700 py-4 px-6 text-center border-b border-slate-600 flex justify-between items-center">
        <div></div>
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
          🤖 ASISTENTE DE TIPIFICACIÓN GUIADA
        </h2>
        {onCancelar && (
          <button onClick={onCancelar} className="text-slate-400 hover:text-white font-bold text-sm">
            ✕
          </button>
        )}
      </div>

      <div className="p-8 space-y-6">
        
        {/* Barra de progreso visual */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className={`flex items-center gap-2 ${paso >= 1 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${paso >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>1</span>
            <span className="text-sm hidden sm:inline">Servicio / Área</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-700 mx-2"></div>
          <div className={`flex items-center gap-2 ${paso >= 2 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${paso >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>2</span>
            <span className="text-sm hidden sm:inline">Módulo / Sistema</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-700 mx-2"></div>
          <div className={`flex items-center gap-2 ${paso >= 3 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${paso >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>3</span>
            <span className="text-sm hidden sm:inline">Falla Específica</span>
          </div>
        </div>

        {/* PASO 1: Seleccionar Categoría */}
        {paso === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-white">¿Qué área o servicio te está presentando problemas?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => seleccionarCat(cat)}
                  className="p-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/50 transition-all text-left flex items-center justify-between group"
                >
                  <span className="font-bold text-white text-sm uppercase">{cat.nombre}</span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Seleccionar Subcategoría */}
        {paso === 2 && categoriaSeleccionada && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Área: <span className="text-indigo-400 uppercase">{categoriaSeleccionada.nombre}</span>. ¿En dónde ocurre el problema?
              </h3>
              <button onClick={() => setPaso(1)} className="text-xs text-blue-400 hover:underline">« Cambiar área</button>
            </div>
            
            {(!categoriaSeleccionada.subcategorias || categoriaSeleccionada.subcategorias.length === 0) ? (
              <p className="text-slate-400 italic py-4">Esta categoría no tiene subcategorías registradas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {categoriaSeleccionada.subcategorias.map((sub) => (
                  <button
                    key={sub.id || sub.nombre}
                    onClick={() => seleccionarSubcat(sub)}
                    className="p-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/50 transition-all text-left flex items-center justify-between group"
                  >
                    <span className="font-semibold text-white text-sm uppercase">{sub.nombre}</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Seleccionar Elemento */}
        {paso === 3 && subcatSeleccionada && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Módulo: <span className="text-indigo-400 uppercase">{subcatSeleccionada.nombre}</span>. Selecciona el síntoma exacto:
              </h3>
              <button onClick={() => setPaso(2)} className="text-xs text-blue-400 hover:underline">« Cambiar módulo</button>
            </div>

            {(!subcatSeleccionada.elementos || subcatSeleccionada.elementos.length === 0) ? (
              <p className="text-slate-400 italic py-4">No hay elementos específicos en esta subcategoría.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {subcatSeleccionada.elementos.map((elem) => (
                  <button
                    key={elem.id || elem.nombre}
                    onClick={() => seleccionarElemento(elem)}
                    className="p-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/50 transition-all text-left flex items-center justify-between group"
                  >
                    <span className="font-semibold text-white text-sm uppercase">{elem.nombre}</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Resultado y Confirmación */}
        {paso === 4 && (
          <div className="space-y-6 animate-fade-in text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-white uppercase">¡Hemos encontrado tu tipificación!</h3>
              <p className="text-slate-400 text-sm mt-1">El sistema ha clasificado tu reporte de la siguiente manera:</p>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 max-w-md mx-auto text-left space-y-2">
              <div className="text-xs text-slate-400">CATEGORÍA: <span className="font-bold text-white uppercase">{categoriaSeleccionada?.nombre}</span></div>
              {subcatSeleccionada && (
                <div className="text-xs text-slate-400">SUBCATEGORÍA: <span className="font-bold text-white uppercase">{subcatSeleccionada?.nombre}</span></div>
              )}
              {elementoSeleccionado && (
                <div className="text-xs text-slate-400">ELEMENTO: <span className="font-bold text-white uppercase">{elementoSeleccionado?.nombre}</span></div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={reiniciar} 
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors border border-slate-600"
              >
                Volver a empezar
              </button>
              <button 
                onClick={confirmarSeleccion} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg shadow-lg font-bold text-sm transition-colors"
              >
                Usar esta tipificación para mi reporte
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AsistenteTipificacionView;