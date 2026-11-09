import React from 'react';
import {
  Home, Ticket, BookOpen, Inbox, LayoutDashboard, Users, UserCog, FolderTree, Megaphone, BarChart3, Search, X
} from 'lucide-react';
import logoContactus from '../assets/logo.png';

// Menú lateral. En pantallas grandes está fijo; en celular es un panel que se abre con el botón del encabezado.

function Enlace({ vista, activo, onIr, icono: Icono, children }) {
  return (
    <button
      onClick={() => onIr(vista)}
      aria-current={activo ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
        activo ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
      }`}
    >
      <Icono size={17} strokeWidth={1.75} className={activo ? 'text-indigo-300' : ''} />
      {children}
    </button>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className="mt-6">
      <p className="px-3 mb-1.5 text-xs font-medium text-slate-500">{titulo}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Menu({ currentView, setCurrentView, user, abierto, onCerrar, onAbrirBuscador, isDarkMode }) {
  const nivelUsuario = (user?.nivel || '').toUpperCase();
  const esAdmin = nivelUsuario.includes('ADMIN') || user?.role === 'support';

  const ir = (vista) => { setCurrentView(vista); onCerrar(); };

  return (
    <>
      {/* Fondo oscuro detrás del panel en celular */}
      {abierto && <div className="fixed inset-0 bg-slate-950/70 z-30 lg:hidden" onClick={onCerrar} aria-hidden="true" />}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col transition-transform duration-200 ${
          abierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Navegación principal"
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-700 shrink-0">
          <img
            src={logoContactus}
            alt="Contactus Contact Center"
            className={`h-7 w-auto object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`}
          />
          <button onClick={onCerrar} aria-label="Cerrar menú" className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-3 pt-4">
          <button
            onClick={() => { onAbrirBuscador(); onCerrar(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-colors cursor-pointer"
          >
            <Search size={15} strokeWidth={1.75} />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="hidden lg:inline text-[11px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <Seccion titulo="Principal">
            <Enlace vista="inicio" onIr={ir} icono={Home} activo={currentView === 'inicio'}>Inicio</Enlace>
            <Enlace vista="solicitudes" onIr={ir} icono={Ticket} activo={currentView === 'solicitudes' || currentView === 'nueva-solicitud' || currentView === 'live-chat'}>Solicitudes</Enlace>
            {user?.role === 'client' && (
              <Enlace vista="guia-tickets" onIr={ir} icono={BookOpen} activo={currentView === 'guia-tickets'}>Guía de ayuda</Enlace>
            )}
            <Enlace vista="buzon" onIr={ir} icono={Inbox} activo={currentView === 'buzon'}>Buzón</Enlace>
          </Seccion>

          {esAdmin && (
            <Seccion titulo="Administración">
              <Enlace vista="admin-supervisor-panel" onIr={ir} icono={LayoutDashboard} activo={currentView === 'admin-supervisor-panel' || currentView === 'centinela-detalles'}>Panel de supervisor</Enlace>
              <Enlace vista="admin-reportes" onIr={ir} icono={BarChart3} activo={currentView === 'admin-reportes'}>Reportes</Enlace>
              <Enlace vista="admin-usuarios" onIr={ir} icono={UserCog} activo={currentView === 'admin-usuarios'}>Usuarios</Enlace>
              <Enlace vista="admin-grupos" onIr={ir} icono={Users} activo={currentView === 'admin-grupos'}>Grupos</Enlace>
              <Enlace vista="admin-categorias" onIr={ir} icono={FolderTree} activo={currentView === 'admin-categorias' || currentView === 'admin-subcategorias'}>Categorías</Enlace>
              <Enlace vista="admin-campanas" onIr={ir} icono={Megaphone} activo={currentView === 'admin-campanas'}>Campañas</Enlace>
            </Seccion>
          )}
        </nav>

        <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-700">Clodos TI Assist · CTI</p>
      </aside>
    </>
  );
}

export default Menu;
