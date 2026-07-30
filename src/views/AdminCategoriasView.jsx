import React, { useState } from 'react';

function AdminCategoriasView({ categorias = [], setCategorias, user, onVerSubcategorias }) {
  const [modo, setModo] = useState('lista'); // 'lista', 'form'
  const [categoriaActual, setCategoriaActual] = useState(null);
  
  const [formNombre, setFormNombre] = useState('');
  const [formEstatus, setFormEstatus] = useState('ACTIVO');

  const abrirNueva = () => {
    setFormNombre('');
    setFormEstatus('ACTIVO');
    setCategoriaActual(null);
    setModo('form');
  };

  const abrirEdicion = (cat) => {
    setCategoriaActual(cat);
    setFormNombre(cat.nombre);
    setFormEstatus(cat.estatus || 'ACTIVO');
    setModo('form');
  };

  const guardarCategoria = (e) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const fechaActual = new Date().toLocaleString('es-MX', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    const usuarioNombre = user?.name || 'ADMINISTRADOR';

    if (!categoriaActual) {
      const nueva = {
        id: Math.floor(100 + Math.random() * 900),
        nombre: formNombre.trim().toUpperCase(),
        estatus: formEstatus,
        fecAlta: fechaActual,
        usuario: usuarioNombre,
        subcategorias: []
      };
      setCategorias([...categorias, nueva]);
    } else {
      setCategorias(categorias.map(c => c.id === categoriaActual.id ? {
        ...c,
        nombre: formNombre.trim().toUpperCase(),
        estatus: formEstatus
      } : c));
    }
    setModo('lista');
  };

  const eliminarCategoria = (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      setCategorias(categorias.filter(c => c.id !== id));
    }
  };

  if (modo === 'lista') {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
        <h1 className="text-3xl font-light text-white tracking-wide uppercase">Administración de Categorías</h1>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <button 
              onClick={abrirNueva}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2"
            >
              📄 Nueva Categoría
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Fec. Alta</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500 italic">No hay categorías registradas.</td>
                  </tr>
                ) : (
                  categorias.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-bold">{cat.id}</td>
                      <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                        <button 
                          onClick={() => onVerSubcategorias(cat)}
                          className="text-blue-400 hover:text-blue-300 font-bold text-base bg-blue-500/20 hover:bg-blue-500/30 w-6 h-6 rounded flex items-center justify-center transition-colors"
                          title="Ver Subcategorías"
                        >
                          ⊕
                        </button>
                        <span>{cat.nombre}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${(cat.estatus || 'ACTIVO') === 'ACTIVO' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                          {cat.estatus || 'ACTIVO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{cat.fecAlta || 'N/D'}</td>
                      <td className="px-4 py-3 text-slate-300">{cat.usuario || 'SISTEMA'}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => abrirEdicion(cat)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Editar">
                          ✏️
                        </button>
                        <button onClick={() => eliminarCategoria(cat.id)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors" title="Eliminar">
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

  return (
    <div className="animate-fade-in max-w-2xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden">
      <div className="bg-slate-700 py-4 px-6 text-center border-b border-slate-600">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
          {!categoriaActual ? 'Registrar Nueva Categoría' : 'Editar Categoría'}
        </h2>
      </div>

      <form onSubmit={guardarCategoria} className="p-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Nombre de la Categoría:</label>
            <input 
              type="text" 
              required
              value={formNombre} 
              onChange={(e) => setFormNombre(e.target.value)} 
              placeholder="Ej. APLICACIONES INHOUSE"
              className="w-full px-4 py-2.5 rounded bg-slate-900 border border-slate-700 text-white outline-none uppercase text-sm" 
            />
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
          <button type="button" onClick={() => setModo('lista')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2.5 rounded-lg font-bold border border-slate-600 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg shadow-lg font-bold transition-colors text-sm">
            Guardar Categoría
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminCategoriasView;
