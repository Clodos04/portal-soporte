import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import useReducirMovimiento from '../../hooks/useReducirMovimiento';

const COLORES = { abierto: '#34d399', proceso: '#fbbf24', cerrado: '#62666d' };

// Sector resaltado al pasar el cursor
const SectorActivo = (props) => <Sector {...props} outerRadius={props.outerRadius + 5} />;

// Dona de estatus. Clic en una rebanada (o en la lista de la derecha) lleva al listado filtrado.
export default function GraficaEstatus({ datos, onSeleccionar }) {
  const [activo, setActivo] = useState(null);
  const reducirMovimiento = useReducirMovimiento();
  const total = datos.reduce((suma, d) => suma + d.valor, 0);
  const visibles = datos.filter(d => d.valor > 0);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visibles}
              dataKey="valor"
              nameKey="nombre"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={visibles.length > 1 ? 3 : 0}
              stroke="none"
              activeIndex={activo === null ? undefined : visibles.findIndex(d => d.clave === activo)}
              activeShape={SectorActivo}
              onMouseEnter={(_, i) => setActivo(visibles[i]?.clave ?? null)}
              onMouseLeave={() => setActivo(null)}
              onClick={(d) => onSeleccionar && onSeleccionar(d.clave)}
              isAnimationActive={!reducirMovimiento}
              animationDuration={800}
              style={{ cursor: onSeleccionar ? 'pointer' : 'default', outline: 'none' }}
            >
              {visibles.map(d => <Cell key={d.clave} fill={COLORES[d.clave]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-slate-900)', borderRadius: '8px', border: '1px solid var(--color-slate-700)', color: 'var(--color-slate-50)', fontSize: 12 }}
              itemStyle={{ color: 'var(--color-slate-50)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-semibold text-white leading-none">{total}</span>
          <span className="text-xs text-slate-400 mt-1">{total === 1 ? 'ticket' : 'tickets'}</span>
        </div>
      </div>

      <ul className="w-full space-y-1.5">
        {datos.map(d => {
          const porcentaje = total ? Math.round((d.valor / total) * 100) : 0;
          return (
            <li key={d.clave}>
              <button
                onClick={() => onSeleccionar && onSeleccionar(d.clave)}
                onMouseEnter={() => setActivo(d.valor > 0 ? d.clave : null)}
                onMouseLeave={() => setActivo(null)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORES[d.clave] }} />
                <span className="text-sm text-slate-200 flex-1">{d.nombre}</span>
                <span className="text-sm font-medium text-white tabular-nums">{d.valor}</span>
                <span className="text-xs text-slate-400 w-10 text-right tabular-nums">{porcentaje}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
