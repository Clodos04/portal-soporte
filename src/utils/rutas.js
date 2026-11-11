// Direcciones del portal. Usan "hash" (#/solicitudes) para no necesitar cambios en el servidor:
//   http://servidor/CTI/#/solicitudes            -> listado
//   http://servidor/CTI/#/solicitudes/16102601   -> listado con el ticket abierto
//   http://servidor/CTI/#/chat/16102601          -> chat del ticket
// Así funcionan el botón "atrás" del navegador, los favoritos y compartir un enlace.

const VISTA_A_RUTA = {
  inicio: '/',
  solicitudes: '/solicitudes',
  'nueva-solicitud': '/nueva',
  'live-chat': '/chat',
  'encuesta-ti': '/encuesta',
  buzon: '/buzon',
  'guia-tickets': '/guia',
  'admin-reportes': '/admin/reportes',
  'admin-usuarios': '/admin/usuarios',
  'admin-grupos': '/admin/grupos',
  'admin-categorias': '/admin/categorias',
  'admin-campanas': '/admin/campanas',
  'centinela-detalles': '/admin/centinela'
};

const RUTA_A_VISTA = Object.fromEntries(Object.entries(VISTA_A_RUTA).map(([vista, ruta]) => [ruta, vista]));

// Enlaces guardados del antiguo "Panel de supervisor": ahora es la pestaña Satisfacción de Reportes
RUTA_A_VISTA['/admin/supervisor'] = 'admin-reportes';

export const esVistaAdmin = (vista) => vista.startsWith('admin-') || vista === 'centinela-detalles';

/** Hash que corresponde al estado actual de la interfaz. */
export function construirHash(vista, { folioChat, folioTicket } = {}) {
  const base = VISTA_A_RUTA[vista] || '/';
  if (vista === 'live-chat' && folioChat) return `#${base}/${encodeURIComponent(folioChat)}`;
  if (vista === 'solicitudes' && folioTicket) return `#${base}/${encodeURIComponent(folioTicket)}`;
  return `#${base}`;
}

/**
 * Interpreta el hash de la barra de direcciones.
 * Devuelve la pantalla y, si aplica, el folio del chat o del ticket que debe abrirse.
 * Las pantallas de administración solo se permiten a administradores.
 */
export function interpretarHash(hash, { esAdmin }) {
  const limpio = String(hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, '') || '/';
  const partes = limpio.split('/').filter(Boolean);

  let ruta = '/' + partes.join('/');
  let folio = null;
  if ((partes[0] === 'chat' || partes[0] === 'solicitudes') && partes.length === 2) {
    ruta = '/' + partes[0];
    try { folio = decodeURIComponent(partes[1]); } catch { folio = partes[1]; }
  }

  let vista = RUTA_A_VISTA[ruta] || 'inicio';
  if (esVistaAdmin(vista) && !esAdmin) vista = 'inicio';
  if (vista === 'live-chat' && !folio) vista = 'solicitudes';

  return {
    vista,
    folioChat: vista === 'live-chat' ? folio : null,
    folioTicket: vista === 'solicitudes' ? folio : null
  };
}
