import React, { useState } from 'react';
import { ChevronDown, Inbox, LayoutDashboard, Users, UserCog, FolderTree, Megaphone, BarChart3, MessageSquare } from 'lucide-react';

const VISTAS_ADMIN = [
  'admin-grupos',
  'admin-usuarios',
  'admin-categorias',
  'admin-subcategorias',
  'admin-formularios',
  'admin-reportes',
  'admin-campanas',
  'admin-supervisor-panel',
  'centinela-detalles'
];

function Pestana({ vista, activo, onIr, children, icono: Icono }) {
  return (
    <button
      onClick={() => onIr(vista)}
      aria-current={activo ? 'page' : undefined}
      className={`py-3.5 px-1 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
        activo ? 'text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {Icono && <Icono size={15} strokeWidth={1.75} />}
      {children}
      {activo && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
    </button>
  );
}

function ItemAdmin({ vista, onIr, icono: Icono, children, separado }) {
  return (
    <button
      onClick={() => onIr(vista)}
      className={`w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 rounded-md transition-colors flex items-center gap-2.5 cursor-pointer ${
        separado ? 'mt-1 border-t border-slate-700 rounded-t-none pt-2.5' : ''
      }`}
    >
      <Icono size={15} strokeWidth={1.75} className="text-slate-400" />
      {children}
    </button>
  );
}

function Menu({ currentView, setCurrentView, user }) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const isAdminView = VISTAS_ADMIN.includes(currentView);
  const nivelUsuario = (user?.nivel || '').toUpperCase();
  const esAdmin = nivelUsuario.includes('ADMIN') || user?.role === 'support';

  const ir = (vista) => { setCurrentView(vista); setIsAdminOpen(false); };

  return (
    <nav className="bg-slate-900 border-b border-slate-700 px-6 flex justify-between items-center relative z-20">
      <div className="flex gap-6 items-center">
        <Pestana onIr={ir} vista="inicio" activo={currentView === 'inicio'}>Inicio</Pestana>
        <Pestana onIr={ir} vista="solicitudes" activo={currentView === 'solicitudes' || currentView === 'nueva-solicitud'}>Solicitudes</Pestana>
        <Pestana onIr={ir} vista="tareas" activo={currentView === 'tareas'}>Tareas</Pestana>
        <Pestana onIr={ir} vista="informes" activo={currentView === 'informes'}>Informes</Pestana>

        {user?.role === 'client' && (
          <Pestana onIr={ir} vista="guia-tickets" activo={currentView === 'guia-tickets'}>Guía de ayuda</Pestana>
        )}

        <Pestana onIr={ir} vista="buzon" activo={currentView === 'buzon'} icono={Inbox}>Buzón</Pestana>

        {esAdmin && (
          <div className="relative">
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              aria-expanded={isAdminOpen}
              className={`py-3.5 px-1 text-sm font-medium transition-colors relative flex items-center gap-1 cursor-pointer ${
                isAdminView ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Administración
              <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform ${isAdminOpen ? 'rotate-180' : ''}`} />
              {isAdminView && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>

            {isAdminOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50">
                <ItemAdmin onIr={ir} vista="admin-supervisor-panel" icono={LayoutDashboard}>Panel de supervisor</ItemAdmin>
                <ItemAdmin onIr={ir} vista="admin-grupos" icono={Users}>Grupos</ItemAdmin>
                <ItemAdmin onIr={ir} vista="admin-usuarios" icono={UserCog}>Usuarios</ItemAdmin>
                <ItemAdmin onIr={ir} vista="admin-categorias" icono={FolderTree}>Categorías</ItemAdmin>
                <ItemAdmin onIr={ir} vista="admin-campanas" icono={Megaphone}>Campañas</ItemAdmin>
                <ItemAdmin onIr={ir} vista="admin-reportes" icono={BarChart3}>Reportes</ItemAdmin>
                <ItemAdmin onIr={ir} vista="buzon" icono={MessageSquare} separado>Bandeja del buzón</ItemAdmin>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Menu;
