// Métricas para las gráficas. Son funciones puras: reciben los tickets (y las categorías) y devuelven
// los datos listos para graficar. No tocan el servidor.
import { calcularSLA, parsearFechaLocal, esTicketCerrado } from './sla';
import { tipoEstatus } from './estatus';

const DIA_MS = 24 * 60 * 60 * 1000;

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export const claveFecha = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fechaCreacion = (t) => parsearFechaLocal(t.created_at || t.fecha);
const fechaCierre = (t) => parsearFechaLocal(t.fecha_cierre || t.updated_at) || fechaCreacion(t);

/** Devuelve los tickets creados dentro de los últimos `dias` días (0 = todos). */
export function filtrarPorRango(tickets, dias, ahora = new Date()) {
  if (!dias) return tickets;
  const desde = inicioDelDia(new Date(ahora.getTime() - (dias - 1) * DIA_MS));
  return tickets.filter(t => {
    const f = fechaCreacion(t);
    return f && f >= desde;
  });
}

/** Tickets creados y cerrados por día en los últimos `dias` días (incluye los días sin movimiento). */
export function ticketsPorDia(tickets, dias = 30, ahora = new Date()) {
  const inicio = inicioDelDia(new Date(ahora.getTime() - (dias - 1) * DIA_MS));
  const mapa = new Map();
  for (let i = 0; i < dias; i++) {
    const f = new Date(inicio.getTime() + i * DIA_MS);
    mapa.set(claveFecha(f), { fecha: claveFecha(f), creados: 0, cerrados: 0 });
  }
  tickets.forEach(t => {
    const c = fechaCreacion(t);
    if (c) { const fila = mapa.get(claveFecha(c)); if (fila) fila.creados += 1; }
    if (esTicketCerrado(t)) {
      const x = fechaCierre(t);
      if (x) { const fila = mapa.get(claveFecha(x)); if (fila) fila.cerrados += 1; }
    }
  });
  return [...mapa.values()];
}

/** Conteo por estatus: Abierto / En proceso / Cerrado. */
export function conteoPorEstatus(tickets) {
  const base = { abierto: 0, proceso: 0, cerrado: 0 };
  tickets.forEach(t => {
    const tipo = tipoEstatus(t.estatus);
    base[tipo === 'otro' ? 'abierto' : tipo] += 1;
  });
  return [
    { clave: 'abierto', nombre: 'Abierto', valor: base.abierto },
    { clave: 'proceso', nombre: 'En proceso', valor: base.proceso },
    { clave: 'cerrado', nombre: 'Cerrado', valor: base.cerrado }
  ];
}

const numeroDeSemana = (fecha) => {
  // Lunes de esa semana como etiqueta estable
  const d = inicioDelDia(fecha);
  const dia = (d.getDay() + 6) % 7; // lunes = 0
  return new Date(d.getTime() - dia * DIA_MS);
};

/** Cumplimiento de SLA por semana (solo tickets cerrados): % resuelto dentro de su tiempo. */
export function cumplimientoSlaSemanal(tickets, categorias, semanas = 8, ahora = new Date()) {
  const lunesActual = numeroDeSemana(ahora);
  const filas = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const lunes = new Date(lunesActual.getTime() - i * 7 * DIA_MS);
    filas.push({ lunes, clave: claveFecha(lunes), cerrados: 0, enSla: 0 });
  }
  const porClave = new Map(filas.map(f => [f.clave, f]));
  tickets.forEach(t => {
    if (!esTicketCerrado(t)) return;
    const cierre = fechaCierre(t);
    if (!cierre) return;
    const fila = porClave.get(claveFecha(numeroDeSemana(cierre)));
    if (!fila) return;
    const sla = calcularSLA(t, categorias, ahora);
    fila.cerrados += 1;
    if (sla.cumplido) fila.enSla += 1;
  });
  return filas.map(f => ({
    semana: `${String(f.lunes.getDate()).padStart(2, '0')}/${String(f.lunes.getMonth() + 1).padStart(2, '0')}`,
    cerrados: f.cerrados,
    enSla: f.enSla,
    cumplimiento: f.cerrados > 0 ? Math.round((f.enSla / f.cerrados) * 100) : null
  }));
}

/** Matriz 7 (lunes..domingo) x 24 (horas) con la cantidad de tickets creados en cada celda. */
export function mapaDeCalorHoras(tickets) {
  const matriz = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maximo = 0;
  tickets.forEach(t => {
    const f = fechaCreacion(t);
    // Solo se usan tickets con hora real (created_at); las fechas sin hora caerían todas a las 00:00
    if (!f || !t.created_at) return;
    const dia = (f.getDay() + 6) % 7;
    matriz[dia][f.getHours()] += 1;
    maximo = Math.max(maximo, matriz[dia][f.getHours()]);
  });
  return { matriz, maximo };
}

const promedio = (valores) => (valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0);

/** Minutos promedio de resolución de los tickets cerrados, agrupados por la clave que indiques. */
export function resolucionPromedio(tickets, campo, limite = 8) {
  const grupos = new Map();
  tickets.forEach(t => {
    if (!esTicketCerrado(t)) return;
    const c = fechaCreacion(t);
    const x = fechaCierre(t);
    if (!c || !x || x < c) return;
    const nombre = String(t[campo] || '').trim() || 'Sin asignar';
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    grupos.get(nombre).push(Math.round((x - c) / 60000));
  });
  return [...grupos.entries()]
    .map(([nombre, minutos]) => ({ nombre, minutos: promedio(minutos), tickets: minutos.length }))
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, limite);
}

/** Comparación con el periodo anterior (mismo número de días inmediatamente antes). */
export function compararConPeriodoAnterior(tickets, dias, ahora = new Date()) {
  if (!dias) return null;
  const actual = filtrarPorRango(tickets, dias, ahora).length;
  const limite = inicioDelDia(new Date(ahora.getTime() - (dias - 1) * DIA_MS));
  const desdeAnterior = new Date(limite.getTime() - dias * DIA_MS);
  const anterior = tickets.filter(t => {
    const f = fechaCreacion(t);
    return f && f >= desdeAnterior && f < limite;
  }).length;
  const variacion = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;
  return { actual, anterior, variacion };
}

export const formatearMinutos = (min) => {
  if (!min) return '0 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
};
