import React, { useState } from 'react';
import logoContactus from '../assets/logo.png';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ejecutarLogin = async (userToSend, passToSend) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToSend, password: passToSend })
      });

      const data = await response.json();

      if (response.ok && (data.success || data.user)) {
        const usuarioValido = data.user || data;
        onLogin(usuarioValido.username, passToSend);
      } else {
        setError(data.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    ejecutarLogin(username.trim(), password);
  };

  const inputClase =
    'w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-50 text-sm placeholder-slate-500 ' +
    'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img
            src={logoContactus}
            alt="Contactus Contact Center"
            className="h-9 w-auto object-contain brightness-0 invert mb-6"
          />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Inicia sesión en CTI</h1>
          <p className="text-sm text-slate-400 mt-1.5">Clodos TI Assist · Soporte técnico y control de infraestructura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="usuario" className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
            <input
              id="usuario"
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="tu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClase}
            />
          </div>

          <div>
            <label htmlFor="contrasena" className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClase}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="absolute bottom-6 text-xs text-slate-500 select-none">
        Área de Soporte Técnico · Contactus
      </p>
    </div>
  );
}

export default Login;
