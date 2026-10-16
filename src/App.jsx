import React, { useState, useEffect } from 'react';

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
import Tareas from './views/Tareas';
import Informes from './views/Informes';
import EncuestaView from './views/EncuestaView';
import GuiaTicketsView from './views/GuiaTicketsView';
import AdminReportesView from './views/AdminReportesView';
import SupervisorPanel from './views/SupervisorPanel';
import CentinelaDetallesView from './views/CentinelaDetallesView';

import AdminGruposView from './views/AdminGruposView';
import AdminUsuariosView from './views/AdminUsuariosView';
import AdminCategoriasView from './views/AdminCategoriasView';
import AdminSubcategoriasView from './views/AdminSubcategoriasView';
import AdminCampanasView from './views/AdminCampanasView';

function App() {
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
  const [alertaVisual, setAlertaVisual] = useState(null);

  const columnLabels = {
    tecnico: 'Técnico', creador: 'Creado por', asunto: 'Asunto', descripcion: 'Descripción',
    campana: 'Campaña', fecha: 'Fecha', grupo: 'Grupo', categoria: 'Categoría', subcategoria: 'Subcategoría'
  };

  const [activeColumns, setActiveColumns] = useState(['tecnico', 'creador', 'asunto', 'fecha', 'grupo']);
  const [availableColumns, setAvailableColumns] = useState(['descripcion', 'campana', 'categoria', 'subcategoria']);

  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estadisticasEncuestas, setEstadisticasEncuestas] = useState([]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (currentView === 'live-chat' || currentView === 'nueva-solicitud') {
        event.preventDefault();
        setCurrentView('solicitudes');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  const reproducirAlerta = (mensajeTexto) => {
    const audio = new Audio('/Sonidos/minecraft_exp.mp3');
    audio.play().catch(err => console.log("Audio bloqueado por el navegador:", err));
    setAlertaVisual(mensajeTexto);
    setTimeout(() => { setAlertaVisual(null); }, 4000);

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Contactus - Actualización", { body: mensajeTexto, icon: "/favicon.ico" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Contactus - Actualización", { body: mensajeTexto, icon: "/favicon.ico" });
          }
        });
      }
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const cargarDatosIniciales = async () => {
      try {
        const resTickets = await fetch('/api/tickets');
        const dataTickets = await resTickets.json();
        
        if (Array.isArray(dataTickets)) {
          setTickets(prevTickets => {
            if (prevTickets.length > 0) {
              dataTickets.forEach(ticketNuevo => {
                const anterior = prevTickets.find(t => t.folio === ticketNuevo.folio);
                if (anterior) {
                  if (anterior.estatus !== ticketNuevo.estatus) {
                    reproducirAlerta(`Ticket #${ticketNuevo.folio} cambió a: ${ticketNuevo.estatus}`);
                  } else if (anterior.tecnico !== ticketNuevo.tecnico) {
                    reproducirAlerta(`Ticket #${ticketNuevo.folio} asignado a: ${ticketNuevo.tecnico}`);
                  }
                }
              });
            }
            return dataTickets;
          });
        }
      } catch (err) {
        console.error("Error al actualizar datos:", err);
      }
    };

    cargarDatosIniciales();

    fetch('/api/usuarios').then(res => res.json()).then(data => { if (Array.isArray(data)) setUsuarios(data); });
    fetch('/api/grupos').then(res => res.json()).then(data => { if (Array.isArray(data)) setGrupos(data); });
    fetch('/api/campanas').then(res => res.json()).then(data => { if (Array.isArray(data)) setCampanas(data); });
    fetch('/api/categorias').then(res => res.json()).then(data => { if (Array.isArray(data)) setCategorias(data); });
    fetch('/api/encuestas/reporte').then(res => res.json()).then(data => { if (data && data.historial) setEstadisticasEncuestas(data.historial); });

    const intervaloRefresco = setInterval(cargarDatosIniciales, 5000);
    return () => clearInterval(intervaloRefresco);
  }, [folioChatActivo]);

  // FUNCIÓN PARA TOMAR TICKET DIRECTAMENTE (Dashboard y Chat)
  const handleTomarTicket = async (folio) => {
    const nombreTecnico = user?.name || 'Soporte Técnico';
    const ticketActual = tickets.find(t => String(t.folio) === String(folio));
    if (!ticketActual) return;

    const ticketActualizado = {
      ...ticketActual,
      tecnico: nombreTecnico,
      estatus: 'En Proceso',
      colorEstatus: 'bg-orange-500'
    };

    try {
      // 1. Actualizar el ticket en el backend
      await fetch(`/api/tickets/${folio}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketActualizado)
      });

      // 2. Enviar mensaje automático al chat
      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folio: folio,
          remitente: 'Sistema',
          texto: `👨‍💻 El técnico ${nombreTecnico} ha tomado tu solicitud y se encuentra en camino a tu posición.`,
          hora: horaActual
        })
      });

      // 3. Actualizar estado local
      setTickets(tickets.map(t => String(t.folio) === String(folio) ? ticketActualizado : t));
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

  const handleAgregarTicket = (nuevoTicket) => {
    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoTicket)
    })
    .then(res => res.json())
    .then(() => {
      setTickets([nuevoTicket, ...tickets]);
      setFolioChatActivo(nuevoTicket.folio);
      setCurrentView('live-chat'); 
    });
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
      const esSoporte = nivel === 'ADMINISTRADOR' || nivel === 'TECNICO SUPERVISOR' || nivel === 'TECNICO';
      
      setUser({
        name: `${usuarioEncontrado.nombre || ''} ${usuarioEncontrado.paterno || ''}`.trim() || usuarioEncontrado.username,
        role: esSoporte ? 'support' : 'client',
        nivel: usuarioEncontrado.nivel,
        username: usuarioEncontrado.username,
        campana: usuarioEncontrado.campana || '*111'
      });
      
      setIsLoggedIn(true);
      setCurrentView('inicio');
      return true;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return false;
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans pb-10 text-slate-200 relative">
      {alertaVisual && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-indigo-500/50 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <span className="text-xl">🔔</span>
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Actualización Portal</p>
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

      <Header user={user} onLogout={() => { setIsLoggedIn(false); setUser(null); }} />
      <Menu currentView={currentView} setCurrentView={setCurrentView} user={user} />

      <main className="p-6 max-w-7xl mx-auto relative z-0">
        {currentView === 'inicio' && (
          <Dashboard 
            user={user} 
            tickets={tickets} 
            estadisticasEncuestas={estadisticasEncuestas}
            onTomarTicket={handleTomarTicket}
            onAbrirChat={(folio) => {
              setFolioChatActivo(folio);
              setCurrentView('live-chat');
            }}
            onIrANuevaSolicitud={() => setCurrentView('nueva-solicitud')} 
            onIrAEncuesta={() => { setTicketParaEncuesta(null); setCurrentView('encuesta-ti'); }}
          />
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
            tickets={tickets}
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
          <AdminReportesView tickets={tickets} campanas={campanas} />
        )}

        {currentView === 'admin-supervisor-panel' && (
          <SupervisorPanel user={user} tickets={tickets} onVerDetallesCentinela={() => setCurrentView('centinela-detalles')} />
        )}

        {currentView === 'centinela-detalles' && (
          <CentinelaDetallesView tickets={tickets} onVolver={() => setCurrentView('admin-supervisor-panel')} onEditarTicket={(ticket) => { setTicketEnEdicion(ticket); setIsEditModalOpen(true); }} />
        )}

        {currentView === 'tareas' && <Tareas />}
        {currentView === 'informes' && <Informes />}
        {currentView === 'guia-tickets' && <GuiaTicketsView />}
      </main>
    </div>
  );
}

export default App;
