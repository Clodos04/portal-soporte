import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Gráfica de tickets por grupo. Se carga bajo demanda (React.lazy) para no inflar el arranque del portal.
export default function GraficaGrupos({ datosGrupos }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datosGrupos} margin={{ top: 15, right: 20, left: -10, bottom: 55 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-700)" />
        <XAxis dataKey="nombre" axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" tick={{ fill: "var(--color-slate-400)", fontSize: 10 }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--color-slate-400)", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "var(--color-slate-800)" }} contentStyle={{ backgroundColor: "var(--color-slate-900)", borderRadius: "8px", border: "1px solid var(--color-slate-700)", color: "var(--color-slate-50)" }} />
        <Bar dataKey="tickets" fill="var(--color-indigo-600)" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
