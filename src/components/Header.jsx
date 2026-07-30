import React from 'react';

function Header({ user, onLogout }) {
  return (
    <header className="bg-slate-800 shadow-md px-6 py-3 flex justify-between items-center border-b border-slate-700 relative z-10">
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-indigo-400 tracking-tight">CONTACTUS</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest -mt-1">Contact Center</span>
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