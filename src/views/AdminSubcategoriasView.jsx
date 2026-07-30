import React, { useState } from 'react';

function AdminSubcategoriasView({ categoria, categorias, setCategorias, user, onBack }) {
  // Estado de navegación
  const [subcatActiva, setSubcatActiva] = useState(null);
  const [modo, setModo] = useState('lista'); // 'lista', 'form'
  
  // Estados para Subcategorías
  const [subcatActual, setSubcatActual] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formEstatus, setFormEstatus] = useState('ACTIVO');

  // Estados para Elementos
  const [isElementoModalOpen, setIsElementoModalOpen] = useState(false);
  const [elementoActual, setElementoActual] = useState(null);
  const [nombreElemento, setNombreElemento] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [impacto, setImpacto] = useState('GENERAL');
  const [sla, setSla] = useState('120');
  const [elemEstatus, setElemEstatus] = useState('ACTIVO');

  const catActual = categorias.find(c => c.id === categoria.id) || categoria;

  const fechaActualFormateada = () => {
    return new Date().toLocaleString('es-MX', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  };

  // ==========================================
  // FUNCIONES PARA SUBCATEGORÍAS
  // ==========================================
  const abrirNuevaSubcat = () => {
    setFormNombre('');
    setFormEstatus('ACTIVO');
    setSubcatActual(null);
    setModo('form');
  };

  const abrirEdicionSubcat = (sub) => {
    setSubcatActual(sub);
    setFormNombre(sub.nombre);
    setFormEstatus(sub.estatus || 'ACTIVO');
    setModo('form');
  };

  const guardarSubcategoria = (e) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const usuarioNombre = user?.name || 'ADMINISTRADOR';

    const nuevasCategorias = categorias.map(c => {
      if (c.id === catActual.id) {
        let subsActualizadas = [...c.subcategorias];
        
        if (!subcatActual) {
          // Crear
          subsActualizadas.push({
            id: Math.floor(100 + Math.random() * 900),
            nombre: formNombre.trim().toUpperCase(),
            estatus: formEstatus,
            fecAlta: fechaActualFormateada(),
            usuario: usuarioNombre,
            elementos: []
          });
        } else {
          // Editar
          subsActualizadas = subsActualizadas.map(sub => 
            sub.id === subcatActual.id 
              ? { ...sub, nombre: formNombre.trim().toUpperCase(), estatus: formEstatus } 
              : sub
          );
        }
        return { ...c, subcategorias: subsActualizadas };
      }
      return c;
    });

    setCategorias(nuevasCategorias);
    setModo('lista');
  };

  const eliminarSubcategoria = (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta subcategoría y todos sus elementos?')) {
      const nuevasCategorias = categorias.map(c => {
        if (c.id === catActual.id) {
          return { ...c, subcategorias: c.subcategorias.filter(sub => sub.id !== id) };
        }
        return c;
      });
      setCategorias(nuevasCategorias);
    }
  };

  // ==========================================
  // FUNCIONES PARA ELEMENTOS
  // ==========================================
  const abrirNuevoElemento = () => {
    setNombreElemento('');
    setPrioridad('MEDIA');
    setImpacto('GENERAL');
    setSla('120');
    setElemEstatus('ACTIVO');
    setElementoActual(null);
    setIsElementoModalOpen(true);
  };

  const abrirEdicionElemento = (elem) => {
    setNombreElemento(elem.nombre);
    setPrioridad(elem.prioridad || 'MEDIA');
    setImpacto(elem.impacto || 'GENERAL');
    setSla(elem.sla || '120');
    setElemEstatus(elem.estatus || 'ACTIVO');
    setElementoActual(elem);
    setIsElementoModalOpen(true);
  };

  const guardarElemento = (e) => {
    e.preventDefault();
    if (!nombreElemento.trim() || !subcatActiva) return;

    const usuarioNombre = user?.name || 'ADMINISTRADOR';

    const nuevasCategorias = categorias.map(c => {
      if (c.id === catActual.id) {
        const subsActualizadas = c.subcategorias.map(sub => {
          if (sub.id === subcatActiva.id) {
            let elemsActualizados = [...(sub.elementos || [])];
            
            if (!elementoActual) {
              // Crear
              elemsActualizados.push({
                id: Math.floor(100 + Math.random() * 900),
                nombre: nombreElemento.trim().toUpperCase(),
                estatus: elemEstatus,
                fecAlta: fechaActualFormateada(),
                usuario: usuarioNombre,
                prioridad: prioridad,
                impacto: impacto,
                sla: sla
              });
            } else {
              // Editar
              elemsActualizados = elemsActualizados.map(el => 
                el.id === elementoActual.id 
                  ? { ...el, nombre: nombreElemento.trim().toUpperCase(), estatus: elemEstatus, prioridad, impacto, sla } 
                  : el
              );
            }
            return { ...sub, elementos: elemsActualizados };
          }
          return sub;
        });
        return { ...c, subcategorias: subsActualizadas };
      }
      return c;
    });

    setCategorias(nuevasCategorias);
    setIsElementoModalOpen(false);

    // Actualizar la referencia de la subcategoría activa para que la tabla se refresque
    const subActualizada = nuevasCategorias.find(c => c.id === catActual.id).subcategorias.find(s => s.id === subcatActiva.id);
    setSubcatActiva(subActualizada);
  };

  const eliminarElemento = (elemId) => {
    if (window.confirm('¿Estás seguro de eliminar este elemento?')) {
      const nuevasCategorias = categorias.map(c => {
        if (c.id === catActual.id) {
          const subsActualizadas = c.subcategorias.map(sub => {
            if (sub.id === subcatActiva.id) {
              return { ...sub, elementos: sub.elementos.filter(el => el.id !== elemId) };
            }
            return sub;
          });
          return { ...c, subcategorias: subsActualizadas };
        }
        return c;
      });
      setCategorias(nuevasCategorias);
      const subActualizada = nuevasCategorias.find(c => c.id === catActual.id).subcategorias.find(s => s.id === subcatActiva.id);
      setSubcatActiva(subActualizada);
    }
  };

  // ==========================================
  // VISTA: LISTADO DE ELEMENTOS
  // ==========================================
  if (subcatActiva) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* ENCABEZADO IDÉNTICO */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide uppercase">
              SUBCATEGORÍA: <span className="font-light text-indigo-400">{subcatActiva.nombre}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Administración de elementos y SLA</p>
          </div>
          <button 
            onClick={() => setSubcatActiva(null)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors border border-slate-600"
          >
            « Regresar
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
          <button 
            onClick={abrirNuevoElemento}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 w-fit"
          >
            📄 Nuevo Elemento
          </button>

          {isElementoModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                  <h3 className="text-lg font-bold text-white uppercase">{elementoActual ? 'Editar Elemento' : 'Nuevo Elemento'}</h3>
                  <button onClick={() => setIsElementoModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
                </div>
                <form onSubmit={guardarElemento} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre del Elemento:</label>
                    <input type="text" required value={nombreElemento} onChange={(e) => setNombreElemento(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Prioridad:</label>
                    <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500">
                      <option value="BAJA">BAJA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="ALTA">ALTA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Impacto:</label>
                    <select value={impacto} onChange={(e) => setImpacto(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500">
                      <option value="MENOR">MENOR</option>
                      <option value="GENERAL">GENERAL</option>
                      <option value="SIGNIFICATIVO">SIGNIFICATIVO</option>
                      <option value="CRITICO">CRITICO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">SLA en Minutos:</label>
                    <input type="number" required value={sla} onChange={(e) => setSla(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500" />
                  </div>
                  <div className="flex items-center gap-6 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <span className="text-xs font-bold uppercase">Estatus:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="elemEstatus" value="ACTIVO" checked={elemEstatus === 'ACTIVO'} onChange={() => setElemEstatus('ACTIVO')} className="accent-green-500" />
                      <span className="text-xs font-semibold text-green-400">ACTIVO</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="elemEstatus" value="BAJA" checked={elemEstatus === 'BAJA'} onChange={() => setElemEstatus('BAJA')} className="accent-red-500" />
                      <span className="text-xs font-semibold text-red-400">BAJA</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                    <button type="button" onClick={() => setIsElementoModalOpen(false)} className="bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold mt-2">Cancelar</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold mt-2">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Categoría / Elemento</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Fec. Alta</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Impacto</th>
                  <th className="px-4 py-3">SLA en Minutos</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {!subcatActiva.elementos || subcatActiva.elementos.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-slate-500 italic">No hay elementos registrados en esta subcategoría.</td>
                  </tr>
                ) : (
                  subcatActiva.elementos.map((elem) => (
                    <tr key={elem.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-bold">{elem.id}</td>
                      <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                        <span className="text-slate-400">📄</span> 
                        <span>{elem.nombre}</span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Corrección para asegurar que si viene vacío, marque verde */}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${(elem.estatus || 'ACTIVO') === 'ACTIVO' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                          {elem.estatus || 'ACTIVO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{elem.fecAlta}</td>
                      <td className="px-4 py-3 text-slate-300">{elem.usuario}</td>
                      <td className="px-4 py-3 font-medium text-indigo-300">{elem.prioridad}</td>
                      <td className="px-4 py-3 text-slate-300">{elem.impacto}</td>
                      <td className="px-4 py-3 font-mono text-green-400 font-bold">{elem.sla}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => abrirEdicionElemento(elem)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Editar">
                          ✏️
                        </button>
                        <button onClick={() => eliminarElemento(elem.id)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors" title="Eliminar">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA: FORMULARIO SUBCATEGORÍA
  // ==========================================
  if (modo === 'form') {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden">
        <div className="bg-slate-700 py-4 px-6 text-center border-b border-slate-600">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {!subcatActual ? 'Registrar Nueva Subcategoría' : 'Editar Subcategoría'}
          </h2>
        </div>
        <form onSubmit={guardarSubcategoria} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Nombre de la Subcategoría:</label>
              <input type="text" required value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej. RELEXPA" className="w-full px-4 py-2.5 rounded bg-slate-900 border border-slate-700 text-white outline-none uppercase text-sm" />
            </div>
            <div className="flex items-center gap-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
              <span className="text-sm font-bold">Estatus:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="estatus" value="ACTIVO" checked={formEstatus === 'ACTIVO'} onChange={() => setFormEstatus('ACTIVO')} className="accent-green-500" />
                <span className="text-sm font-semibold text-green-400">ACTIVO</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="estatus" value="BAJA" checked={formEstatus === 'BAJA'} onChange={() => setFormEstatus('BAJA')} className="accent-red-500" />
                <span className="text-sm font-semibold text-red-400">BAJA</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
            <button type="button" onClick={() => setModo('lista')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2.5 rounded-lg font-bold border border-slate-600 transition-colors text-sm">Cancelar</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg shadow-lg font-bold transition-colors text-sm">Guardar Subcategoría</button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL: LISTADO DE SUBCATEGORÍAS
  // ==========================================
  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
      
      {/* ENCABEZADO IDÉNTICO */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide uppercase">
            CATEGORÍA: <span className="font-light text-indigo-400">{catActual.nombre}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Administración de Subcategorías</p>
        </div>
        <button 
          onClick={() => onBack(null)}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors border border-slate-600"
        >
          « Regresar
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
        
        <button 
          onClick={abrirNuevaSubcat}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2 w-fit"
        >
          📄 Nueva Subcategoría
        </button>

        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Subcategoría</th>
                <th className="px-4 py-3">Estatus</th>
                <th className="px-4 py-3">Fec. Alta</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {!catActual.subcategorias || catActual.subcategorias.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500 italic">No hay subcategorías registradas.</td>
                </tr>
              ) : (
                catActual.subcategorias.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 font-bold">{sub.id}</td>
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-3">
                      {/* ICONO DE CUADRICULA COMO BOTON PARA VER ELEMENTOS */}
                      <button 
                        onClick={() => setSubcatActiva(sub)}
                        className="text-blue-400 hover:text-blue-300 font-bold text-base bg-blue-500/20 hover:bg-blue-500/30 w-7 h-7 rounded flex items-center justify-center transition-colors"
                        title="Ver Elementos"
                      >
                        ⊕
                      </button>
                      <span>{sub.nombre}</span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Corrección para asegurar que si viene vacío, marque verde */}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${(sub.estatus || 'ACTIVO') === 'ACTIVO' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                        {sub.estatus || 'ACTIVO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{sub.fecAlta}</td>
                    <td className="px-4 py-3 text-slate-300">{sub.usuario}</td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button onClick={() => abrirEdicionSubcat(sub)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Editar">
                        ✏️
                      </button>
                      <button onClick={() => eliminarSubcategoria(sub.id)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors" title="Eliminar">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default AdminSubcategoriasView;