import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useReducirMovimiento from '../../hooks/useReducirMovimiento';

const COLOR_CREADOS = 'var(--color-indigo-500, #7480e0)';
const COLOR_CERRADOS = 'var(--color-emerald-400, #34d399)';

const formatoCorto = (fecha) => {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
};
const formatoLargo = (fecha) => new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

function Etiqueta({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-300 font-medium mb-1 capitalize">{formatoLargo(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-200">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          {p.name}: <strong className="text-white">{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// Tickets creados y cerrados por día. La leyenda es interactiva: clic para mostrar u ocultar una serie.
export default function GraficaTicketsPorDia({ datos }) {
  const [ocultas, setOcultas] = useState({ creados: false, cerrados: false });
  const reducirMovimiento = useReducirMovimiento();
  const alternar = (clave) => setOcultas(prev => ({ ...prev, [clave]: !prev[clave] }));
  const separacion = datos.length > 45 ? 6 : datos.length > 20 ? 3 : datos.length > 10 ? 1 : 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3" role="group" aria-label="Series visibles">
        {[{ clave: 'creados', nombre: 'Creados', color: COLOR_CREADOS }, { clave: 'cerrados', nombre: 'Cerrados', color: COLOR_CERRADOS }].map(s => (
          <button
            key={s.clave}
            onClick={() => alternar(s.clave)}
            aria-pressed={!ocultas[s.clave]}
            className={`flex items-center gap-2 text-xs transition-opacity cursor-pointer ${ocultas[s.clave] ? 'opacity-40' : 'opacity-100'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-300">{s.nombre}</span>
          </button>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="relleno-creados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_CREADOS} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLOR_CREADOS} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="relleno-cerrados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_CERRADOS} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLOR_CERRADOS} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-700)" />
            <XAxis dataKey="fecha" tickFormatter={formatoCorto} interval={separacion} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} />
            <Tooltip content={<Etiqueta />} cursor={{ stroke: 'var(--color-slate-600)', strokeDasharray: '3 3' }} />
            {!ocultas.creados && (
              <Area type="monotone" dataKey="creados" name="Creados" stroke={COLOR_CREADOS} strokeWidth={2} fill="url(#relleno-creados)" isAnimationActive={!reducirMovimiento} animationDuration={800} />
            )}
            {!ocultas.cerrados && (
              <Area type="monotone" dataKey="cerrados" name="Cerrados" stroke={COLOR_CERRADOS} strokeWidth={2} fill="url(#relleno-cerrados)" isAnimationActive={!reducirMovimiento} animationDuration={800} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
