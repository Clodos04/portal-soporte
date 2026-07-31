import React, { useState, useEffect } from 'react';

const listaCampanas = [
  "TI",
  "OPERACIONES",
  "VENTAS",
  "ADMINISTRACION"
];

function NuevaSolicitudView({ usuarioLogueado, onTicketCreado }) {
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [elemento, setElemento] = useState('');
  const [campana, setCampana] = useState(usuarioLogueado?.campana || listaCampanas[0]);
  const [grupo, setGrupo] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [gruposDisponibles, setGruposDisponibles] = useState([]);

  useEffect(() => {
    fetch('/api/grupos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setGruposDisponibles(data);
          setGrupo(data[0]);
        }
      })
      .catch(err => console.error('Error al cargar grupos:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const folio = 'TICK-' + Math.floor(100000 + Math.random() * 900000);
    
    const nuevoTicket = {
      folio,
      asunto,
      descripcion,
      categoria: categoria || 'General',
      subcategoria: subcategoria || 'General',
      elemento: elemento || 'General',
      campana,
      grupo: grupo || (gruposDisponibles[0] || 'SOPORTE TECNICO'),
      creador: usuarioLogueado?.username || 'cliente',
      prioridad
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoTicket)
      });
      if (res.ok) {
        alert('¡Ticket creado con éxito!');
        setAsunto('');
        setDescripcion('');
        setCategoria('');
        setSubcategoria('');
        setElemento('');
        if (onTicketCreado) onTicketCreado();
      } else {
        alert('Error al crear el ticket.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 text-slate-200 overflow-hidden p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white uppercase mb-6 border-b border-slate-700 pb-4">Crear Nueva Solicitud</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Campaña:</label>
            <select value={campana} onChange={(e) => setCampana(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              {listaCampanas.map((c, idx) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Grupo de Soporte Asignado:</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              {gruposDisponibles.map((g, idx) => (
                <option key={idx} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Asunto:</label>
          <input type="text" required value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Breve descripción del problema..." className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Categoría:</label>
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej. Hardware" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Subcategoría:</label>
            <input type="text" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} placeholder="Ej. Falla de energía" className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Prioridad:</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none">
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">Descripción Detallada:</label>
          <textarea required rows="4" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Explique detalladamente su solicitud..." className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm outline-none"></textarea>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg transition-colors text-sm">
            Enviar Solicitud
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevaSolicitudView;
