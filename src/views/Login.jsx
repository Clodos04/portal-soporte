import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const rellenarAccesoRapido = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      
      {/* Círculos de luz decorativos de fondo (Efecto Moderno) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Tarjeta Principal de Login */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl shadow-indigo-950/40 animate-fade-in">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-2xl mb-4 shadow-inner">
            🎧
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider uppercase bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            CONTACTUS
          </h1>
          <p className="text-xs font-semibold text-slate-400 tracking-widest uppercase mt-1">
            Centro de Soporte Técnico
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">👤</span>
              <input
                type="text"
                required
                placeholder="Ej. christopher"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-700/70 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">🔒</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-700/70 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar al Sistema'}
          </button>
        </form>

        {/* Accesos Rápidos para Pruebas */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Accesos rápidos para pruebas:
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => rellenarAccesoRapido('christopher', '123')}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 rounded-xl text-xs font-medium border border-slate-700/60 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
            >
              <span>🛡️</span> Admin (Christopher)
            </button>
            <button
              type="button"
              onClick={() => rellenarAccesoRapido('valeria', '123')}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 rounded-xl text-xs font-medium border border-slate-700/60 hover:border-blue-500/40 transition-all flex items-center gap-1.5"
            >
              <span>💬</span> Cliente (Valeria)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
