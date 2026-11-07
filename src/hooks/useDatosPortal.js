import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Datos del portal (tickets, usuarios, grupos, campañas, categorías, encuestas) y conexión en tiempo real.
// Solo carga cuando hay sesión iniciada. Socket.io avisa cada cambio y se recargan los tickets.
export default function useDatosPortal({ isLoggedIn, user, reproducirAlerta }) {
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estadisticasEncuestas, setEstadisticasEncuestas] = useState([]);
  // Sube cada vez que llega un evento de chat o de ticket por Socket.io; el chat en vivo la usa para actualizarse al instante
  const [senalChat, setSenalChat] = useState(0);
  // true mientras Socket.io está conectado (indicador "En vivo" del encabezado)
  const [enVivo, setEnVivo] = useState(false);

  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const cargarDatosIniciales = async () => {
      try {
        const resTickets = await fetch('/api/tickets');
        const dataTickets = await resTickets.json();

        // Solo en desarrollo: con ?demo en la dirección se muestran tickets de ejemplo en lugar de los reales
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
          const { generarTicketsDemo } = await import('../utils/datosDemo');
          setTickets(generarTicketsDemo());
          return;
        }

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
        console.error('Error al actualizar datos:', err);
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
    socket.on('connect', () => setEnVivo(true));
    socket.on('disconnect', () => setEnVivo(false));
    socket.on('connect_error', () => setEnVivo(false));

    socket.on('ticketActualizado', () => {
      setSenalChat(n => n + 1);
      cargarDatosIniciales();
    });

    socket.on('nuevoMensajeChat', () => {
      setSenalChat(n => n + 1);
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
      setEnVivo(false);
    };
  }, [isLoggedIn, reproducirAlerta]);

  return {
    tickets, setTickets,
    usuarios, setUsuarios,
    grupos, setGrupos,
    campanas, setCampanas,
    categorias, setCategorias,
    estadisticasEncuestas, setEstadisticasEncuestas,
    senalChat, enVivo
  };
}
