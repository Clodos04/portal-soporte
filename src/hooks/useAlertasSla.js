import { useEffect, useRef } from 'react';
import { calcularSLA, esTicketCerrado } from '../utils/sla';

// Alertas de SLA: avisa al equipo de soporte cuando un ticket abierto llega a 80% de su tiempo o se vence.
// Se avisa una sola vez por ticket y nivel; revisa cada minuto con los datos más recientes.
export default function useAlertasSla({ isLoggedIn, user, tickets, categorias, reproducirAlerta }) {
  const datosRef = useRef({ tickets: [], categorias: [] });
  const enviadas = useRef({});
  useEffect(() => { datosRef.current = { tickets, categorias }; }, [tickets, categorias]);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'support') return;
    const revisar = () => {
      const { tickets: lista, categorias: cats } = datosRef.current;
      lista.forEach(t => {
        if (esTicketCerrado(t)) { delete enviadas.current[t.folio]; return; }
        const sla = calcularSLA(t, cats);
        const nivelAlerta = sla.nivel === 'vencido' ? 'vencido' : (sla.critico ? 'critico' : null);
        if (!nivelAlerta || enviadas.current[t.folio] === nivelAlerta) return;
        // Al primer chequeo tras iniciar sesión solo se registra el estado, para no avisar de todo el histórico a la vez
        const primeraVez = enviadas.current[t.folio] === undefined && enviadas.current.__listo !== true;
        enviadas.current[t.folio] = nivelAlerta;
        if (primeraVez) return;
        reproducirAlerta(nivelAlerta === 'vencido'
          ? `SLA VENCIDO: ticket #${t.folio}`
          : `SLA por vencer (80%): ticket #${t.folio}`);
      });
      if (lista.length > 0) enviadas.current.__listo = true;
    };
    const arranque = setTimeout(revisar, 5000);
    const intervalo = setInterval(revisar, 60000);
    return () => { clearTimeout(arranque); clearInterval(intervalo); enviadas.current = {}; };
  }, [isLoggedIn, user?.role, reproducirAlerta]);
}
