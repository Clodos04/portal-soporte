import React, { useState } from 'react';

function LiveChatView({ folio, user, onFinalizarChat }) {
  const [mensajes, setMensajes] = useState([
    { 
      remitente: 'Sistema', 
      texto: `Folio #${folio || 'S/N'} registrado con éxito. Se te asignará un técnico en un tiempo máximo de 10 minutos.`, 
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  
  // Mantenemos al usuario en estado de no conectado (en cola de espera) hasta que un técnico tome el caso
  const [conectado, setConectado] = useState(false);

  const enviarMensaje = (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const mensajeCliente = {
      remitente: user?.name || 'Tú',
      texto: nuevoMensaje,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes(prev => [...prev, mensajeCliente]);
    setNuevoMensaje('');
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden flex flex-col h-[75vh]">
      
      {/* Cabecera del Chat */}
      <div className="bg-slate-800 p-5 border-b border-slate-700 flex justify-between items-center">
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
              {conectado ? '🟢 Conectado con Soporte Técnico' : '⏳ En espera de asignación (Tiempo máx. 10 mins)...'}
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={onFinalizarChat}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
        >
          Finalizar y Salir
        </button>
      </div>

      {/* Cuerpo de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60">
        {mensajes.map((m, idx) => {
          const esCliente = m.remitente !== 'Sistema' && m.remitente !== 'Soporte Técnico';
          return (
            <div key={idx} className={`flex flex-col ${esCliente ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-400">{m.remitente}</span>
                <span className="text-[10px] text-slate-500">{m.hora}</span>
              </div>
              <div className={`p-4 rounded-2xl max-w-lg text-sm shadow-md ${esCliente ? 'bg-indigo-600 text-white rounded-tr-none' : m.remitente === 'Sistema' ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30 w-full text-center' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                {m.texto}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Escritura */}
      <form onSubmit={enviarMensaje} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3">
        <input 
          type="text"
          placeholder="Escribe tu mensaje aquí..."
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
        >
          Enviar ➔
        </button>
      </form>

    </div>
  );
}

export default LiveChatView;
