import React, { useState } from 'react';

function Menu({ currentView, setCurrentView, user }) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const isAdminView = [
    'admin-grupos', 
    'admin-usuarios', 
    'admin-categorias', 
    'admin-subcategorias', 
    'admin-formularios', 
    'admin-reportes',
    'admin-campanas',
    'admin-supervisor-panel',
    'centinela-detalles'
  ].includes(currentView);

  const nivelUsuario = (user?.nivel || '').toUpperCase();
  const esAdmin = nivelUsuario.includes('ADMIN') || user?.role === 'support';

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 flex justify-between items-center relative z-20">
      <div className="flex space-x-6 items-center">
        
        <button
          onClick={() => { setCurrentView('inicio'); setIsAdminOpen(false); }}
          className={`py-4 px-2 font-medium text-sm transition-colors relative cursor-pointer ${
            currentView === 'inicio' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Inicio
          {currentView === 'inicio' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
          )}
        </button>

        <button
          onClick={() => { setCurrentView('solicitudes'); setIsAdminOpen(false); }}
          className={`py-4 px-2 font-medium text-sm transition-colors relative cursor-pointer ${
            currentView === 'solicitudes' || currentView === 'nueva-solicitud' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Solicitudes
          {(currentView === 'solicitudes' || currentView === 'nueva-solicitud') && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
          )}
        </button>

        <button
          onClick={() => { setCurrentView('tareas'); setIsAdminOpen(false); }}
          className={`py-4 px-2 font-medium text-sm transition-colors relative cursor-pointer ${
            currentView === 'tareas' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tareas
          {currentView === 'tareas' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
          )}
        </button>

        <button
          onClick={() => { setCurrentView('informes'); setIsAdminOpen(false); }}
          className={`py-4 px-2 font-medium text-sm transition-colors relative cursor-pointer ${
            currentView === 'informes' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Informes
          {currentView === 'informes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
          )}
        </button>

        {user?.role === 'client' && (
          <button
            onClick={() => { setCurrentView('guia-tickets'); setIsAdminOpen(false); }}
            className={`py-4 px-2 font-medium text-sm transition-colors relative cursor-pointer ${
              currentView === 'guia-tickets' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Guía de Ayuda
            {currentView === 'guia-tickets' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
            )}
          </button>
        )}

        {/* Pestaña del Buzón de Sugerencias y Reporte de Errores (Visible para todos) */}
        <button
          onClick={() => { setCurrentView('buzon'); setIsAdminOpen(false); }}
          className={`py-4 px-2 font-medium text-sm transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            currentView === 'buzon' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📬</span> Buzón / Feedback
          {currentView === 'buzon' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
          )}
        </button>

        {esAdmin && (
          <div className="relative">
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`py-4 px-2 font-medium text-sm transition-colors relative flex items-center gap-1 cursor-pointer ${
                isAdminView ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin ▾
              {isAdminView && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
              )}
            </button>

            {isAdminOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200">
                
                <button
                  onClick={() => { setCurrentView('admin-supervisor-panel'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 text-indigo-400 border-b border-slate-700/60 mb-1 cursor-pointer"
                >
                  📊 Panel Supervisor
                </button>

                <button
                  onClick={() => { setCurrentView('admin-grupos'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  👥 Grupos
                </button>
                <button
                  onClick={() => { setCurrentView('admin-usuarios'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  👤 Usuarios
                </button>
                <button
                  onClick={() => { setCurrentView('admin-categorias'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  🗂️ Categorías
                </button>
                <button
                  onClick={() => { setCurrentView('admin-campanas'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  📣 Campañas
                </button>
                <button
                  onClick={() => { setCurrentView('admin-reportes'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  📈 Reportes
                </button>
                <button
                  onClick={() => { setCurrentView('buzon'); setIsAdminOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase hover:bg-slate-700/60 transition-colors flex items-center gap-2 text-amber-400 border-t border-slate-700/60 mt-1 pt-2.5 cursor-pointer"
                >
                  📬 Bandeja de Buzón
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </nav>
  );
}

export default Menu;
