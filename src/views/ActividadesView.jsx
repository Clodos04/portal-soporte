import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { ClipboardCheck, Plus, Trash2, Pencil, X, CalendarDays, UserRound, Check } from 'lucide-react';
import { EstadoVacio } from '../components/Estados';
import { useAvisos } from '../components/Avisos';

// Actividades: listas de tareas (checklist) que un técnico le asigna a otro (o a sí mismo).
// Solo la ve soporte. El asignado marca los pasos; quien la creó la edita o la elimina.

const hoyISO = () => new Date().toLocaleDateString('en-CA');
const soloFecha = (v) => (v ? String(v).slice(0, 10) : '');
const formatoFecha = (v) => {
  const f = soloFecha(v);
  if (!f) return '';
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
};

const FORM_VACIO = { id: null, titulo: '', descripcion: '', asignado_a: '', fecha_limite: '', items: [{ id: null, texto: '' }] };

function ActividadesView({ user, usuarios = [] }) {
  const { avisar, confirmar } = useAvisos();
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('mias');
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const tecnicos = useMemo(
    () => usuarios.filter(u => (u.nivel || '').toUpperCase().includes('ADMIN') && (u.estatus || 'ACTIVO') === 'ACTIVO').map(u => u.name || u.username).filter(Boolean),
    [usuarios]
  );
  const yo = user?.name || '';

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/actividades');
      const data = await res.json();
      if (Array.isArray(data)) setActividades(data);
    } catch (e) {
      console.error('Error al cargar actividades:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Se actualiza sola cuando alguien asigna, marca o edita una actividad
    const socket = io();
    socket.on('actividadesCambio', (d) => {
      cargar();
      if (d && d.accion === 'asignada' && d.asignado_a === yo) avisar(`Te asignaron una actividad: ${d.titulo}`, 'info');
    });
    return () => socket.disconnect();
  }, [cargar, yo, avisar]);

  const visibles = useMemo(() => {
    if (filtro === 'mias') return actividades.filter(a => a.asignado_a === yo && !a.fecha_completada);
    if (filtro === 'creadas') return actividades.filter(a => a.creado_por === yo && !a.fecha_completada);
    if (filtro === 'completadas') return actividades.filter(a => a.fecha_completada);
    return actividades.filter(a => !a.fecha_completada);
  }, [actividades, filtro, yo]);

  const conteos = useMemo(() => ({
    mias: actividades.filter(a => a.asignado_a === yo && !a.fecha_completada).length,
    creadas: actividades.filter(a => a.creado_por === yo && !a.fecha_completada).length,
    todas: actividades.filter(a => !a.fecha_completada).length,
    completadas: actividades.filter(a => a.fecha_completada).length
  }), [actividades, yo]);

  const marcarPaso = async (act, paso) => {
    const nuevo = !paso.hecho;
    // Se refleja de inmediato y se revierte si el servidor lo rechaza
    setActividades(prev => prev.map(a => (a.id === act.id ? { ...a, items: a.items.map(i => (i.id === paso.id ? { ...i, hecho: nuevo } : i)) } : a)));
    try {
      const res = await fetch(`/api/actividades/${act.id}/items/${encodeURIComponent(paso.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hecho: nuevo })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { avisar(data.error || 'No se pudo marcar el paso.', 'error'); }
      else if (data.completa) avisar('¡Actividad completada!', 'exito');
    } catch (e) {
      avisar('No se pudo conectar con el servidor.', 'error');
    }
    cargar();
  };

  const abrirNueva = () => setForm({ ...FORM_VACIO, asignado_a: yo, items: [{ id: null, texto: '' }] });
  const abrirEditar = (a) => setForm({
    id: a.id, titulo: a.titulo, descripcion: a.descripcion || '', asignado_a: a.asignado_a,
    fecha_limite: soloFecha(a.fecha_limite), items: a.items.map(i => ({ id: i.id, texto: i.texto }))
  });

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    const items = form.items.filter(i => i.texto.trim()).map(i => ({ id: i.id || undefined, texto: i.texto.trim() }));
    if (!form.titulo.trim()) return avisar('Escribe un título para la actividad.', 'error');
    if (!form.asignado_a) return avisar('Elige a quién se le asigna.', 'error');
    if (items.length === 0) return avisar('Agrega al menos un paso a la lista.', 'error');
    setGuardando(true);
    try {
      const res = await fetch(form.id ? `/api/actividades/${form.id}` : '/api/actividades', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: form.titulo, descripcion: form.descripcion, asignado_a: form.asignado_a, fecha_limite: form.fecha_limite || null, items })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return avisar(data.error || 'No se pudo guardar.', 'error');
      avisar(form.id ? 'Actividad actualizada.' : 'Actividad asignada.', 'exito');
      setForm(null);
      cargar();
    } catch (err) {
      avisar('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (a) => {
    if (!await confirmar(`¿Eliminar la actividad «${a.titulo}»?`)) return;
    const res = await fetch(`/api/actividades/${a.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return avisar(data.error || 'No se pudo eliminar.', 'error');
    cargar();
  };

  const campo = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500';

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5 text-slate-200">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Actividades</h1>
          <p className="text-slate-400 text-sm mt-1">Listas de pendientes para el equipo de soporte: asigna una actividad a un técnico y marca cada paso al terminarlo.</p>
        </div>
        <button onClick={abrirNueva} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors cursor-pointer">
          <Plus size={16} strokeWidth={2} /> Nueva actividad
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar actividades">
        {[['mias', 'Asignadas a mí'], ['creadas', 'Las que asigné'], ['todas', 'Todas abiertas'], ['completadas', 'Completadas']].map(([id, texto]) => (
          <button
            key={id} role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${filtro === id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {texto} <span className="ml-1 text-xs text-slate-400 tabular-nums">{conteos[id]}</span>
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400 px-1">Cargando actividades…</p>
      ) : visibles.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700">
          <EstadoVacio
            icono={ClipboardCheck}
            titulo={filtro === 'completadas' ? 'Aún no hay actividades completadas' : 'No hay actividades en esta vista'}
            descripcion="Crea una actividad, elige al técnico y agrega los pasos que debe cumplir."
            accion="Nueva actividad" onAccion={abrirNueva}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map(a => {
            const hechos = a.items.filter(i => i.hecho).length;
            const pct = a.items.length ? Math.round((hechos / a.items.length) * 100) : 0;
            const vencida = !a.fecha_completada && a.fecha_limite && soloFecha(a.fecha_limite) < hoyISO();
            const puedeMarcar = a.asignado_a === yo || a.creado_por === yo;
            const esCreador = a.creado_por === yo;
            return (
              <article key={a.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex flex-col gap-3">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white break-words">{a.titulo}</h2>
                    {a.descripcion && <p className="text-sm text-slate-400 mt-1 break-words">{a.descripcion}</p>}
                  </div>
                  {esCreador && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => abrirEditar(a)} aria-label="Editar actividad" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 cursor-pointer"><Pencil size={15} /></button>
                      <button onClick={() => eliminar(a)} aria-label="Eliminar actividad" className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 cursor-pointer"><Trash2 size={15} /></button>
                    </div>
                  )}
                </header>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><UserRound size={13} /> {a.asignado_a === yo ? 'Para ti' : a.asignado_a}</span>
                  {a.creado_por !== a.asignado_a && <span>Asignada por {a.creado_por === yo ? 'ti' : a.creado_por}</span>}
                  {a.fecha_limite && (
                    <span className={`inline-flex items-center gap-1.5 ${vencida ? 'text-red-400 font-medium' : ''}`}>
                      <CalendarDays size={13} /> {vencida ? 'Venció el ' : 'Límite: '}{formatoFecha(a.fecha_limite)}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{hechos} de {a.items.length} pasos</span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <ul className="space-y-1">
                  {a.items.map(p => (
                    <li key={p.id}>
                      <label className={`flex items-start gap-3 px-2 py-1.5 rounded-lg ${puedeMarcar ? 'hover:bg-slate-700/50 cursor-pointer' : 'cursor-default'}`}>
                        <input
                          type="checkbox" checked={!!p.hecho} disabled={!puedeMarcar} onChange={() => marcarPaso(a, p)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                        />
                        <span className={`text-sm break-words ${p.hecho ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{p.texto}</span>
                      </label>
                    </li>
                  ))}
                </ul>

                {a.fecha_completada && (
                  <p className="text-xs text-emerald-400 inline-flex items-center gap-1.5"><Check size={13} /> Completada el {formatoFecha(a.fecha_completada)}</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-label={form.id ? 'Editar actividad' : 'Nueva actividad'}>
          <form onSubmit={guardar} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{form.id ? 'Editar actividad' : 'Nueva actividad'}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 cursor-pointer"><X size={18} /></button>
            </div>

            <label className="block text-sm text-slate-300">Título
              <input className={`${campo} mt-1`} value={form.titulo} maxLength={200} autoFocus onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Revisión semanal de diademas" />
            </label>
            <label className="block text-sm text-slate-300">Detalle (opcional)
              <textarea className={`${campo} mt-1`} rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm text-slate-300">Asignar a
                <select className={`${campo} mt-1`} value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                  <option value="">Elige un técnico…</option>
                  {[...new Set([...tecnicos, form.asignado_a].filter(Boolean))].map(n => <option key={n} value={n}>{n}{n === yo ? ' (yo)' : ''}</option>)}
                </select>
              </label>
              <label className="block text-sm text-slate-300">Fecha límite (opcional)
                <input type="date" className={`${campo} mt-1`} value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm text-slate-300 mb-1">Pasos de la lista</legend>
              {form.items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={campo} value={it.texto} maxLength={300} placeholder={`Paso ${idx + 1}`}
                    onChange={e => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, texto: e.target.value } : x)) })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setForm({ ...form, items: [...form.items.slice(0, idx + 1), { id: null, texto: '' }, ...form.items.slice(idx + 1)] }); } }}
                  />
                  <button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} aria-label={`Quitar paso ${idx + 1}`} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"><X size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { id: null, texto: '' }] })} className="text-sm text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> Agregar paso</button>
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-700 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={guardando} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium cursor-pointer">{guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Asignar actividad'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ActividadesView;
