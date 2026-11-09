import React, { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import useReducirMovimiento from '../../hooks/useReducirMovimiento';

// Mini gráfica de tendencia para las tarjetas de números (sin ejes ni textos).
export default function Sparkline({ datos, clave, color = 'var(--color-indigo-500, #7480e0)', alto = 36 }) {
  const reducirMovimiento = useReducirMovimiento();
  const id = `spark-${useId().replace(/:/g, '')}`;
  const hayMovimiento = datos.some(d => d[clave] !== null && d[clave] !== undefined && d[clave] !== 0);

  return (
    <div style={{ height: alto }} className={`w-full ${hayMovimiento ? '' : 'opacity-40'}`} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={clave} stroke={color} strokeWidth={1.75} fill={`url(#${id})`} dot={false} connectNulls isAnimationActive={!reducirMovimiento} animationDuration={700} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
