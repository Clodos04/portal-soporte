import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Gráfica de tickets por grupo. Se carga bajo demanda (React.lazy) para no inflar el arranque del portal.
export default function GraficaGrupos({ datosGrupos }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datosGrupos} margin={{ top: 15, right: 20, left: -10, bottom: 55 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
        <XAxis dataKey="nombre" axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
        <Bar dataKey="tickets" fill="#5e6ad2" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
