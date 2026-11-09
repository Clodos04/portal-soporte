import React, { useState, useEffect, useCallback } from 'react';

import Header from './components/Header';
import Menu from './components/Menu';
import ColumnCustomizerModal from './components/ColumnCustomizerModal';
import NotesModal from './components/NotesModal';
import EditarSolicitudModal from './components/EditarSolicitudModal';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import SolicitudesView from './views/SolicitudesView';
import NuevaSolicitudView from './views/NuevaSolicitudView';
import LiveChatView from './views/LiveChatView'; 
import EncuestaView from './views/EncuestaView';
import GuiaTicketsView from './views/GuiaTicketsView';
import AdminReportesView from './views/AdminReportesView';
import SupervisorPanel from './views/SupervisorPanel';
import CentinelaDetallesView from './views/CentinelaDetallesView';
import BuzonSugerenciasView from './views/BuzonSugerenciasView';

import AdminGruposView from './views/AdminGruposView';
import AdminUsuariosView from './views/AdminUsuariosView';
import AdminCategoriasView from './views/AdminCategoriasView';
import AdminSubcategoriasView from './views/AdminSubcategoriasView';
import AdminCampanasView from './views/AdminCampanasView';
import Buscador from './components/Buscador';
import useTema from './hooks/useTema';
import useNotificaciones from './hooks/useNotificaciones';
import useDatosPortal from './hooks/useDatosPortal';
import useAlertasSla from './hooks/useAlertasSla';
import useAtajoBuscador from './hooks/useAtajoBuscador';
import useTicketsNuevos from './hooks/useTicketsNuevos';
import { construirHash, interpretarHash } from './utils/rutas';
import { nombrePresentable, listaDeGrupos } from './utils/texto';
import { useAvisos } from './components/Avisos';

function App() {
  const { avisar, confirmar } = useAvisos();
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [user, setUser] = useState(null); 
  const [currentView, setCurrentView] = useState('inicio'); 

  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [folioActivo, setFolioActivo] = useState(null);
  const [folioChatActivo, setFolioChatActivo] = useState(null); 
  const [ticketEnEdicion, setTicketEnEdicion] = useState(null);
  const [ticketParaEncuesta, setTicketParaEncuesta] = useState(null);

  const [categoriaParaSubcategorias, setCategoriaParaSubcategorias] = useState(null);
  const [filtroSolicitudesInicial, setFiltroSolicitudesInicial] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  const { isDarkMode, toggleTheme } = useTema();
  const { alertaVisual, notificaciones, reproducirAlerta, marcarLeidas, limpiarNotificaciones } = useNotificaciones();
  const {
    tickets, setTickets, usuarios, setUsuarios, grupos, setGrupos, campanas, setCampanas,
    categorias, setCategorias, estadisticasEncuestas, setEstadisticasEncuestas, senalChat, enVivo
  } = useDatosPortal({ isLoggedIn, user, reproducirAlerta });
  useAlertasSla({ isLoggedIn, user, tickets, categorias, reproducirAlerta });
  const foliosNuevos = useTicketsNuevos(tickets);

  // Al cambiar de pantalla se vuelve al inicio de la página (antes se conservaba el scroll anterior)
  useEffect(() => { window.scrollTo(0, 0); }, [currentView]);
  const alternarBuscador = useCallback(() => setBuscadorAbierto(abierto => !abierto), []);
  useAtajoBuscador(isLoggedIn, alternarBuscador);

  // ── Direcciones por pantalla (hash): "atrás" del navegador, favoritos y enlaces compartibles ──
  const [rutaLista, setRutaLista] = useState(false);
  const [folioTicketPendiente, setFolioTicketPendiente] = useState(null);
  const esAdminUsuario = user?.role === 'support';

  const aplicarHash = useCallback(() => {
    const { vista, folioChat, folioTicket } = interpretarHash(window.location.hash, { esAdmin: esAdminUsuario });
    if (vista === 'encuesta-ti' && !ticketParaEncuesta) { setCurrentView('inicio'); return; }
    setCurrentView(vista);
    if (folioChat) setFolioChatActivo(folioChat);
    if (folioTicket) {
      setFolioTicketPendiente(folioTicket);
    } else {
      setFolioTicketPendiente(null);
      setIsEditModalOpen(false);
      setTicketEnEdicion(null);
    }
  }, [esAdminUsuario, ticketParaEncuesta]);

  // Al iniciar sesión (o restaurarla) se respeta la dirección con la que se llegó
  useEffect(() => {
    if (!isLoggedIn) { setRutaLista(false); return; }
    aplicarHash();
    setRutaLista(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Botón "atrás" / "adelante" del navegador y enlaces pegados en la barra de direcciones
  useEffect(() => {
    if (!isLoggedIn) return;
    window.addEventListener('hashchange', aplicarHash);
    return () => window.removeEventListener('hashchange', aplicarHash);
  }, [isLoggedIn, aplicarHash]);

  // La interfaz manda: cada cambio de pantalla, chat o ticket abierto actualiza la dirección
  useEffect(() => {
    if (!isLoggedIn || !rutaLista || folioTicketPendiente) return;
    const deseado = construirHash(currentView, {
      folioChat: folioChatActivo,
      folioTicket: isEditModalOpen && ticketEnEdicion ? ticketEnEdicion.folio : null
    });
    const actual = window.location.hash || '#/';
    if (actual === deseado) return;
    // Al cerrar un ticket la dirección "retrocede" a la pantalla sin apilar otra entrada en el historial
    if (actual.startsWith(deseado + '/')) window.history.replaceState(null, '', deseado);
    else window.location.hash = deseado;
  }, [isLoggedIn, rutaLista, folioTicketPendiente, currentView, folioChatActivo, isEditModalOpen, ticketEnEdicion]);

  // Si la dirección trae un ticket, se abre en cuanto los tickets terminan de cargar
  useEffect(() => {
    if (!folioTicketPendiente) return;
    const encontrado = tickets.find(t => String(t.folio) === String(folioTicketPendiente));
    if (encontrado) {
      setTicketEnEdicion(encontrado);
      setIsEditModalOpen(true);
      setFolioTicketPendiente(null);
    } else if (tickets.length > 0) {
      setFolioTicketPendiente(null);
    }
  }, [folioTicketPendiente, tickets]);

  const columnLabels = {
    tecnico: 'Técnico', creador: 'Creado por', asunto: 'Asunto', descripcion: 'Descripción',
    campana: 'Campaña', fecha: 'Fecha', grupo: 'Grupo', categoria: 'Categoría', subcategoria: 'Subcategoría'
  };

  const [activeColumns, setActiveColumns] = useState(['tecnico', 'creador', 'asunto', 'fecha', 'grupo']);
  const [availableColumns, setAvailableColumns] = useState(['descripcion', 'campana', 'categoria', 'subcategoria']);


  // Restaurar la sesión (cookie httpOnly) al recargar la página
  useEffect(() => {
    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.user) {
          setUser({
            name: data.user.name || data.user.username,
            role: data.user.role,
            nivel: data.user.nivel,
            username: data.user.username,
            gruposAsignados: listaDeGrupos(data.user.gruposAsignados),
            campana: data.user.campana || '*111'
          });
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleTomarTicket = async (folio) => {
    const nombreTecnico = user?.name || 'Soporte Técnico';
    const ticketActual = tickets.find(t => String(t.folio) === String(folio));
    if (!ticketActual) return;

    const limpiarFechaMySQL = (fechaStr) => {
      if (!fechaStr) return null;
      if (String(fechaStr).includes('T')) {
        const d = new Date(fechaStr);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
      return fechaStr;
    };

    const ticketLimpioParaGuardar = {
      ...ticketActual,
      tecnico: nombreTecnico,
      estatus: 'En Proceso',
      colorEstatus: 'bg-orange-500',
      created_at: limpiarFechaMySQL(ticketActual.created_at),
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    try {
      const resPut = await fetch(`/api/tickets/${folio}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketLimpioParaGuardar)
      });

      if (!resPut.ok) {
        const errorText = await resPut.text();
        console.error('El servidor rechazó la actualización del ticket:', errorText);
        return;
      }

      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folio: folio,
          remitente: 'Sistema',
          texto: `El técnico ${nombrePresentable(nombreTecnico)} ha tomado tu solicitud y se encuentra en camino a tu posición.`,
          hora: horaActual
        })
      });

      setTickets(tickets.map(t => String(t.folio) === String(folio) ? ticketLimpioParaGuardar : t));
      reproducirAlerta(`Has tomado el ticket #${folio}`);
    } catch (error) {
      console.error('Error al tomar ticket:', error);
    }
  };

  const handleSetCategorias = (nuevasCategorias) => {
    setCategorias(nuevasCategorias);
    fetch('/api/categorias/sincronizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevasCategorias)
    }).catch(err => console.error('Error al sincronizar categorías:', err));
  };

  const usuariosPorGrupo = grupos.reduce((acc, grupo) => {
    acc[grupo] = usuarios
      .filter(u => u.estatus === 'ACTIVO' && u.gruposAsignados && u.gruposAsignados.includes(grupo))
      .map(u => `${u.nombre} ${u.paterno}`);
    return acc;
  }, {});

  const handleAgregarGrupo = (nuevoGrupo) => {
    if (grupos.includes(nuevoGrupo)) return;
    fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevoGrupo })
    }).then(() => setGrupos([...grupos, nuevoGrupo]));
  };

  const handleEliminarGrupo = (grupoAEliminar) => {
    fetch(`/api/grupos/${encodeURIComponent(grupoAEliminar)}`, { method: 'DELETE' })
    .then(() => setGrupos(grupos.filter(g => g !== grupoAEliminar)));
  };

  const guardarNuevaNota = (folio, textoNota) => {
    const autorNota = user?.name || 'Usuario';
    const nuevaNota = { fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }), autor: autorNota, texto: textoNota };
    setTickets(tickets.map(t => t.folio === folio ? { ...t, notas: [...t.notas, nuevaNota] } : t));
  };

  // CORREGIDO: Si el asistente ya lo guardó en BD, no repetir POST y usar el folio oficial DDMMYYNN
  const handleAgregarTicket = (nuevoTicket) => {
    if (nuevoTicket.yaGuardadoEnBD) {
      const copiaLimpia = { ...nuevoTicket };
      delete copiaLimpia.yaGuardadoEnBD;
      setTickets(prev => [copiaLimpia, ...prev.filter(t => t.folio !== copiaLimpia.folio)]);
      setFolioChatActivo(copiaLimpia.folio);
      setCurrentView('live-chat');
      return;
    }

    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoTicket)
    })
    .then(res => res.json())
    .then((data) => {
      const folioFinal = data.folio || nuevoTicket.folio;
      const ticketConFolioOficial = { ...nuevoTicket, folio: folioFinal, id: data.id };
      setTickets(prev => [ticketConFolioOficial, ...prev]);
      setFolioChatActivo(folioFinal);
      setCurrentView('live-chat'); 
    });
  };

  const handleCambiarEstatusTablero = async (ticket, nuevoEstatus) => {
    if (nuevoEstatus === 'Cerrado' && !(await confirmar(`¿Cerrar el ticket #${ticket.folio}? Se registrará en el historial de cambios.`, { textoConfirmar: 'Cerrar ticket', peligro: false }))) return;
    const colorEstatus = nuevoEstatus === 'En Proceso' ? 'bg-orange-500' : nuevoEstatus === 'Cerrado' ? 'bg-red-500' : 'bg-green-500';
    const anterior = tickets;
    setTickets(prev => prev.map(t => (t.folio === ticket.folio ? { ...t, estatus: nuevoEstatus, colorEstatus } : t)));
    try {
      const res = await fetch(`/api/tickets/${ticket.folio}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus, colorEstatus })
      });
      if (!res.ok) throw new Error('El servidor rechazó el cambio');
      avisar(`Ticket #${ticket.folio} movido a ${nuevoEstatus}`, 'exito');
    } catch (error) {
      setTickets(anterior);
      avisar('No se pudo cambiar el estatus. Se restauró el valor anterior.', 'error');
    }
  };

  const handleActualizarTicket = (ticketActualizado) => {
    setTickets(tickets.map(t => t.folio === ticketActualizado.folio ? ticketActualizado : t));
    setIsEditModalOpen(false);
    setTicketEnEdicion(null);
  };

  const handleGuardarEncuesta = (nuevaEncuesta) => {
    fetch('/api/encuestas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaEncuesta)
    })
    .then(res => res.json())
    .then(() => {
      setEstadisticasEncuestas(prev => [...prev, nuevaEncuesta]);
    });
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      const usuarioEncontrado = data.user || (data.success ? data : null);

      if (!response.ok || !usuarioEncontrado) return false;

      const nivel = (usuarioEncontrado.nivel || '').toUpperCase();
      const esAdmin = nivel.includes('ADMIN');
       
      setUser({
        name: `${usuarioEncontrado.nombre || ''} ${usuarioEncontrado.paterno || ''}`.trim() || usuarioEncontrado.username,
        role: esAdmin ? 'support' : 'client',
        nivel: esAdmin ? 'ADMINISTRADOR' : 'CLIENTE',
        username: usuarioEncontrado.username,
        gruposAsignados: listaDeGrupos(usuarioEncontrado.gruposAsignados),
        campana: usuarioEncontrado.campana || '*111'
      });
       
      setIsLoggedIn(true);
      return true;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return false;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={!isDarkMode ? 'light-mode' : ''}>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`${!isDarkMode ? 'light-mode' : ''} min-h-screen flex bg-slate-900 font-sans text-slate-200 relative`}>
      {alertaVisual && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-indigo-500/50 text-slate-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
                    <div>
            <p className="text-xs font-medium text-indigo-400">Clodos TI Assist (CTI)</p>
            <p className="text-sm font-medium">{alertaVisual}</p>
          </div>
        </div>
      )}

      {isColumnCustomizerOpen && (
        <ColumnCustomizerModal 
          activeColumns={activeColumns}
          availableColumns={availableColumns}
          columnLabels={columnLabels}
          onClose={() => setIsColumnCustomizerOpen(false)}
          onSave={(newActive, newAvailable) => {
            setActiveColumns(newActive);
            setAvailableColumns(newAvailable);
            setIsColumnCustomizerOpen(false);
          }}
        />
      )}

      {isNotesModalOpen && (
        <NotesModal 
          folio={folioActivo}
          ticket={tickets.find(t => t.folio === folioActivo)}
          onClose={() => { setIsNotesModalOpen(false); setFolioActivo(null); }}
          onSaveNote={guardarNuevaNota}
        />
      )}

      {isEditModalOpen && ticketEnEdicion && (
        <EditarSolicitudModal 
          ticket={ticketEnEdicion}
          user={user} 
          usuarios={usuarios}
          grupos={grupos}
          usuariosPorGrupo={usuariosPorGrupo}
          categorias={categorias}
          onClose={() => { setIsEditModalOpen(false); setTicketEnEdicion(null); }}
          onActualizar={handleActualizarTicket}
          onAbrirChat={(folio) => {
            setFolioChatActivo(folio);
            setCurrentView('live-chat');
          }}
        />
      )}

      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Saltar al contenido
      </a>

      <Menu
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        onAbrirBuscador={() => setBuscadorAbierto(true)}
        isDarkMode={isDarkMode}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <Header
          enVivo={enVivo}
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirBuscador={() => setBuscadorAbierto(true)}
          notificaciones={notificaciones}
          onMarcarLeidas={marcarLeidas}
          onLimpiarNotificaciones={limpiarNotificaciones}
          
        user={user} 
        onLogout={() => {
          fetch('/api/logout', { method: 'POST' }).catch(() => {});
          setIsLoggedIn(false);
          setUser(null);
          setCurrentView('inicio');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }} 
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main id="contenido" tabIndex={-1} className="p-4 sm:p-6 pb-10 max-w-7xl w-full mx-auto relative z-0 outline-none">
        <div key={currentView} className="animate-entrada">
        {currentView === 'inicio' && (
          <Dashboard 
            user={user} 
            tickets={tickets} 
            categorias={categorias}
            onIrASolicitudes={(filtro, busqueda = '', grupo = '') => { setFiltroSolicitudesInicial({ filtro, busqueda, grupo }); setCurrentView('solicitudes'); }}
            grupos={grupos}
            estadisticasEncuestas={estadisticasEncuestas}
            onTomarTicket={handleTomarTicket}
            onAbrirChat={(folio) => {
              setFolioChatActivo(folio);
              setCurrentView('live-chat');
            }}
            onIrANuevaSolicitud={() => setCurrentView('nueva-solicitud')} 
            onIrAEncuesta={() => { setTicketParaEncuesta(null); setCurrentView('encuesta-ti'); }}
            onIrABuzon={() => setCurrentView('buzon')}
          />
        )}

        {currentView === 'buzon' && (
          <BuzonSugerenciasView user={user} />
        )}

        {currentView === 'encuesta-ti' && (
          <EncuestaView 
            tickets={tickets} 
            user={user}
            ticketEspecifico={ticketParaEncuesta}
            onRegresar={() => { setTicketParaEncuesta(null); setCurrentView('inicio'); }} 
            onGuardarEncuesta={handleGuardarEncuesta}
          />
        )}

        {currentView === 'solicitudes' && (
          <SolicitudesView 
            filtroInicial={filtroSolicitudesInicial}
            usuarios={usuarios}
            grupos={grupos}
            foliosNuevos={foliosNuevos}
            onCambiarEstatus={handleCambiarEstatusTablero}
            onFiltroConsumido={() => setFiltroSolicitudesInicial(null)}
            tickets={tickets}
            categorias={categorias}
            activeColumns={activeColumns}
            columnLabels={columnLabels}
            user={user}
            estadisticasEncuestas={estadisticasEncuestas}
            onOpenCustomizer={() => setIsColumnCustomizerOpen(true)}
            onOpenNotes={(folio) => { setFolioActivo(folio); setIsNotesModalOpen(true); }}
            onNuevaSolicitud={() => setCurrentView('nueva-solicitud')}
            onEditarTicket={(ticket) => { setTicketEnEdicion(ticket); setIsEditModalOpen(true); }}
            onAbrirChat={(folio) => {
              setFolioChatActivo(folio);
              setCurrentView('live-chat');
            }}
            onIrAEncuestaSpecific={(ticket) => {
              setTicketParaEncuesta(ticket);
              setCurrentView('encuesta-ti');
            }}
          />
        )}

        {currentView === 'nueva-solicitud' && (
          <NuevaSolicitudView 
            user={user}
            usuarios={usuarios}
            grupos={grupos}
            campanas={campanas}
            usuariosPorGrupo={usuariosPorGrupo}
            categorias={categorias}
            onVolver={() => setCurrentView('solicitudes')} 
            onGuardar={handleAgregarTicket}
          />
        )}

        {currentView === 'live-chat' && (
          <LiveChatView 
            folio={folioChatActivo} 
            user={user} 
            ticket={tickets.find(t => String(t.folio) === String(folioChatActivo))}
            senalActualizacion={senalChat}
            onTomarTicket={handleTomarTicket}
            onFinalizarChat={() => setCurrentView('solicitudes')} 
            onAbrirModalEdicion={(ticket) => {
              setTicketEnEdicion(ticket);
              setIsEditModalOpen(true);
            }}
          />
        )}

        {currentView === 'admin-grupos' && (
          <AdminGruposView grupos={grupos} onAgregarGrupo={handleAgregarGrupo} onEliminarGrupo={handleEliminarGrupo} />
        )}

        {currentView === 'admin-usuarios' && (
          <AdminUsuariosView grupos={grupos} usuarios={usuarios} setUsuarios={setUsuarios} />
        )}

        {currentView === 'admin-campanas' && (
          <AdminCampanasView campanas={campanas} setCampanas={setCampanas} />
        )}

        {currentView === 'admin-categorias' && (
          categoriaParaSubcategorias ? (
            <AdminSubcategoriasView 
              categoria={categoriaParaSubcategorias}
              categorias={categorias}
              setCategorias={handleSetCategorias}
              user={user}
              onBack={(catActualizada) => setCategoriaParaSubcategorias(catActualizada)}
            />
          ) : (
            <AdminCategoriasView 
              categorias={categorias}
              setCategorias={handleSetCategorias}
              user={user}
              onVerSubcategorias={(cat) => setCategoriaParaSubcategorias(cat)}
            />
          )
        )}

        {currentView === 'admin-reportes' && (
          <AdminReportesView 
            tickets={tickets} 
            campanas={campanas} 
            estadisticasEncuestas={estadisticasEncuestas}
            user={user}
            onIrACentinela={() => setCurrentView('admin-supervisor-panel')}
          />
        )}

        {currentView === 'admin-supervisor-panel' && (
          <SupervisorPanel user={user} tickets={tickets} onVerDetallesCentinela={() => setCurrentView('centinela-detalles')} />
        )}

        {currentView === 'centinela-detalles' && (
          <CentinelaDetallesView tickets={tickets} onVolver={() => setCurrentView('admin-supervisor-panel')} onEditarTicket={(ticket) => { setTicketEnEdicion(ticket); setIsEditModalOpen(true); }} />
        )}

        {currentView === 'guia-tickets' && <GuiaTicketsView />}
        </div>
      </main>
      </div>

      <Buscador
        abierto={buscadorAbierto}
        onCerrar={() => setBuscadorAbierto(false)}
        user={user}
        tickets={tickets}
        onIrAVista={(vista) => setCurrentView(vista)}
        onAbrirTicket={(ticket) => { setTicketEnEdicion(ticket); setIsEditModalOpen(true); }}
      />
    </div>
  );
}

export default App;
