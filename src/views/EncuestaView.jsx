import React, { useState } from 'react';

function EncuestaView({ tickets, user, ticketEspecifico, onRegresar, onGuardarEncuesta }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [p4, setP4] = useState('');
  const [p5, setP5] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Si nos pasan un ticket específico desde la tabla, lo usamos. Si no, tomamos el último del cliente.
  const ticketsCliente = user?.role === 'client' 
    ? tickets.filter(t => t.creador && user.name && t.creador.toLowerCase() === user.name.toLowerCase()) 
    : tickets;

  const ticketActivo = ticketEspecifico || (ticketsCliente.length > 0 
    ? ticketsCliente[ticketsCliente.length - 1] 
    : (tickets.length > 0 ? tickets[tickets.length - 1] : null));

  const tecnicoNombre = ticketActivo && ticketActivo.tecnico && ticketActivo.tecnico !== 'Sin Asignar' 
    ? ticketActivo.tecnico.toUpperCase() 
    : 'SOPORTE GENERAL';

  const handleGuardar = (e) => {
    e.preventDefault();
    const suma = Number(p1 || 5) + Number(p2 || 5) + Number(p3 || 5) + Number(p4 || 5);
    const promedioVal = Number((suma / 4).toFixed(1));

    onGuardarEncuesta({
      ticket_id: ticketActivo ? ticketActivo.id : null,
      folio: ticketActivo ? ticketActivo.folio : 'S/F',
      cliente_username: user?.username || 'cliente',
      tecnico: tecnicoNombre,
      categoria: ticketActivo ? ticketActivo.categoria : 'General',
      calificacion: Number(p1 || 5), 
      promedio: promedioVal,
      comentarios: comentarios, // <--- Enviado independiente para la columna MySQL
      respuestas: { p1, p2, p3, p4, p5 }
    });

    setEnviado(true);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 p-8 my-6">
      <div className="text-center mb-8 border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-light text-white uppercase tracking-wider">Encuesta TI</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
          Evalúa la atención brindada por <span className="text-indigo-300 font-bold">{tecnicoNombre}</span> 
          {ticketActivo && <span className="text-slate-500 block text-xs mt-1">Ticket Folio: {ticketActivo.folio}</span>}
        </p>
      </div>

      {enviado ? (
        <div className="bg-green-600/20 border border-green-500/50 text-green-300 p-6 rounded-lg text-center space-y-3">
          <h2 className="text-xl font-bold">¡Encuesta enviada con éxito!</h2>
          <p className="text-sm">La calificación ha sido registrada directamente en el indicador de {tecnicoNombre}.</p>
          <button onClick={onRegresar} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-colors">
            Regresar al Inicio
          </button>
        </div>
      ) : (
        <form onSubmit={handleGuardar} className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-700/60">
            <label className="text-sm text-slate-200 flex-grow font-medium">
              1.- ¿Qué tan satisfecho están con la resolución de su requerimiento por parte de <span className="text-indigo-300 font-bold">{tecnicoNombre}</span>?
            </label>
            <select value={p1} onChange={(e) => setP1(e.target.value)} required className="w-full md:w-64 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="">Selecciona opcion</option>
              <option value="1">1 - Nada satisfecho</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Muy satisfecho</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-700/60">
            <label className="text-sm text-slate-200 flex-grow font-medium">
              2.- ¿Cómo califica la amabilidad de <span className="text-indigo-300 font-bold">{tecnicoNombre}</span>?
            </label>
            <select value={p2} onChange={(e) => setP2(e.target.value)} required className="w-full md:w-64 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="">Selecciona opcion</option>
              <option value="1">1 - Nada satisfecho</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Muy satisfecho</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-700/60">
            <label className="text-sm text-slate-200 flex-grow font-medium">
              3.- ¿Cómo califica el conocimiento de <span className="text-indigo-300 font-bold">{tecnicoNombre}</span>?
            </label>
            <select value={p3} onChange={(e) => setP3(e.target.value)} required className="w-full md:w-64 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="">Selecciona opcion</option>
              <option value="1">1 - Nada satisfecho</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Muy satisfecho</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-700/60">
            <label className="text-sm text-slate-200 flex-grow font-medium">
              4.- ¿Qué tan fácil fue el proceso de resolución de su requerimiento?
            </label>
            <select value={p4} onChange={(e) => setP4(e.target.value)} required className="w-full md:w-64 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="">Selecciona opcion</option>
              <option value="1">1 - Muy fácil</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Muy difícil</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-700/60">
            <label className="text-sm text-slate-200 flex-grow font-medium">
              5.- ¿Considera que se resolvió su requerimiento / trámite?
            </label>
            <select value={p5} onChange={(e) => setP5(e.target.value)} required className="w-full md:w-64 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="">Selecciona opcion</option>
              <option value="Si">Sí</option><option value="No">No</option><option value="Parcialmente">Parcialmente</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-sm font-bold text-slate-300">¿Qué podríamos hacer mejor la próxima vez?</label>
            <textarea rows="3" value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Escribe tus sugerencias..." className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none resize-none text-sm"></textarea>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-700">
            <button type="button" onClick={onRegresar} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg shadow transition-colors text-sm">Regresar</button>
            <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-2.5 rounded-lg shadow-lg transition-colors text-sm">Guardar</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EncuestaView;
