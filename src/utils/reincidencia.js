import { parsearFechaLocal } from './sla';

// Equipo reincidente: el mismo equipo con la misma falla (subcategoría) varias veces en pocos días.
export const DIAS_REINCIDENCIA = 30;
export const MINIMO_ANTERIORES = 2; // con 2 reportes previos, este ya es el tercero

export const reportesPreviosDelEquipo = (ticket, tickets = [], dias = DIAS_REINCIDENCIA) => {
  const equipo = String(ticket?.equipo || '').trim().toUpperCase();
  if (!ticket || !equipo || equipo === 'NINGUNO') return [];
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  const sub = String(ticket.subcategoria || '').trim().toUpperCase();
  return tickets.filter(t => {
    if (String(t.folio) === String(ticket.folio)) return false;
    if (String(t.equipo || '').trim().toUpperCase() !== equipo) return false;
    if (String(t.subcategoria || '').trim().toUpperCase() !== sub) return false;
    const f = parsearFechaLocal(t.created_at || t.fecha);
    return f && f.getTime() >= limite;
  });
};

export const esEquipoReincidente = (previos) => previos.length >= MINIMO_ANTERIORES;
