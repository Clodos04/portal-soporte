import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import useReducirMovimiento from '../../hooks/useReducirMovimiento';

// Meta de cumplimiento de SLA (se puede cambiar aquí). Es una referencia visual, no afecta ningún cálculo.
export const META_SLA = 90;

function Etiqueta({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const fila = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1">Semana del {label}</p>
      {fila.cumplimiento === null ? (
        <p className="text-slate-400">Sin tickets cerrados</p>
      ) : (
        <>
          <p className="text-slate-200">Cumplimiento: <strong className="text-white">{fila.cumplimiento}%</strong></p>
          <p className="text-slate-400">{fila.enSla} de {fila.cerrados} dentro de su SLA</p>
        </>
      )}
    </div>
  );
}

// Cumplimiento de SLA por semana, con la meta como línea de referencia.
export default function GraficaSla({ datos }) {
  const reducirMovimiento = useReducirMovimiento();
  const hayDatos = datos.some(d => d.cumplimiento !== null);

  if (!hayDatos) {
    return <p className="text-sm text-slate-500 py-16 text-center">Aún no hay tickets cerrados en este periodo para calcular el cumplimiento.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-700)" />
          <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} />
          <Tooltip content={<Etiqueta />} cursor={{ stroke: 'var(--color-slate-600)', strokeDasharray: '3 3' }} />
          <ReferenceLine y={META_SLA} stroke="#34d399" strokeDasharray="5 5" label={{ value: `Meta ${META_SLA}%`, position: 'insideTopRight', fill: '#34d399', fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="cumplimiento"
            stroke="#7480e0"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#7480e0', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={!reducirMovimiento}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
