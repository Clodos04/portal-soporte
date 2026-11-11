import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import TarjetaGrafica from './TarjetaGrafica';
import GraficaTicketsPorDia from './GraficaTicketsPorDia';
import GraficaEstatus from './GraficaEstatus';
import GraficaSla from './GraficaSla';
import GraficaResolucion from './GraficaResolucion';
import MapaCalorHoras from './MapaCalorHoras';
import { EstadoVacio } from '../Estados';
import { calcularSLA, esTicketCerrado, META_SLA, semaforoCumplimiento, ESTILOS_SEMAFORO } from '../../utils/sla';
import {
  filtrarPorRango, ticketsPorDia, conteoPorEstatus, cumplimientoSlaSemanal,
  mapaDeCalorHoras, resolucionPromedio, compararConPeriodoAnterior, formatearMinutos
} from '../../utils/metricas';

const RANGOS = [
  { dias: 1, texto: 'Hoy' },
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' },
  { dias: 0, texto: 'Todo' }
];

function Variacion({ comparacion }) {
  if (!comparacion || comparacion.variacion === null) return <span className="text-xs text-slate-500">sin periodo previo</span>;
  const { variacion } = comparacion;
  const Icono = variacion > 0 ? TrendingUp : variacion < 0 ? TrendingDown : Minus;
  // Más tickets no es "bueno" ni "malo" por sí mismo: se usa un color neutro
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-300">
      <Icono size={13} strokeWidth={2} />
      {variacion > 0 ? '+' : ''}{variacion}% vs. periodo anterior
    </span>
  );
}

function Resumen({ titulo, valor, detalle, colorValor = 'text-white' }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 animate-entrada">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${colorValor}`}>{valor}</p>
      <div className="mt-1 min-h-[1rem]">{detalle}</div>
    </div>
  );
}

// Panel de analítica del inicio (solo administradores). Se carga bajo demanda porque usa Recharts.
export default function PanelAnalitica({ tickets, categorias, onFiltrar }) {
  const [rango, setRango] = useState(30);
  const [agrupar, setAgrupar] = useState('categoria');

  const datos = useMemo(() => {
    const enRango = filtrarPorRango(tickets, rango);
    const cerrados = enRango.filter(esTicketCerrado);
    const dentroDeSla = cerrados.filter(t => calcularSLA(t, categorias).cumplido).length;
    const resolucion = resolucionPromedio(enRango, 'categoria', 100);
    const minutosTotales = resolucion.reduce((a, r) => a + r.minutos * r.tickets, 0);
    const ticketsResueltos = resolucion.reduce((a, r) => a + r.tickets, 0);
    return {
      enRango,
      cerradosTotal: cerrados.length,
      cumplimientoGlobal: cerrados.length ? Math.round((dentroDeSla / cerrados.length) * 100) : null,
      resolucionGlobal: ticketsResueltos ? Math.round(minutosTotales / ticketsResueltos) : null,
      // Con "Hoy" una sola barra no dice nada: la gráfica muestra la última semana
      porDia: ticketsPorDia(tickets, rango === 1 ? 7 : (rango || 90)),
      estatus: conteoPorEstatus(enRango),
      slaSemanal: cumplimientoSlaSemanal(tickets, categorias, rango <= 7 && rango > 0 ? 4 : rango === 30 ? 6 : 12),
      mapa: mapaDeCalorHoras(enRango),
      resolucionCategoria: resolucionPromedio(enRango, 'categoria'),
      resolucionTecnico: resolucionPromedio(enRango, 'tecnico'),
      comparacion: compararConPeriodoAnterior(tickets, rango)
    };
  }, [tickets, categorias, rango]);

  const filtrarPorEstatus = (clave) => {
    if (clave === 'cerrado') onFiltrar('cerrados', '');
    else onFiltrar('activos', clave === 'proceso' ? 'proceso' : 'abierto');
  };

  const selectorRango = (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Periodo de las gráficas">
      {RANGOS.map(r => (
        <button
          key={r.dias}
          onClick={() => setRango(r.dias)}
          aria-pressed={rango === r.dias}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${rango === r.dias ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
        >
          {r.texto}
        </button>
      ))}
    </div>
  );

  const selectorAgrupar = (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label="Agrupar por">
      {[{ clave: 'categoria', texto: 'Categoría' }, { clave: 'tecnico', texto: 'Técnico' }].map(o => (
        <button
          key={o.clave}
          onClick={() => setAgrupar(o.clave)}
          aria-pressed={agrupar === o.clave}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${agrupar === o.clave ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );

  if (tickets.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl">
        <EstadoVacio icono={BarChart3} titulo="Aún no hay datos para graficar" descripcion="Cuando se registren tickets, aquí verás tendencias, SLA y tiempos de resolución." />
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Analítica">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Analítica</h2>
          <p className="text-xs text-slate-400 mt-0.5">Haz clic en una rebanada o en una barra para ver esos tickets en el listado.</p>
        </div>
        {selectorRango}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Resumen titulo="Tickets creados" valor={datos.enRango.length} detalle={<Variacion comparacion={datos.comparacion} />} />
        <Resumen titulo="Tickets cerrados" valor={datos.cerradosTotal} detalle={<span className="text-xs text-slate-500">{datos.enRango.length - datos.cerradosTotal} siguen abiertos</span>} />
        <Resumen
          titulo="Cumplimiento de SLA"
          valor={datos.cumplimientoGlobal === null ? '—' : `${datos.cumplimientoGlobal}%`}
          colorValor={ESTILOS_SEMAFORO[semaforoCumplimiento(datos.cumplimientoGlobal)].texto}
          detalle={<span className="text-xs text-slate-500">Meta {META_SLA}% · {ESTILOS_SEMAFORO[semaforoCumplimiento(datos.cumplimientoGlobal)].leyenda}</span>}
        />
        <Resumen titulo="Resolución promedio" valor={datos.resolucionGlobal === null ? '—' : formatearMinutos(datos.resolucionGlobal)} detalle={<span className="text-xs text-slate-500">de tickets cerrados</span>} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <TarjetaGrafica className="xl:col-span-2" titulo="Tickets por día" descripcion={rango === 1 ? 'Última semana (el resumen de arriba es de hoy)' : rango ? `Últimos ${rango} días` : 'Últimos 90 días'}>
          <GraficaTicketsPorDia datos={datos.porDia} />
        </TarjetaGrafica>
        <TarjetaGrafica titulo="Tickets por estatus" descripcion="Haz clic para filtrar el listado">
          <GraficaEstatus datos={datos.estatus} onSeleccionar={filtrarPorEstatus} />
        </TarjetaGrafica>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TarjetaGrafica titulo="Cumplimiento de SLA por semana" descripcion="Tickets cerrados dentro de su tiempo límite">
          <GraficaSla datos={datos.slaSemanal} />
        </TarjetaGrafica>
        <TarjetaGrafica titulo="Tiempo promedio de resolución" descripcion="Solo tickets cerrados" acciones={selectorAgrupar}>
          <GraficaResolucion
            datos={agrupar === 'categoria' ? datos.resolucionCategoria : datos.resolucionTecnico}
            esPersona={agrupar === 'tecnico'}
            onSeleccionar={(nombre) => onFiltrar('todos', nombre)}
          />
        </TarjetaGrafica>
      </div>

      <TarjetaGrafica titulo="¿Cuándo se crean más tickets?" descripcion="Día de la semana y hora de creación, dentro del horario de atención (08:00 a 22:00)" exportable={false}>
        <MapaCalorHoras matriz={datos.mapa.matriz} maximo={datos.mapa.maximo} />
      </TarjetaGrafica>
    </section>
  );
}
