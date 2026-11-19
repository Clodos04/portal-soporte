import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BarChart3, MessageSquareText, ImagePlus, Trash2, Plus, Save } from 'lucide-react';
import { EstadoVacio } from '../components/Estados';
import { useAvisos } from '../components/Avisos';

// Administración del asistente del chat: qué tan bien funcionan sus consejos y edición de los textos (con imagen opcional).

const AMBITOS = [
  ['', 'Cualquier categoría'],
  ['touchpoint audio', 'Touchpoint · Audio'],
  ['touchpoint unica', 'Touchpoint · Sesión única'],
  ['touchpoint masiva', 'Touchpoint · Caída masiva'],
  ['diadema', 'Diadema'],
  ['teclado', 'Teclado'],
  ['mouse', 'Mouse'],
  ['cpu', 'Rendimiento CPU'],
  ['monitor', 'Monitor'],
  ['red', 'Red en una posición']
];
const etiquetaAmbito = (a) => (AMBITOS.find(([v]) => v === a) || [a, a || 'Cualquier categoría'])[1];
const comoLista = (t) => String(t || '').split(',').map(x => x.trim()).filter(Boolean);
const campo = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500';
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ---------------------------------------------------------------- Resultados
function Resultados() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setDatos(null); setError('');
    fetch(`/api/asistente/metricas?dias=${dias}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('No se pudieron cargar las métricas.'))))
      .then(d => { if (vivo) setDatos(d); })
      .catch(e => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [dias]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!datos) return <p className="text-sm text-slate-400">Cargando resultados…</p>;
  const { resumen, porSubcategoria, porConsejo } = datos;
  const sinRespuesta = Math.max(0, resumen.total - resumen.resueltos - resumen.escalados);

  const Tarjeta = ({ titulo, valor, nota, color = 'text-white' }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className={`text-3xl font-semibold tabular-nums mt-1 ${color}`}>{valor}</p>
      {nota && <p className="text-xs text-slate-400 mt-1">{nota}</p>}
    </div>
  );
  const Barra = ({ r, e, t }) => (
    <div className="flex h-2 rounded-full overflow-hidden bg-slate-700 min-w-24" title={`${r} resueltos, ${e} escalados, ${Math.max(0, t - r - e)} sin respuesta`}>
      <div className="bg-emerald-500" style={{ width: `${pct(r, t)}%` }} />
      <div className="bg-amber-500" style={{ width: `${pct(e, t)}%` }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Periodo">
        {[[7, '7 días'], [30, '30 días'], [90, '90 días'], [0, 'Todo']].map(([v, t]) => (
          <button key={v} role="tab" aria-selected={dias === v} onClick={() => setDias(v)}
            className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${dias === v ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>{t}</button>
        ))}
      </div>

      {resumen.total === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl">
          <EstadoVacio icono={BarChart3} titulo="Aún no hay datos del asistente en este periodo" descripcion="Cuando los agentes reciban consejos en el chat y los confirmen, aquí verás cuántos se resolvieron solos." />
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Tarjeta titulo="Consejos mostrados" valor={resumen.total} />
            <Tarjeta titulo="Resueltos con el consejo" valor={`${pct(resumen.resueltos, resumen.total)}%`} nota={`${resumen.resueltos} folios`} color="text-emerald-400" />
            <Tarjeta titulo="Pasaron al técnico" valor={`${pct(resumen.escalados, resumen.total)}%`} nota={`${resumen.escalados} folios`} color="text-amber-400" />
            <Tarjeta titulo="Sin respuesta del agente" valor={sinRespuesta} nota="El agente no confirmó si funcionó" />
          </div>

          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Por tipo de falla</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400"><th className="py-2 pr-3 font-medium">Categoría · Subcategoría</th><th className="py-2 pr-3 font-medium text-right">Casos</th><th className="py-2 pr-3 font-medium text-right">Resueltos</th><th className="py-2 font-medium">Resultado</th></tr></thead>
                <tbody>
                  {porSubcategoria.map(f => (
                    <tr key={`${f.categoria}|${f.subcategoria}`} className="border-t border-slate-700/60">
                      <td className="py-2 pr-3 text-slate-200">{f.categoria} · {f.subcategoria}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{f.total}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{pct(f.resueltos, f.total)}%</td>
                      <td className="py-2"><Barra r={f.resueltos} e={f.escalados} t={f.total} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">Verde: se resolvió con el consejo. Ámbar: el agente pidió al técnico. El resto no confirmó.</p>
          </section>

          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Consejos que más se muestran</h2>
            <p className="text-xs text-slate-400 mb-3">Los que casi siempre pasan al técnico son los primeros candidatos a reescribir o a reforzar con una imagen.</p>
            <ul className="divide-y divide-slate-700/60">
              {porConsejo.map(c => (
                <li key={c.clave} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">{c.grupo || 'Consejo eliminado'}</p>
                    <p className="text-sm text-slate-200 line-clamp-2">{c.texto || c.clave}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-64 shrink-0">
                    <span className="text-xs text-slate-400 tabular-nums w-16">{c.total} casos</span>
                    <Barra r={c.resueltos} e={c.escalados} t={c.total} />
                    <span className="text-xs font-medium tabular-nums text-emerald-400 w-10 text-right">{pct(c.resueltos, c.total)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Consejos
function TarjetaConsejo({ c, onGuardado, onEliminado }) {
  const { avisar, confirmar } = useAvisos();
  const [borrador, setBorrador] = useState({ texto: c.texto, frases: c.frases.join(', '), libres: c.libres.join(', '), ambito: c.ambito, activo: c.activo });
  const [version, setVersion] = useState(Date.now());
  const [guardando, setGuardando] = useState(false);
  const inputArchivo = useRef(null);
  const cambiado = borrador.texto !== c.texto || borrador.frases !== c.frases.join(', ') || borrador.libres !== c.libres.join(', ') || borrador.ambito !== c.ambito || borrador.activo !== c.activo;

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/asistente/consejos/${c.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: borrador.texto, frases: comoLista(borrador.frases), libres: comoLista(borrador.libres), ambito: borrador.ambito, grupo: c.grupo, activo: borrador.activo })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return avisar(d.error || 'No se pudo guardar.', 'error');
      avisar('Consejo guardado. Ya se usa en el chat.', 'exito');
      onGuardado();
    } finally { setGuardando(false); }
  };

  const subirImagen = async (archivo) => {
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) return avisar('La imagen supera 2 MB.', 'error');
    const res = await fetch(`/api/asistente/consejos/${c.id}/imagen`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Nombre-Archivo': encodeURIComponent(archivo.name) }, body: archivo
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return avisar(d.error || 'No se pudo subir la imagen.', 'error');
    avisar('Imagen agregada al consejo.', 'exito');
    setVersion(Date.now());
    onGuardado();
  };

  const quitarImagen = async () => {
    if (!await confirmar('¿Quitar la imagen de este consejo?')) return;
    const res = await fetch(`/api/asistente/consejos/${c.id}/imagen`, { method: 'DELETE' });
    if (!res.ok) return avisar('No se pudo quitar la imagen.', 'error');
    onGuardado();
  };

  const eliminar = async () => {
    if (!await confirmar('¿Eliminar este consejo personalizado?')) return;
    const res = await fetch(`/api/asistente/consejos/${c.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return avisar(d.error || 'No se pudo eliminar.', 'error');
    onEliminado();
  };

  return (
    <article className={`bg-slate-800 border rounded-2xl p-4 space-y-3 ${borrador.activo ? 'border-slate-700' : 'border-slate-700/60 opacity-75'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">{c.base ? 'De fábrica' : 'Personalizado'}</span>
        <span className="text-slate-400">Se aplica en: {etiquetaAmbito(borrador.ambito)}</span>
        {c.soloElemento && <span className="text-slate-400">· sale desde el primer mensaje si el ticket trae este síntoma</span>}
        <label className="ml-auto inline-flex items-center gap-2 text-slate-300 cursor-pointer">
          <input type="checkbox" checked={borrador.activo} onChange={e => setBorrador({ ...borrador, activo: e.target.checked })} className="h-4 w-4 accent-emerald-500" /> Activo
        </label>
      </div>

      <label className="block text-xs text-slate-400">Texto que ve el agente
        <textarea className={`${campo} mt-1`} rows={3} value={borrador.texto} onChange={e => setBorrador({ ...borrador, texto: e.target.value })} />
      </label>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block text-xs text-slate-400">Se muestra cuando elige o el ticket dice… (separado por comas)
          <input className={`${campo} mt-1`} value={borrador.frases} onChange={e => setBorrador({ ...borrador, frases: e.target.value })} />
        </label>
        <label className="block text-xs text-slate-400">O cuando escribe con sus palabras… (separado por comas)
          <input className={`${campo} mt-1`} value={borrador.libres} onChange={e => setBorrador({ ...borrador, libres: e.target.value })} placeholder="ej. se oye bajo, no me oyen" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {c.imagen ? (
          <>
            <img src={`/api/asistente/consejos/${c.id}/imagen?v=${version}`} alt="Imagen del consejo" className="h-20 rounded-lg border border-slate-700" />
            <button onClick={quitarImagen} className="text-xs text-slate-300 hover:text-red-400 inline-flex items-center gap-1.5 cursor-pointer"><Trash2 size={13} /> Quitar imagen</button>
          </>
        ) : (
          <button onClick={() => inputArchivo.current && inputArchivo.current.click()} className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1.5 cursor-pointer"><ImagePlus size={14} /> Agregar imagen (PNG, JPG, GIF o WEBP, máx. 2 MB)</button>
        )}
        {c.imagen && <button onClick={() => inputArchivo.current && inputArchivo.current.click()} className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1.5 cursor-pointer"><ImagePlus size={14} /> Cambiar</button>}
        <input ref={inputArchivo} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={e => { subirImagen(e.target.files[0]); e.target.value = ''; }} />

        <div className="ml-auto flex items-center gap-2">
          {!c.base && <button onClick={eliminar} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-red-400 hover:bg-slate-700 cursor-pointer">Eliminar</button>}
          <button onClick={guardar} disabled={!cambiado || guardando} className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Save size={13} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </article>
  );
}

function NuevoConsejo({ onCreado, onCancelar }) {
  const { avisar } = useAvisos();
  const [f, setF] = useState({ grupo: '', ambito: '', texto: '', frases: '', libres: '', soloElemento: false });
  const [guardando, setGuardando] = useState(false);
  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch('/api/asistente/consejos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: f.grupo || etiquetaAmbito(f.ambito), ambito: f.ambito, texto: f.texto, frases: comoLista(f.frases), libres: comoLista(f.libres), soloElemento: f.soloElemento })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return avisar(d.error || 'No se pudo crear.', 'error');
      avisar('Consejo creado.', 'exito');
      onCreado();
    } finally { setGuardando(false); }
  };
  return (
    <form onSubmit={crear} className="bg-slate-800 border border-indigo-500/40 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Nuevo consejo</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block text-xs text-slate-400">Se aplica en
          <select className={`${campo} mt-1`} value={f.ambito} onChange={e => setF({ ...f, ambito: e.target.value })}>
            {AMBITOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-400">Nombre del grupo (opcional)
          <input className={`${campo} mt-1`} value={f.grupo} onChange={e => setF({ ...f, grupo: e.target.value })} />
        </label>
      </div>
      <label className="block text-xs text-slate-400">Texto que verá el agente
        <textarea className={`${campo} mt-1`} rows={3} value={f.texto} onChange={e => setF({ ...f, texto: e.target.value })} autoFocus />
      </label>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block text-xs text-slate-400">Se muestra cuando elige o el ticket dice… (comas)
          <input className={`${campo} mt-1`} value={f.frases} onChange={e => setF({ ...f, frases: e.target.value })} placeholder="ej. cable roto" />
        </label>
        <label className="block text-xs text-slate-400">O cuando escribe con sus palabras… (comas)
          <input className={`${campo} mt-1`} value={f.libres} onChange={e => setF({ ...f, libres: e.target.value })} />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input type="checkbox" checked={f.soloElemento} onChange={e => setF({ ...f, soloElemento: e.target.checked })} className="h-4 w-4 accent-indigo-500" />
        Mostrarlo desde el primer mensaje cuando el ticket ya trae este síntoma (elemento)
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700 cursor-pointer">Cancelar</button>
        <button type="submit" disabled={guardando} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer">{guardando ? 'Creando…' : 'Crear consejo'}</button>
      </div>
    </form>
  );
}

function Consejos() {
  const [consejos, setConsejos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/asistente/consejos');
      const d = await res.json();
      if (Array.isArray(d)) setConsejos(d);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = consejos.filter(c => !q || `${c.grupo} ${c.texto} ${c.frases.join(' ')}`.toLowerCase().includes(q));
    const mapa = new Map();
    filtrados.forEach(c => { const k = c.grupo || 'Otros'; mapa.set(k, [...(mapa.get(k) || []), c]); });
    return [...mapa.entries()];
  }, [consejos, busqueda]);

  if (cargando) return <p className="text-sm text-slate-400">Cargando consejos…</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input className={`${campo} max-w-xs`} placeholder="Buscar consejo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar consejo" />
        <button onClick={() => setNuevo(true)} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer"><Plus size={15} /> Nuevo consejo</button>
        <p className="text-xs text-slate-400">Los cambios se aplican de inmediato en los chats nuevos.</p>
      </div>
      {nuevo && <NuevoConsejo onCreado={() => { setNuevo(false); cargar(); }} onCancelar={() => setNuevo(false)} />}
      {grupos.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl"><EstadoVacio icono={MessageSquareText} titulo="No hay consejos que coincidan" /></div>
      ) : grupos.map(([nombre, lista]) => (
        <section key={nombre} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">{nombre} <span className="text-xs font-normal text-slate-400">({lista.length})</span></h2>
          {lista.map(c => <TarjetaConsejo key={`${c.id}-${c.actualizado || ''}-${c.imagen}`} c={c} onGuardado={cargar} onEliminado={cargar} />)}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Vista
function AdminAsistenteView() {
  const [pestana, setPestana] = useState('resultados');
  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5 text-slate-200">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2"><Bot size={22} strokeWidth={1.75} /> Asistente del chat</h1>
        <p className="text-slate-400 text-sm mt-1">Mide qué consejos resuelven los problemas sin visita del técnico y edita los textos que ve el agente, con imagen opcional.</p>
      </div>
      <div className="flex gap-2" role="tablist">
        {[['resultados', 'Resultados'], ['consejos', 'Consejos']].map(([id, t]) => (
          <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className={`px-4 py-2 rounded-lg text-sm border cursor-pointer transition-colors ${pestana === id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>{t}</button>
        ))}
      </div>
      {pestana === 'resultados' ? <Resultados /> : <Consejos />}
    </div>
  );
}

export default AdminAsistenteView;
