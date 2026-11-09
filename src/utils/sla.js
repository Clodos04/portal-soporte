// Cálculo centralizado del SLA de un ticket (lo usan el listado, las alertas y los paneles).
// El límite sale de la categoría (horas); si no existe, del propio ticket; por defecto 24 h.

export const UMBRAL_RIESGO = 0.5;      // a partir de 50% del tiempo consumido: "Por vencer"
export const UMBRAL_CRITICO = 0.8;     // a partir de 80%: se avisa al equipo de soporte

// Las fechas llegan como "YYYY-MM-DD HH:mm:ss" en hora de México; se interpretan como hora local sin desfases.
export const parsearFechaLocal = (str) => {
  if (!str) return null;
  const partes = String(str).trim().split(/[- :T]/);
  if (partes.length >= 3) {
    const [y, m, d, h = 0, min = 0, s = 0] = partes.map(p => parseInt(p, 10));
    const fecha = new Date(y, m - 1, d, h || 0, min || 0, s || 0);
    return isNaN(fecha.getTime()) ? null : fecha;
  }
  const fecha = new Date(str);
  return isNaN(fecha.getTime()) ? null : fecha;
};

export const formatearDuracion = (minutos) => {
  const total = Math.max(0, Math.floor(minutos));
  if (total < 60) return `${total}m`;
  const horas = total / 60;
  if (horas < 24) return `${Math.floor(horas)}h ${total % 60}m`;
  return `${Math.floor(horas / 24)}d ${Math.floor(horas % 24)}h`;
};

export const esTicketCerrado = (ticket) => (ticket?.estatus || '').toLowerCase().includes('cerrado');

export const obtenerLimiteSlaHoras = (ticket, categorias = []) => {
  const nombreCategoria = (ticket?.categoria || '').trim().toUpperCase();
  const categoria = categorias.find(c => c.nombre && c.nombre.trim().toUpperCase() === nombreCategoria);
  return Number(categoria?.sla) || Number(ticket?.sla) || 24;
};

/**
 * Devuelve el estado del SLA de un ticket.
 * nivel: 'sin_fecha' | 'cerrado' | 'ok' | 'riesgo' | 'vencido'
 * critico: true cuando el ticket abierto ya consumió >= 80% de su tiempo (o está vencido)
 */
export const calcularSLA = (ticket, categorias = [], ahora = new Date()) => {
  const inicio = parsearFechaLocal(ticket?.created_at || ticket?.fecha);
  if (!inicio) return { nivel: 'sin_fecha', critico: false, transcurridoMin: 0, limiteMin: 0, restanteMin: 0, porcentaje: 0 };

  const inicioEfectivo = inicio > ahora ? ahora : inicio;
  const cerrado = esTicketCerrado(ticket);
  let fin = ahora;
  const marcaCierre = ticket?.fecha_cierre || ticket?.updated_at; // fecha_cierre no cambia al editar el ticket
  if (cerrado && marcaCierre) {
    const finTicket = parsearFechaLocal(marcaCierre);
    if (finTicket) fin = finTicket;
  }

  const transcurridoMin = Math.max(0, Math.floor((fin - inicioEfectivo) / 60000));
  const limiteMin = obtenerLimiteSlaHoras(ticket, categorias) * 60;
  const restanteMin = limiteMin - transcurridoMin;
  const porcentaje = limiteMin > 0 ? transcurridoMin / limiteMin : 0;

  if (cerrado) {
    return { nivel: 'cerrado', critico: false, cumplido: transcurridoMin <= limiteMin, transcurridoMin, limiteMin, restanteMin, porcentaje };
  }

  let nivel = 'ok';
  if (porcentaje >= 1) nivel = 'vencido';
  else if (porcentaje >= UMBRAL_RIESGO) nivel = 'riesgo';

  return { nivel, critico: porcentaje >= UMBRAL_CRITICO, transcurridoMin, limiteMin, restanteMin, porcentaje };
};
