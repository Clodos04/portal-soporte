import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

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
import { calcularSLA, esTicketCerrado } from './utils/sla';
import Buscador from './components/Buscador';
import { useAvisos } from './components/Avisos';

function App() {
  const { avisar, confirmar } = useAvisos();
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [user, setUser] = useState(null); 
  const [currentView, setCurrentView] = useState('inicio'); 

  // Estado para Modo Oscuro / Claro (Persistente en localStorage)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('sav_theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  // Barras de desplazamiento, inputs nativos y color de la barra del navegador acordes al tema
  useEffect(() => {
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDarkMode ? '#0f1011' : '#f1f5f9');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const nextMode = !prev;
      localStorage.setItem('sav_theme', nextMode ? 'dark' : 'light');
      return nextMode;
    });
  };

  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [folioActivo, setFolioActivo] = useState(null);
  const [folioChatActivo, setFolioChatActivo] = useState(null); 
  const [ticketEnEdicion, setTicketEnEdicion] = useState(null);
  const [ticketParaEncuesta, setTicketParaEncuesta] = useState(null);

  const [categoriaParaSubcategorias, setCategoriaParaSubcategorias] = useState(null);
  const [alertaVisual, setAlertaVisual] = useState(null);
  const [filtroSolicitudesInicial, setFiltroSolicitudesInicial] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  // Historial de notificaciones de la sesión (campana del encabezado)
  const [notificaciones, setNotificaciones] = useState([]);

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
    setNotificaciones(prev => [{ id: Date.now() + Math.random(), texto: mensajeTexto, fecha: new Date(), leida: false }, ...prev].slice(0, 30));
    const audio = new Audio('/Sonidos/minecraft_exp.mp3');
    audio.play().catch(err => console.log("Audio bloqueado por el navegador:", err));
    setAlertaVisual(mensajeTexto);
    setTimeout(() => { setAlertaVisual(null); }, 4000);

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("CTI - Actualización", { body: mensajeTexto, icon: "/favicon.svg" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("CTI - Actualización", { body: mensajeTexto, icon: "/favicon.svg" });
          }
        });
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
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

    // CONEXIÓN ESTABLE EN TIEMPO REAL CON SOCKET.IO
    const socket = io();

    socket.on('ticketActualizado', (data) => {
      console.log("Actualización en tiempo real recibida:", data);
      cargarDatosIniciales(); 
    });

    socket.on('nuevoMensajeChat', (data) => {
      console.log("Nuevo mensaje de chat en tiempo real:", data);
      cargarDatosIniciales();
    });

    // Aviso al autor de una sugerencia / reporte cuando el administrador la responde o cambia su estatus
    socket.on('buzonRespondido', (data) => {
      if (!data || !data.username || data.username !== userRef.current?.username) return;
      reproducirAlerta(data.estatus === 'APLICADO'
        ? '¡Tu sugerencia fue APLICADA! Gracias por ayudarnos a mejorar.'
        : `Tu ${String(data.tipo || 'sugerencia').toLowerCase()} del Buzón fue ${data.conRespuesta ? 'respondida' : 'actualizada'} (${data.estatus}).`);
    });

    socket.on('nuevoFeedbackBuzon', (data) => {
      reproducirAlerta(`Nuevo comentario en el Buzón (${data?.tipo || 'SUGERENCIA'}) de ${data?.usuario || 'Usuario'}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn]);

  // Alertas de SLA: avisa al equipo de soporte cuando un ticket abierto llega a 80% de su tiempo o se vence.
  // Se avisa una sola vez por ticket y nivel; revisa cada minuto con los datos más recientes.
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const datosSlaRef = useRef({ tickets: [], categorias: [] });
  const alertasSlaEnviadas = useRef({});
  useEffect(() => { datosSlaRef.current = { tickets, categorias }; }, [tickets, categorias]);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'support') return;
    const revisarSla = () => {
      const { tickets: lista, categorias: cats } = datosSlaRef.current;
      lista.forEach(t => {
        if (esTicketCerrado(t)) { delete alertasSlaEnviadas.current[t.folio]; return; }
        const sla = calcularSLA(t, cats);
        const nivelAlerta = sla.nivel === 'vencido' ? 'vencido' : (sla.critico ? 'critico' : null);
        if (!nivelAlerta || alertasSlaEnviadas.current[t.folio] === nivelAlerta) return;
        // Al primer chequeo tras iniciar sesión solo se registra el estado, para no avisar de todo el histórico a la vez
        const primeraVez = alertasSlaEnviadas.current[t.folio] === undefined && alertasSlaEnviadas.current.__listo !== true;
        alertasSlaEnviadas.current[t.folio] = nivelAlerta;
        if (primeraVez) return;
        reproducirAlerta(nivelAlerta === 'vencido'
          ? `SLA VENCIDO: ticket #${t.folio}`
          : `SLA por vencer (80%): ticket #${t.folio}`);
      });
      if (lista.length > 0) alertasSlaEnviadas.current.__listo = true;
    };
    const arranque = setTimeout(revisarSla, 5000);
    const intervalo = setInterval(revisarSla, 60000);
    return () => { clearTimeout(arranque); clearInterval(intervalo); alertasSlaEnviadas.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.role]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const alTeclear = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscadorAbierto(abierto => !abierto);
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [isLoggedIn]);

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
            campana: data.user.campana || '*111'
          });
          setIsLoggedIn(true);
          setCurrentView('inicio');
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
          texto: `El técnico ${nombreTecnico} ha tomado tu solicitud y se encuentra en camino a tu posición.`,
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
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirBuscador={() => setBuscadorAbierto(true)}
          notificaciones={notificaciones}
          onMarcarLeidas={() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))}
          onLimpiarNotificaciones={() => setNotificaciones([])}
          
        user={user} 
        onLogout={() => { fetch('/api/logout', { method: 'POST' }).catch(() => {}); setIsLoggedIn(false); setUser(null); }} 
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main id="contenido" tabIndex={-1} className="p-4 sm:p-6 pb-10 max-w-7xl w-full mx-auto relative z-0 outline-none">
        {currentView === 'inicio' && (
          <Dashboard 
            user={user} 
            tickets={tickets} 
            categorias={categorias}
            onIrASolicitudes={(filtro) => { setFiltroSolicitudesInicial(filtro); setCurrentView('solicitudes'); }}
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
