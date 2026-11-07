import React, { useState } from 'react';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const hora = (h) => `${String(h).padStart(2, '0')}:00`;

// Cuándo se crean más tickets: días de la semana (filas) por hora del día (columnas).
export default function MapaCalorHoras({ matriz, maximo }) {
  const [seleccion, setSeleccion] = useState(null);

  if (maximo === 0) {
    return <p className="text-sm text-slate-500 py-12 text-center">Aún no hay suficientes tickets con hora registrada para este mapa.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          <div className="flex pl-10 mb-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-[10px] text-slate-500 text-center tabular-nums">{h % 3 === 0 ? h : ''}</div>
            ))}
          </div>
          {matriz.map((fila, d) => (
            <div key={DIAS[d]} className="flex items-center mb-1">
              <div className="w-10 text-xs text-slate-400 shrink-0">{DIAS[d]}</div>
              {fila.map((cantidad, h) => {
                const intensidad = cantidad === 0 ? 0 : 0.2 + 0.8 * (cantidad / maximo);
                const activa = seleccion && seleccion.d === d && seleccion.h === h;
                return (
                  <button
                    key={h}
                    onMouseEnter={() => setSeleccion({ d, h, cantidad })}
                    onFocus={() => setSeleccion({ d, h, cantidad })}
                    onMouseLeave={() => setSeleccion(null)}
                    onBlur={() => setSeleccion(null)}
                    aria-label={`${DIAS[d]} a las ${hora(h)}: ${cantidad} ${cantidad === 1 ? 'ticket' : 'tickets'}`}
                    className={`flex-1 h-6 mx-px rounded-sm transition-transform ${activa ? 'scale-125 z-10 ring-1 ring-white/60' : ''}`}
                    style={{ backgroundColor: cantidad === 0 ? 'var(--color-slate-700)' : `rgba(94, 106, 210, ${intensidad})`, opacity: cantidad === 0 ? 0.35 : 1 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3 h-4" aria-live="polite">
        {seleccion
          ? `${DIAS[seleccion.d]} ${hora(seleccion.h)}: ${seleccion.cantidad} ${seleccion.cantidad === 1 ? 'ticket creado' : 'tickets creados'}`
          : 'Pasa el cursor por una celda para ver el detalle.'}
      </p>
    </div>
  );
}
