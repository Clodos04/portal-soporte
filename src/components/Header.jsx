import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, LogOut, Bell, Menu as IconoMenu, Search } from 'lucide-react';

// Los nombres se guardan en mayúsculas en la BD; se muestran como "Christopher Osorio"
const nombrePresentable = (nombre = '') =>
  nombre.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';

const hace = (fecha) => {
  const seg = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  return `hace ${Math.floor(seg / 3600)} h`;
};

function Header({
  user, onLogout, isDarkMode, onToggleTheme, onAbrirMenu, onAbrirBuscador,
  notificaciones = [], onMarcarLeidas, onLimpiarNotificaciones
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const sinLeer = notificaciones.filter(n => !n.leida).length;

  // Cierra el panel al hacer clic fuera o con Escape
  useEffect(() => {
    if (!panelAbierto) return;
    const fuera = (e) => { if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setPanelAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setPanelAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [panelAbierto]);

  const alternarPanel = () => {
    const abrir = !panelAbierto;
    setPanelAbierto(abrir);
    if (abrir && sinLeer > 0 && onMarcarLeidas) onMarcarLeidas();
  };

  const botonIcono = 'p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer';

  return (
    <header className="bg-slate-900 px-4 sm:px-6 h-16 flex justify-between items-center border-b border-slate-700 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <button onClick={onAbrirMenu} aria-label="Abrir menú" className={`lg:hidden ${botonIcono}`}>
          <IconoMenu size={20} strokeWidth={1.75} />
        </button>
        <button onClick={onAbrirBuscador} aria-label="Buscar" className={`lg:hidden ${botonIcono}`}>
          <Search size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative" ref={contenedorRef}>
          <button onClick={alternarPanel} aria-label={`Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}`} aria-expanded={panelAbierto} className={`relative ${botonIcono}`}>
            <Bell size={18} strokeWidth={1.75} />
            {sinLeer > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {sinLeer > 9 ? '9+' : sinLeer}
              </span>
            )}
          </button>

          {panelAbierto && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <p className="text-sm font-medium text-white">Notificaciones</p>
                {notificaciones.length > 0 && (
                  <button onClick={onLimpiarNotificaciones} className="text-xs text-slate-400 hover:text-slate-100 cursor-pointer">Limpiar</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">No hay notificaciones en esta sesión.</p>
                ) : notificaciones.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-slate-700/60 last:border-0">
                    <p className="text-sm text-slate-200">{n.texto}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{hace(n.fecha)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className={botonIcono}
        >
          {isDarkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        <div className="flex items-center gap-3 pl-3 ml-1 border-l border-slate-700">
          <div className="w-8 h-8 bg-indigo-600/20 text-indigo-300 rounded-full flex items-center justify-center text-xs font-semibold">
            {iniciales(user?.name)}
          </div>
          <div className="text-left hidden sm:block leading-tight">
            <p className="text-sm font-medium text-white">{nombrePresentable(user?.name) || 'Usuario'}</p>
            <p className="text-xs text-slate-500">{user?.role === 'support' ? 'Soporte TI' : 'Cliente'}</p>
          </div>
        </div>

        <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className={`${botonIcono} hover:!text-red-400`}>
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

export default Header;
