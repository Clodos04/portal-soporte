import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const llenarAccesoRapido = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans text-slate-200">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-indigo-400 tracking-tight">CONTACTUS</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Iniciar Sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Usuario (Username)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Ej. christopher" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors">
            Entrar al Sistema
          </button>
        </form>

        <div className="pt-4 border-t border-slate-700 text-center space-y-2">
          <p className="text-xs text-slate-400">Accesos rápidos para pruebas:</p>
          <div className="flex justify-center gap-2">
            <button 
              type="button" 
              onClick={() => llenarAccesoRapido('christopher', '123')}
              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs rounded border border-indigo-500/50 transition-colors"
            >
              👤 Christopher (Admin)
            </button>
            <button 
              type="button" 
              onClick={() => llenarAccesoRapido('valeria', '123')}
              className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-xs rounded border border-blue-500/50 transition-colors"
            >
              👤 Valeria (Cliente)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
