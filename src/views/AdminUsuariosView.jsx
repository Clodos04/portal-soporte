import React, { useState } from 'react';
import { listaCampanas } from '../data/campanasData';

function AdminUsuariosView({ grupos = [], usuarios = [], setUsuarios }) {
  const [modo, setModo] = useState('lista');
  const [usuarioActual, setUsuarioActual] = useState(null);

  const [formNombre, setFormNombre] = useState('');
  const [formPaterno, setFormPaterno] = useState('');
  const [formMaterno, setFormMaterno] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNivel, setFormNivel] = useState('CLIENTE');
  const [formCampana, setFormCampana] = useState(listaCampanas[0]);
  const [formEstatus, setFormEstatus] = useState('ACTIVO');
  const [formGrupos, setFormGrupos] = useState([]);

  const abrirNuevo = () => {
    setFormNombre('');
    setFormPaterno('');
    setFormMaterno('');
    setFormUsername('');
    setFormPassword('');
    setFormNivel('CLIENTE');
    setFormCampana(listaCampanas[0]);
    setFormEstatus('ACTIVO');
    setFormGrupos([]);
    setUsuarioActual(null);
    setModo('form');
  };

  const abrirEdicion = (usu) => {
    setUsuarioActual(usu);
    setFormNombre(usu.nombre || '');
    setFormPaterno(usu.paterno || '');
    setFormMaterno(usu.materno || '');
    setFormUsername(usu.username || '');
    setFormPassword(usu.password || '');
    setFormNivel(usu.nivel || 'CLIENTE');
    setFormCampana(usu.campana || listaCampanas[0]);
    setFormEstatus(usu.estatus || 'ACTIVO');
    setFormGrupos(usu.gruposAsignados || []);
    setModo('form');
  };

  const eliminarUsuario = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        setUsuarios(usuarios.filter(u => u.id !== id));
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
      }
    }
  };

  const toggleGrupoAsignado = (grupoNombre) => {
    if (formGrupos.includes(grupoNombre)) {
      setFormGrupos(formGrupos.filter(g => g !== grupoNombre));
    } else {
      setFormGrupos([...formGrupos, grupoNombre]);
    }
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    if (!formNombre.trim() || !formUsername.trim()) return;

    const datosUsuario = {
      nombre: formNombre.trim().toUpperCase(),
      paterno: formPaterno.trim().toUpperCase(),
      materno: formMaterno.trim().toUpperCase(),
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim(),
      nivel: formNivel,
      campana: formCampana,
      estatus: formEstatus,
      gruposAsignados: formGrupos
    };

    try {
      if (!usuarioActual) {
        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosUsuario)
        });
        const data = await res.json();
        const nuevo = { ...datosUsuario, id: data.id };
        setUsuarios([...usuarios, nuevo]);
      } else {
        await fetch(`/api/usuarios/${usuarioActual.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosUsuario)
        });
        setUsuarios(usuarios.map(u => u.id === usuarioActual.id ? { ...u, ...datosUsuario } : u));
      }
      setModo('lista');
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert('Hubo un error al guardar en la base de datos.');
    }
  };

  if (modo === 'lista') {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto space-y-6 text-slate-200">
        <h1 className="text-3xl font-light text-white tracking-wide uppercase">Usuarios</h1>
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">Listado oficial de usuarios registrados en el sistema</p>
            <button 
              onClick={abrirNuevo}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors flex items-center gap-2"
            >
              📄 Nuevo Usuario
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-700 text-slate-200 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Paterno</th>
                  <th className="px-4 py-3">Materno</th>
                  <th className="px-4 py-3">Campaña</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-slate-500 italic">No hay usuarios registrados.</td>
                  </tr>
                ) : (
                  usuarios.map((usu) => (
                    <tr key={usu.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 font-bold">{usu.id}</td>
                      <td className="px-4 py-3 font-semibold text-white">{usu.nombre}</td>
                      <td className="px-4 py-3">{usu.paterno}</td>
                      <td className="px-4 py-3">{usu.materno}</td>
                      <td className="px-4 py-3">{usu.campana}</td>
                      <td className="px-4 py-3 text-indigo-300 font-mono text-xs">{usu.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${usu.estatus === 'ACTIVO' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                          {usu.estatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-300">{usu.nivel}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => abrirEdicion(usu)} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors" title="Editar">
                          ✏️
                        </button>
                        <button onClick={() => eliminarUsuario(usu.id)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors" title="Eliminar">
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
    <div className="animate-fade-in max-w-3xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden">
      <div className="bg-slate-700 py-4 px-6 text-center border-b border-slate-600">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
          {!usuarioActual ? 'Registrar Nuevo Usuario' : 'Editar Usuario'}
        </h2>
      </div>

      <form onSubmit={guardarUsuario} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Nombre:</label>
            <input type="text" required value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej. JUAN" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white outline-none uppercase text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Apellido Paterno:</label>
            <input type="text" required value={formPaterno} onChange={(e) => setFormPaterno(e.target.value)} placeholder="Ej. PÉREZ" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white outline-none uppercase text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Apellido Materno:</label>
            <input type="text" value={formMaterno} onChange={(e) => setFormMaterno(e.target.value)} placeholder="Ej. LÓPEZ" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white outline-none uppercase text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Nombre de Usuario (Username):</label>
            <input type="text" required value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="Ej. jperez" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Contraseña:</label>
            <input type="password" required={!usuarioActual} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={usuarioActual ? "Dejar en blanco para mantener" : "Contraseña"} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white outline-none text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Nivel:</label>
            <select value={formNivel} onChange={(e) => setFormNivel(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="CLIENTE">CLIENTE</option>
              <option value="TECNICO">TECNICO</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="TECNICO SUPERVISOR">TECNICO SUPERVISOR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Campaña:</label>
            <select value={formCampana} onChange={(e) => setFormCampana(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              {listaCampanas.map((camp, idx) => (
                <option key={idx} value={camp}>{camp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Estatus:</label>
            <select value={formEstatus} onChange={(e) => setFormEstatus(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="ACTIVO">ACTIVO</option>
              <option value="BAJA">BAJA</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <label className="block text-xs font-bold text-slate-300 uppercase">Grupos de Soporte Asignados:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
            {grupos.map((g, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                <input type="checkbox" checked={formGrupos.includes(g)} onChange={() => toggleGrupoAsignado(g)} className="accent-blue-500 w-4 h-4 rounded" />
                <span className="truncate">{g}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
          <button type="button" onClick={() => setModo('lista')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2 rounded-lg font-bold border border-slate-600 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-lg shadow-lg font-bold transition-colors text-sm">
            Guardar Usuario
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminUsuariosView;
