import React from 'react';
import logoContactus from '../assets/logo.png'; // Importación directa de la imagen

function Header({ user, onLogout }) {
  return (
    <header className="bg-slate-800 shadow-md px-6 py-3 flex justify-between items-center border-b border-slate-700 relative z-10">
      <div className="flex items-center">
        {/* Logotipo importado directamente */}
        <img 
          src={logoContactus} 
          alt="Contactus Contact Center" 
          className="h-10 w-auto object-contain brightness-0 invert"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-indigo-300">{user?.name || 'Usuario'}</p>
          <p className="text-xs text-slate-500">
            {user?.role === 'support' ? 'Rol: Soporte TI' : 'Rol: Cliente Operaciones'}
          </p>
        </div>
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-xl border border-slate-600">👤</div>
        <button 
          onClick={onLogout} 
          className="text-sm border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-md font-medium transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

export default Header;
