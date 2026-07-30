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
import Tareas from './views/Tareas';
import Informes from './views/Informes';
import EncuestaView from './views/EncuestaView';
import GuiaTicketsView from './views/GuiaTicketsView';
import AdminReportesView from './views/AdminReportesView';

import AdminGruposView from './views/AdminGruposView';
import AdminUsuariosView from './views/AdminUsuariosView';
import AdminCategoriasView from './views/AdminCategoriasView';
import AdminSubcategoriasView from './views/AdminSubcategoriasView';
import AdminCampanasView from './views/AdminCampanasView';

import { categoriasIniciales } from './data/categoriasData';
import { listaCampanas } from './data/campanasData';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [user, setUser] = useState(null); 
  const [currentView, setCurrentView] = useState('inicio'); 

  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [folioActivo, setFolioActivo] = useState(null);
  const [ticketEnEdicion, setTicketEnEdicion] = useState(null);
  const [ticketParaEncuesta, setTicketParaEncuesta] = useState(null);

  const [categoriaParaSubcategorias, setCategoriaParaSubcategorias] = useState(null);

  const columnLabels = {
    tecnico: 'Técnico', creador: 'Creado por', asunto: 'Asunto', descripcion: 'Descripción',
    campana: 'Campaña', fecha: 'Fecha', grupo: 'Grupo', categoria: 'Categoría', subcategoria: 'Subcategoría'
  };

  const [activeColumns, setActiveColumns] = useState(['tecnico', 'creador', 'asunto', 'fecha', 'grupo']);
  const [availableColumns, setAvailableColumns] = useState(['descripcion', 'campana', 'categoria', 'subcategoria']);

  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // Inicializado vacío para llenarlo desde la BD
  const [estadisticasEncuestas, setEstadisticasEncuestas] = useState([]);

  // Cargar tickets y usuarios desde la base de datos al iniciar la aplicación (o al presionar F5)
  useEffect(() => {
    // Cargar Tickets
    fetch('/api/tickets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTickets(data);
      })
      .catch(err => console.error('Error al cargar tickets:', err));

    // Cargar Usuarios
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsuarios(data);
      })
      .catch(err => console.error('Error al cargar usuarios:', err));
  }, []);

  const [grupos, setGrupos] = useState([
    'TI',
    'TELEFONIA, COMUNICACIONES Y REDES',
    'DESARROLLO DE SOFTWARE',
    'CONTROL ESTADISTICO',
    'SOPORTE TECNICO',
    'BASES E INFORMES',
    'CLAVES',
    'FOLIOS BIT',
    'MANTENIMIENTO',
    'CENTINELA'
  ]);

  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [campanas, setCampanas] = useState(listaCampanas);

  const usuariosPorGrupo = grupos.reduce((acc, grupo) => {
    acc[grupo] = usuarios
      .filter(u => u.estatus === 'ACTIVO' && u.gruposAsignados && u.gruposAsignados.includes(grupo))
      .map(u => `${u.nombre} ${u.paterno}`);
    return acc;
  }, {});

  const handleAgregarGrupo = (nuevoGrupo) => {
    if (grupos.includes(nuevoGrupo)) return;
    setGrupos([...grupos, nuevoGrupo]);
  };

  const handleEliminarGrupo = (grupoAEliminar) => {
    setGrupos(grupos.filter(g => g !== grupoAEliminar));
  };

  const guardarNuevaNota = (folio, textoNota) => {
    const autorNota = user?.name || 'Usuario';
    const nuevaNota = { fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }), autor: autorNota, texto: textoNota };
    setTickets(tickets.map(t => t.folio === folio ? { ...t, notas: [...t.notas, nuevaNota] } : t));
  };

  // Guardar nuevo ticket en la base de datos a través de la API
  const handleAgregarTicket = (nuevoTicket) => {
    fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoTicket)
    })
    .then(res => res.json())
    .then(() => {
      setTickets([nuevoTicket, ...tickets]);
      setCurrentView('solicitudes');
    })
    .catch(err => console.error('Error al guardar ticket:', err));
  };

  const handleActualizarTicket = (ticketActualizado) => {
    setTickets(tickets.map(t => t.folio === ticketActualizado.folio ? ticketActualizado : t));
    setIsEditModalOpen(false);
    setTicketEnEdicion(null);
  };

  const handleGuardarEncuesta = (nuevaEncuesta) => {
    setEstadisticasEncuestas([...estadisticasEncuestas, nuevaEncuesta]);
  };

  const handleLogin = (username, password) => {
    const usuarioEncontrado = usuarios.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!usuarioEncontrado) {
      alert('Usuario o contraseña incorrectos.');
      return false;
    }

    if (usuarioEncontrado.estatus !== 'ACTIVO') {
      alert('Este usuario se encuentra inactivo (Baja).');
      return false;
    }

    const role = usuarioEncontrado.nivel === 'ADMINISTRADOR' ? 'support' : 'client';
    
    setUser({
      name: `${usuarioEncontrado.nombre} ${usuarioEncontrado.paterno}`,
      role: role,
      username: usuarioEncontrado.username
    });
    setIsLoggedIn(true);
    setCurrentView('inicio');
    return true;
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans pb-10 text-slate-200 relative">
      
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
            onOpenCustomizer={() => setIsColumnCustomizerOpen(true)}
            onOpenNotes={(folio) => { setFolioActivo(folio); setIsNotesModalOpen(true); }}
            onNuevaSolicitud={() => setCurrentView('nueva-solicitud')}
            onEditarTicket={(ticket) => { setTicketEnEdicion(ticket); setIsEditModalOpen(true); }}
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

        {currentView === 'admin-grupos' && (
          <AdminGruposView 
            grupos={grupos} 
            onAgregarGrupo={handleAgregarGrupo} 
            onEliminarGrupo={handleEliminarGrupo} 
          />
        )}

        {currentView === 'admin-usuarios' && (
          <AdminUsuariosView 
            grupos={grupos} 
            usuarios={usuarios}
            setUsuarios={setUsuarios}
          />
        )}

        {currentView === 'admin-campanas' && (
          <AdminCampanasView 
            campanas={campanas}
            setCampanas={setCampanas}
          />
        )}

        {currentView === 'admin-categorias' && (
          categoriaParaSubcategorias ? (
            <AdminSubcategoriasView 
              categoria={categoriaParaSubcategorias}
              categorias={categorias}
              setCategorias={setCategorias}
              user={user}
              onBack={(catActualizada) => setCategoriaParaSubcategorias(catActualizada)}
            />
          ) : (
            <AdminCategoriasView 
              categorias={categorias}
              setCategorias={setCategorias}
              user={user}
              onVerSubcategorias={(cat) => setCategoriaParaSubcategorias(cat)}
            />
          )
        )}

        {currentView === 'admin-formularios' && (
          <div className="text-center py-20 text-slate-500 uppercase font-bold">Módulo de Formularios (Próximamente)</div>
        )}

        {currentView === 'admin-reportes' && (
          <AdminReportesView 
            tickets={tickets} 
            campanas={campanas} 
          />
        )}

        {currentView === 'tareas' && <Tareas />}
        {currentView === 'informes' && <Informes />}
        {currentView === 'guia-tickets' && <GuiaTicketsView />}
      </main>
    </div>
  );
}

export default App;
