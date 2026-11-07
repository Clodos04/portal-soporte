import React, { useState } from 'react';
import { useAvisos } from '../components/Avisos';

function AdminGruposView({ grupos, onAgregarGrupo, onEliminarGrupo }) {
  const { confirmar } = useAvisos();
  const [nuevoGrupo, setNuevoGrupo] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!nuevoGrupo.trim()) return;
    onAgregarGrupo(nuevoGrupo.toUpperCase());
    setNuevoGrupo('');
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-white tracking-tight">Administración de Grupos</h1>
      
      <form onSubmit={handleAdd} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4">
        <input aria-label="Nombre del nuevo grupo" 
          type="text" 
          value={nuevoGrupo} 
          onChange={(e) => setNuevoGrupo(e.target.value)} 
          placeholder="Nombre del nuevo grupo…" 
          className="flex-grow px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-bold transition-colors">
          + Agregar Grupo
        </button>
      </form>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto shadow-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-700 text-slate-300 text-xs">
            <tr>
              <th className="px-6 py-4">Nombre del Grupo</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-300">
            {grupos.map((g, idx) => (
              <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{g}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={async () => { if (await confirmar(`¿Eliminar el grupo ${g}? Los usuarios asignados lo perderán.`)) onEliminarGrupo(g); }} className="text-red-400 hover:text-white bg-slate-900 hover:bg-red-600 px-3 py-1 rounded transition-colors">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminGruposView;