import React, { useState, useEffect } from 'react';

function BuzonSugerenciasView({ user }) {
  const [registros, setRegistros] = useState([]);
  const [tipo, setTipo] = useState('SUGERENCIA');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [editandoId, setEditandoId] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [estatusTemp, setEstatusTemp] = useState('REVISADO');

  const rolUsuario = (user?.role || user?.nivel || '').toLowerCase();
  const esAdmin = rolUsuario === 'support' || rolUsuario === 'administrador' || rolUsuario === 'admin';

  const cargarBuzon = async () => {
    try {
      const res = await fetch('/api/buzon');
      const data = await res.json();
      if (Array.isArray(data)) setRegistros(data);
    } catch (error) {
      console.error('Error al cargar el buzón:', error);
    }
  };

  useEffect(() => {
    cargarBuzon();
  }, []);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!mensaje.trim() || enviando) return;
    setEnviando(true);

    try {
      const res = await fetch('/api/buzon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: user?.name || user?.nombre || 'Usuario',
          username: user?.username || '',
          campana: user?.campana || 'General',
          tipo,
          mensaje
        })
      });

      if (res.ok) {
        setMensaje('');
        setMensajeExito('¡Gracias! Tu comentario fue enviado directamente al administrador del sistema.');
        cargarBuzon();
        setTimeout(() => setMensajeExito(''), 4500);
      }
    } catch (error) {
      console.error('Error al enviar comentario:', error);
    } finally {
      setEnviando(false);
    }
  };

  const guardarRespuestaAdmin = async (id) => {
    try {
      await fetch(`/api/buzon/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estatus: estatusTemp,
          respuesta_admin: respuestaTexto
        })
      });
      setEditandoId(null);
      setRespuestaTexto('');
      cargarBuzon();
    } catch (error) {
      console.error('Error al responder:', error);
    }
  };

  const eliminarRegistro = async (id) => {
    if (!window.confirm('¿Eliminar este comentario del buzón?')) return;
    try {
      await fetch(`/api/buzon/${id}`, { method: 'DELETE' });
      setRegistros(registros.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const misRegistros = esAdmin
    ? registros.filter(r => filtroTipo === 'TODOS' || r.tipo === filtroTipo)
    : registros.filter(r => 
        (r.username && user?.username && r.username.toLowerCase() === user.username.toLowerCase()) ||
        (r.usuario && user?.name && r.usuario.toLowerCase() === user.name.toLowerCase())
      );

  const badgeTipo = (t) => {
    if (t === 'ERROR') return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (t === 'SUGERENCIA') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
  };

  const badgeEstatus = (est) => {
    if (est === 'APLICADO') return 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40';
    if (est === 'REVISADO') return 'bg-blue-600/30 text-blue-400 border-blue-500/40';
    return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6 text-slate-200">
      {/* ENCABEZADO */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase flex items-center gap-2">
            📬 Buzón de Sugerencias y Reporte de Bugs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ¿Encontraste algún error en la plataforma o tienes una idea para mejorar Clodos TI Assist? Coméntalo aquí.
          </p>
        </div>
        {esAdmin && (
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
            Modo Administrador • Viendo todos los comentarios ({registros.length})
          </span>
        )}
      </div>

      {/* FORMULARIO DE ENVÍO (Para Clientes y también disponible por si quieres anotar algo rápido) */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <form onSubmit={handleEnviar} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setTipo('SUGERENCIA')}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                tipo === 'SUGERENCIA'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              💡 Sugerencia / Nueva Idea
            </button>

            <button
              type="button"
              onClick={() => setTipo('ERROR')}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                tipo === 'ERROR'
                  ? 'bg-red-500/20 border-red-500 text-red-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              🐛 Reportar Error / Bug Visual
            </button>

            <button
              type="button"
              onClick={() => setTipo('COMENTARIO')}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                tipo === 'COMENTARIO'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md'
                  : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              💬 Comentario General
            </button>
          </div>

          <div>
            <textarea
              rows="3"
              required
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={
                tipo === 'ERROR'
                  ? 'Describe qué pantalla estabas usando y qué error o comportamiento extraño notaste...'
                  : 'Cuéntanos tu sugerencia o qué herramienta te gustaría ver en el portal...'
              }
              className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {mensajeExito && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              ✔️ {mensajeExito}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : '📨 Enviar al Buzón'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTADO DE SUGERENCIAS Y ERRORES */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700 pb-4">
          <h2 className="text-base font-bold text-white uppercase">
            {esAdmin ? '📋 Bandeja de Retroalimentación Recibida' : '📋 Mis Comentarios Enviados'}
          </h2>

          {esAdmin && (
            <div className="flex gap-2">
              {['TODOS', 'SUGERENCIA', 'ERROR', 'COMENTARIO'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    filtroTipo === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {misRegistros.length === 0 ? (
          <div className="text-center py-8 text-slate-500 italic text-sm">
            No hay comentarios ni reportes registrados todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {misRegistros.map((item) => (
              <div key={item.id} className="bg-slate-900/70 border border-slate-700/80 p-4 rounded-xl space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeTipo(item.tipo)}`}>
                      {item.tipo === 'ERROR' ? '🐛 BUG / ERROR' : item.tipo === 'SUGERENCIA' ? '💡 SUGERENCIA' : '💬 COMENTARIO'}
                    </span>
                    <span className="text-xs font-bold text-white">{item.usuario}</span>
                    <span className="text-[11px] text-slate-400">({item.campana || 'General'})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">{item.fecha_creacion}</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border uppercase ${badgeEstatus(item.estatus)}`}>
                      {item.estatus || 'PENDIENTE'}
                    </span>

                    {esAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditandoId(editandoId === item.id ? null : item.id);
                            setRespuestaTexto(item.respuesta_admin || '');
                            setEstatusTemp(item.estatus === 'PENDIENTE' ? 'REVISADO' : item.estatus);
                          }}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Responder / Estatus
                        </button>
                        <button
                          onClick={() => eliminarRegistro(item.id)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-200 whitespace-pre-line">{item.mensaje}</p>

                {item.respuesta_admin && (
                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-indigo-300">👨‍💻 Respuesta de TI / Administración:</div>
                    <div className="text-slate-200">{item.respuesta_admin}</div>
                  </div>
                )}

                {esAdmin && editandoId === item.id && (
                  <div className="pt-3 border-t border-slate-700/80 space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={estatusTemp}
                        onChange={(e) => setEstatusTemp(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none"
                      >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="REVISADO">EN REVISIÓN / REVISADO</option>
                        <option value="APLICADO">APLICADO / RESUELTO</option>
                      </select>

                      <input
                        type="text"
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                        placeholder="Escribe una respuesta o nota para el usuario..."
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                      />

                      <button
                        onClick={() => guardarRespuestaAdmin(item.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BuzonSugerenciasView;
