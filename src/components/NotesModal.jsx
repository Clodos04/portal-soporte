import React, { useState } from 'react';

function NotesModal({ folio, ticket, onClose, onSaveNote }) {
  const [nuevaNotaTexto, setNuevaNotaTexto] = useState('');

  if (!ticket) return null;

  const handleAgregar = () => {
    if (!nuevaNotaTexto.trim()) return;
    onSaveNote(folio, nuevaNotaTexto);
    setNuevaNotaTexto('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
      <div className="max-w-3xl w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 flex flex-col h-[80vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Historial de Notas - Folio #{ticket.folio}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        
        <div className="p-6 flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow bg-slate-900/50 rounded-lg border border-slate-700 p-4 mb-4 overflow-y-auto space-y-4">
            {ticket.notas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">Sin notas registradas.</div>
            ) : (
              ticket.notas.map((nota, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg border border-slate-600 shadow-sm">
                  <div className="flex justify-between text-xs text-slate-400 mb-2 border-b border-slate-600 pb-2">
                    <span className="font-bold text-indigo-300">{nota.autor}</span>
                    <span>{nota.fecha}</span>
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{nota.texto}</p>
                </div>
              ))
            )}
          </div>
          <div>
            <textarea 
              value={nuevaNotaTexto} 
              onChange={(e) => setNuevaNotaTexto(e.target.value)} 
              className="w-full h-24 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 outline-none resize-none" 
              placeholder="Escribe tu nota aquí..." 
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/30 rounded-b-xl">
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-lg font-bold border border-slate-600">Cerrar</button>
          <button onClick={handleAgregar} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold">Guardar Nota</button>
        </div>
      </div>
    </div>
  );
}

export default NotesModal;