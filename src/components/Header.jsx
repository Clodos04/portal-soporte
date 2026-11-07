import React from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import logoContactus from '../assets/logo.png';

const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';

// Los nombres se guardan en mayúsculas en la BD; se muestran como "Christopher Osorio"
const nombrePresentable = (nombre = '') =>
  nombre.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

function Header({ user, onLogout, isDarkMode, onToggleTheme }) {
  return (
    <header className="bg-slate-900 px-6 py-3 flex justify-between items-center border-b border-slate-700 relative z-10">
      <div className="flex items-center">
        {/* En modo oscuro el logo se invierte a blanco; en modo claro conserva su color */}
        <img
          src={logoContactus}
          alt="Contactus Contact Center"
          className={`h-8 w-auto object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
          <div className="w-8 h-8 bg-indigo-600/20 text-indigo-300 rounded-full flex items-center justify-center text-xs font-semibold">
            {iniciales(user?.name)}
          </div>
          <div className="text-left hidden sm:block leading-tight">
            <p className="text-sm font-medium text-white">{nombrePresentable(user?.name) || 'Usuario'}</p>
            <p className="text-xs text-slate-500">
              {user?.role === 'support' ? 'Soporte TI' : 'Cliente'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

export default Header;
