import React, { useState, useEffect, useRef } from 'react';

function LiveChatView({ folio, user, onFinalizarChat, onAbrirModalEdicion, ticket, onTomarTicket }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [conectado, setConectado] = useState(false);
  const [nombreTecnico, setNombreTecnico] = useState('');
  const [enviandoOpcion, setEnviandoOpcion] = useState(false);
  
  const cantidadMensajesPrevios = useRef(0);
  const chatEndRef = useRef(null);

  const extraerTextoYOpciones = (textoCrudo = '') => {
    const regex = /\[\[OPCIONES:(.*?)\]\]/s;
    const match = String(textoCrudo).match(regex);
    if (!match) {
      return { textoLimpio: textoCrudo, opciones: [] };
    }
    const textoLimpio = String(textoCrudo).replace(regex, '').trim();
    const opciones = match[1].split('|').map(op => op.trim()).filter(Boolean);
    return { textoLimpio, opciones };
  };

  const reproducirAlertaChat = (remitente, textoMensaje) => {
    const { textoLimpio } = extraerTextoYOpciones(textoMensaje);
    const audio = new Audio('/Sonidos/minecraft_exp.mp3');
    audio.play().catch(err => console.log("Audio bloqueado por el navegador:", err));

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Nuevo mensaje de ${remitente}`, { body: textoLimpio, icon: "/favicon.ico" });
    }
  };

  useEffect(() => {
    if (!folio) return;

    const sincronizarChatYTicket = async () => {
      try {
        const resTicket = await fetch('/api/tickets');
        const tickets = await resTicket.json();
        const ticketActual = (tickets || []).find(t => String(t.folio) === String(folio));

        if (ticketActual && ticketActual.tecnico && ticketActual.tecnico !== 'Sin Asignar') {
          setConectado(true);
          setNombreTecnico(ticketActual.tecnico);
        }

        const response = await fetch(`/api/chat/${folio}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          if (cantidadMensajesPrevios.current > 0 && data.length > cantidadMensajesPrevios.current) {
            const ultimoMensaje = data[data.length - 1];
            if (ultimoMensaje.remitente !== user?.name) {
              reproducirAlertaChat(ultimoMensaje.remitente, ultimoMensaje.texto);
            }
          }
          cantidadMensajesPrevios.current = data.length;
          setMensajes(data);
        }
      } catch (error) {
        console.error('Error al sincronizar sala de chat:', error);
      }
    };

    sincronizarChatYTicket();
    const intervalo = setInterval(sincronizarChatYTicket, 2500);
    return () => clearInterval(intervalo);
  }, [folio, user, ticket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  const enviarTextoAlChat = async (textoAEnviar) => {
    if (!textoAEnviar || !textoAEnviar.trim() || enviandoOpcion) return;
    setEnviandoOpcion(true);

    const mensajeData = {
      folio: folio,
      remitente: user?.name || 'Usuario',
      texto: textoAEnviar.trim(),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mensajeData)
      });

      if (response.ok) {
        setNuevoMensaje('');
        const res = await fetch(`/api/chat/${folio}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          cantidadMensajesPrevios.current = data.length;
          setMensajes(data);
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setEnviandoOpcion(false);
    }
  };

  const enviarMensaje = (e) => {
    e.preventDefault();
    enviarTextoAlChat(nuevoMensaje);
  };

  const ultimoMsg = mensajes.length > 0 ? mensajes[mensajes.length - 1] : null;
  const opcionesActivas = (ultimoMsg && ultimoMsg.remitente === 'Sistema')
    ? extraerTextoYOpciones(ultimoMsg.texto).opciones
    : [];

  const esSoporte = user?.role === 'support';
  const sinAsignar = !ticket?.tecnico || ticket?.tecnico === 'Sin Asignar';

  return (
    <div className="animate-fade-in max-w-4xl mx-auto bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden flex flex-col h-[78vh]">
      
      {/* Cabecera del Chat */}
      <div className="bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
              🎧
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${conectado ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sala de Atención en Vivo - Folio #{folio || 'S/N'}</h2>
            <p className="text-xs text-slate-400">
              {conectado ? `🟢 Conectado con Soporte Técnico (${nombreTecnico})` : '🤖 Diagnóstico interactivo en curso / En espera de técnico...'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {esSoporte && sinAsignar && ticket && (
            <button 
              type="button"
              onClick={() => onTomarTicket(ticket.folio)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              <span>🙋‍♂️</span> Tomar Ticket
            </button>
          )}

          {esSoporte && ticket && (
            <button 
              type="button"
              onClick={() => onAbrirModalEdicion(ticket)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-bold border border-red-500/30 transition-all cursor-pointer"
            >
              Cerrar Ticket
            </button>
          )}

          <button 
            type="button"
            onClick={onFinalizarChat}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
          >
            Finalizar y Salir
          </button>
        </div>
      </div>

      {/* Cuerpo de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60">
        {mensajes.map((m, idx) => {
          const esCliente = m.remitente === user?.name;
          const esSistema = m.remitente === 'Sistema';
          const { textoLimpio } = extraerTextoYOpciones(m.texto);

          return (
            <div key={idx} className={`flex flex-col ${esCliente ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-400">
                  {esSistema ? '🤖 Asistente TI (Sistema)' : m.remitente}
                </span>
                <span className="text-[10px] text-slate-500">{m.hora}</span>
              </div>
              <div className={`p-4 rounded-2xl max-w-2xl text-sm shadow-md whitespace-pre-line leading-relaxed ${
                esCliente 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : esSistema 
                    ? 'bg-slate-800/95 text-indigo-200 border border-indigo-500/40 rounded-tl-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
              }`}>
                {textoLimpio}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {opcionesActivas.length > 0 && (
        <div className="p-4 bg-slate-900/95 border-t border-indigo-500/30 space-y-2 shrink-0 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              👆 Selecciona una opción para continuar:
            </span>
            <button
              type="button"
              disabled={enviandoOpcion}
              onClick={() => enviarTextoAlChat('🎉 ¡Ya quedó solucionado, muchas gracias!')}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              🎉 ¿Ya se solucionó el problema? Clic aquí
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {opcionesActivas.map((opcion, index) => (
              <button
                key={index}
                type="button"
                disabled={enviandoOpcion}
                onClick={() => enviarTextoAlChat(opcion)}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-slate-200 hover:text-white border border-slate-700 hover:border-indigo-500 text-left text-xs font-semibold transition-all flex items-center justify-between group cursor-pointer shadow-sm disabled:opacity-50"
              >
                <span>{opcion}</span>
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform font-bold ml-2 shrink-0">
                  Elegir ➔
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Escritura */}
      <form onSubmit={enviarMensaje} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3 shrink-0">
        <input 
          type="text"
          placeholder="O escribe algún comentario adicional aquí..."
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
        />
        <button 
          type="submit"
          disabled={enviandoOpcion}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          Enviar ➔
        </button>
      </form>

    </div>
  );
}

export default LiveChatView;
