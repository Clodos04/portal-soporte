import React, { useState } from 'react';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const hora = (h) => `${String(h).padStart(2, '0')}:00`;

// Horario de atención: de 08:00 a 22:00 (última columna: 21:00 a 21:59)
const HORA_INICIO = 8;
const HORA_FIN = 21;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

// Cuándo se crean más tickets: días de la semana (filas) por hora del día (columnas).
export default function MapaCalorHoras({ matriz, maximo }) {
  const [seleccion, setSeleccion] = useState(null);

  // Tickets creados fuera del horario de atención: no se grafican, pero se informan
  const fueraDeHorario = matriz.reduce((total, fila) => total + fila.reduce((suma, cantidad, h) => suma + (h < HORA_INICIO || h > HORA_FIN ? cantidad : 0), 0), 0);

  if (maximo === 0) {
    return <p className="text-sm text-slate-500 py-12 text-center">Aún no hay suficientes tickets con hora registrada para este mapa.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          <div className="flex pl-10 mb-1">
            {HORAS.map((h) => (
              <div key={h} className="flex-1 text-[11px] text-slate-500 text-center tabular-nums">{h}</div>
            ))}
          </div>
          {matriz.map((fila, d) => (
            <div key={DIAS[d]} className="flex items-center mb-1">
              <div className="w-10 text-xs text-slate-400 shrink-0">{DIAS[d]}</div>
              {HORAS.map((h) => {
                const cantidad = fila[h];
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
        {!seleccion && fueraDeHorario > 0 && ` ${fueraDeHorario} ${fueraDeHorario === 1 ? 'ticket se creó' : 'tickets se crearon'} fuera del horario de atención y no aparecen aquí.`}
      </p>
    </div>
  );
}
