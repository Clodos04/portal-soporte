import React, { useState } from 'react';

function AdminCampanasView({ campanas = [], setCampanas }) {
  const [nuevaCampana, setNuevaCampana] = useState('');

  const handleAgregar = (e) => {
    e.preventDefault();
    if (!nuevaCampana.trim()) return;
    
    const campanaTrim = nuevaCampana.trim();
    if (campanas.includes(campanaTrim)) {
      alert('Esta campaña ya existe.');
      return;
    }

    setCampanas([...campanas, campanaTrim]);
    setNuevaCampana('');
  };

  const handleEliminar = (campanaAEliminar) => {
    if (campanas.length <= 1) {
      alert('Debe existir al menos una campaña en el sistema.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar la campaña ${campanaAEliminar}?`)) {
      setCampanas(campanas.filter(c => c !== campanaAEliminar));
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6 text-slate-200">
      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wide">Administración de Campañas</h1>
        <p className="text-slate-400 text-sm mt-1">Agrega o elimina campañas del sistema de soporte</p>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-6">
        
        <form onSubmit={handleAgregar} className="flex gap-4">
          <input 
            type="text"
            placeholder="Nombre de la nueva campaña (ej. *111R10)"
            value={nuevaCampana}
            onChange={(e) => setNuevaCampana(e.target.value)}
            className="flex-grow px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-green-500 transition-colors"
          />
          <button 
            type="submit"
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-green-600/30 transition-colors"
          >
            Agregar Campaña
          </button>
        </form>

        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Nombre de la Campaña</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {campanas.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-6 py-8 text-center text-slate-500 italic">
                    No hay campañas registradas.
                  </td>
                </tr>
              ) : (
                campanas.map((camp, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{camp}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleEliminar(camp)}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg font-semibold text-xs transition-colors border border-red-500/30"
                      >
                        Eliminar
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

export default AdminCampanasView;