import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useReducirMovimiento from '../../hooks/useReducirMovimiento';
import { formatearMinutos } from '../../utils/metricas';
import { nombrePresentable } from '../../utils/texto';

function Etiqueta({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const fila = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-white font-medium">{fila.etiqueta || fila.nombre}</p>
      <p className="text-slate-300">Promedio: <strong className="text-white">{formatearMinutos(fila.minutos)}</strong></p>
      <p className="text-slate-400">{fila.tickets} {fila.tickets === 1 ? 'ticket cerrado' : 'tickets cerrados'}</p>
    </div>
  );
}

// Barras horizontales con el tiempo promedio de resolución. Clic en una barra abre el listado de esa categoría o técnico.
export default function GraficaResolucion({ datos, onSeleccionar, esPersona = false }) {
  const reducirMovimiento = useReducirMovimiento();

  if (datos.length === 0) {
    return <p className="text-sm text-slate-500 py-16 text-center">Aún no hay tickets cerrados en este periodo.</p>;
  }

  // Para técnicos los nombres llegan en mayúsculas; solo cambia cómo se ven (el clic usa el nombre original)
  const datosVisibles = datos.map(d => ({ ...d, etiqueta: esPersona ? nombrePresentable(d.nombre) : d.nombre }));
  const altura = Math.max(180, datos.length * 40 + 24);
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datosVisibles} layout="vertical" margin={{ top: 4, right: 96, left: 0, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="etiqueta" width={140} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-300)', fontSize: 12 }} />
          <Tooltip content={<Etiqueta />} cursor={{ fill: 'var(--color-slate-700)', opacity: 0.35 }} />
          <Bar
            dataKey="minutos"
            radius={[0, 6, 6, 0]}
            barSize={18}
            onClick={(d) => onSeleccionar && onSeleccionar(d.nombre)}
            isAnimationActive={!reducirMovimiento}
            animationDuration={800}
            label={{ position: 'right', fill: 'var(--color-slate-300)', fontSize: 11, formatter: (v) => formatearMinutos(v) }}
            style={{ cursor: onSeleccionar ? 'pointer' : 'default' }}
          >
            {datos.map((d, i) => <Cell key={d.nombre} fill={i === 0 ? '#fbbf24' : '#7480e0'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
