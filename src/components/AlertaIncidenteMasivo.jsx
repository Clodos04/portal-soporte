import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertTriangle, X } from 'lucide-react';

// Aviso para soporte: varios tickets abiertos de la misma campaña y categoría en pocos minutos
// suelen ser una caída que afecta a varios agentes. Se consulta al servidor y se actualiza en vivo.
function AlertaIncidenteMasivo({ onVerTickets }) {
  const [incidentes, setIncidentes] = useState([]);
  const [descartados, setDescartados] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/asistente/incidentes');
      const data = await res.json();
      if (Array.isArray(data)) setIncidentes(data);
    } catch (e) { /* sin conexión: se reintenta en el siguiente ciclo */ }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    const socket = io();
    socket.on('incidenteMasivo', cargar);
    return () => { clearInterval(intervalo); socket.disconnect(); };
  }, [cargar]);

  // Si el grupo crece (llega otro ticket), la clave cambia y la alerta vuelve a mostrarse
  const clave = (i) => `${i.campana}|${i.categoria}|${i.total}`;
  const visibles = incidentes.filter(i => !descartados.includes(clave(i)));
  if (visibles.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" role="alert" aria-live="polite">
      {visibles.map(i => (
        <div key={clave(i)} className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-100">Posible incidente masivo</p>
            <p className="text-red-200/90">
              {i.total} tickets abiertos de <strong>{i.campana || 'sin campaña'}</strong> en <strong>{i.categoria}</strong> en los últimos minutos
              {i.folios && i.folios.length > 0 && <> (folios {i.folios.slice(0, 6).join(', ')}{i.folios.length > 6 ? '…' : ''})</>}. Puede ser una falla común: conviene revisarlos juntos.
            </p>
            {onVerTickets && (
              <button onClick={onVerTickets} className="mt-1.5 text-xs font-medium text-red-100 underline underline-offset-2 hover:text-white cursor-pointer">Ver solicitudes</button>
            )}
          </div>
          <button onClick={() => setDescartados(d => [...d, clave(i)])} aria-label="Descartar alerta" className="p-1 rounded-lg text-red-300 hover:text-white hover:bg-red-500/20 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertaIncidenteMasivo;
