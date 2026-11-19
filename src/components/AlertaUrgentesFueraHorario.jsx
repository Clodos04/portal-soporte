import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Siren } from 'lucide-react';

// Casos urgentes que llegaron fuera del horario de atención: no se cierran solos y se quedan aquí
// hasta que un técnico los toma o se cierran. Se actualiza en vivo y cada minuto.
function AlertaUrgentesFueraHorario({ onVerTickets }) {
  const [urgentes, setUrgentes] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/asistente/urgentes');
      const data = await res.json();
      if (Array.isArray(data)) setUrgentes(data);
    } catch (e) { /* sin conexión: se reintenta en el siguiente ciclo */ }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    const socket = io();
    socket.on('urgenteFueraHorario', cargar);
    socket.on('ticketActualizado', cargar);
    return () => { clearInterval(intervalo); socket.disconnect(); };
  }, [cargar]);

  if (urgentes.length === 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="alert" aria-live="polite">
      <Siren size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {urgentes.length === 1 ? '1 caso urgente llegó fuera de horario y sigue sin técnico' : `${urgentes.length} casos urgentes llegaron fuera de horario y siguen sin técnico`}
        </p>
        <ul className="mt-1 space-y-0.5 text-amber-100/90">
          {urgentes.slice(0, 5).map(u => (
            <li key={u.folio}>
              <span className="tabular-nums">#{u.folio}</span> · {u.creador || 'Sin nombre'} · {[u.campana, u.categoria, u.subcategoria].filter(Boolean).join(' · ')}
              <span className="text-amber-200/70"> ({u.motivo === 'falla masiva' ? 'falla masiva' : 'categoría urgente'})</span>
            </li>
          ))}
          {urgentes.length > 5 && <li>y {urgentes.length - 5} más…</li>}
        </ul>
        {onVerTickets && (
          <button onClick={onVerTickets} className="mt-1.5 text-xs font-medium underline underline-offset-2 hover:text-white cursor-pointer">Ver solicitudes</button>
        )}
      </div>
    </div>
  );
}

export default AlertaUrgentesFueraHorario;
