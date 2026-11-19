import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BarChart3, MessageSquareText, ImagePlus, Trash2, Plus, Save, Copy, Download, FlaskConical, Search, Send, RotateCcw } from 'lucide-react';
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
const MINIMO_PARA_JUZGAR = 5; // con menos casos el porcentaje no dice nada
const UMBRAL_BAJO = 40;

const descargarCsv = (nombre, filas) => {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const texto = '\uFEFF' + filas.map(f => f.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// El chat guarda botones e imagen dentro del texto: aquí se separan igual que en el chat real
const separarMarcadores = (crudo = '') => {
  let texto = String(crudo);
  let imagen = null;
  const im = texto.match(/\[\[IMAGEN:(\/api\/asistente\/consejos\/\d+\/imagen)\]\]/);
  if (im) { imagen = im[1]; texto = texto.replace(im[0], ''); }
  const op = texto.match(/\[\[OPCIONES:(.*?)\]\]/s);
  const opciones = op ? op[1].split('|').map(x => x.trim()).filter(Boolean) : [];
  if (op) texto = texto.replace(op[0], '');
  return { texto: texto.trim(), opciones, imagen };
};

// ---------------------------------------------------------------- Resultados
function Resultados({ onCrearDesdeTexto }) {
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
  const { resumen, porSubcategoria, porConsejo, fueraHorario = 0 } = datos;
  const sinRespuesta = Math.max(0, resumen.total - resumen.resueltos - resumen.escalados);
  const exportar = () => {
    descargarCsv(`asistente-${dias || 'todo'}-dias.csv`, [
      ['Tipo', 'Categoría', 'Subcategoría / Consejo', 'Casos', 'Resueltos', 'Escalados', '% resuelto'],
      ...porSubcategoria.map(f => ['Por falla', f.categoria, f.subcategoria, f.total, f.resueltos, f.escalados, pct(f.resueltos, f.total)]),
      ...porConsejo.map(c => ['Por consejo', c.grupo || '', c.texto || c.clave, c.total, c.resueltos, c.escalados, pct(c.resueltos, c.total)])
    ]);
  };

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
        {resumen.total > 0 && (
          <button onClick={exportar} className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border bg-slate-800 border-slate-700 text-slate-300 hover:text-white cursor-pointer"><Download size={14} /> Exportar CSV</button>
        )}
      </div>

      {fueraHorario > 0 && (
        <p className="text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
          🌙 <strong className="text-white tabular-nums">{fueraHorario}</strong> {fueraHorario === 1 ? 'solicitud se cerró sola' : 'solicitudes se cerraron solas'} por crearse fuera del horario de atención en este periodo.
        </p>
      )}

      <SinCoincidencia dias={dias} onCrear={onCrearDesdeTexto} />

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
                  {c.total >= MINIMO_PARA_JUZGAR && pct(c.resueltos, c.total) < UMBRAL_BAJO && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 sm:w-28 text-center shrink-0">Conviene reescribirlo</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

// Lo que los agentes escriben con sus palabras y no coincide con ningún consejo: candidatos a consejos nuevos
function SinCoincidencia({ dias, onCrear }) {
  const { avisar } = useAvisos();
  const [lista, setLista] = useState([]);
  const cargar = useCallback(() => {
    fetch(`/api/asistente/sin-coincidencia?dias=${dias || 365}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setLista(d); })
      .catch(() => {});
  }, [dias]);
  useEffect(() => { cargar(); }, [cargar]);

  const descartar = async (texto) => {
    const res = await fetch('/api/asistente/sin-coincidencia/descartar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
    if (!res.ok) return avisar('No se pudo descartar.', 'error');
    cargar();
  };
  if (lista.length === 0) return null;

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Search size={15} /> Lo que escriben y el asistente no entendió</h2>
      <p className="text-xs text-slate-400 mb-3">Frases escritas por los agentes que no activaron ningún consejo. Las que más se repiten merecen un consejo propio.</p>
      <ul className="divide-y divide-slate-700/60">
        {lista.map(f => (
          <li key={f.texto} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 break-words">“{f.texto}”</p>
              <p className="text-xs text-slate-400">{[f.categoria, f.subcategoria].filter(Boolean).join(' · ') || 'Sin categoría'}</p>
            </div>
            <span className="text-xs text-slate-400 tabular-nums shrink-0">{f.veces} {f.veces === 1 ? 'vez' : 'veces'}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onCrear(f.texto)} className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer">Crear consejo</button>
              <button onClick={() => descartar(f.texto)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-700 cursor-pointer">Descartar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
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

  const duplicar = async () => {
    const res = await fetch('/api/asistente/consejos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupo: c.grupo, ambito: c.ambito, texto: c.texto, frases: c.frases, libres: c.libres, soloElemento: !!c.soloElemento })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return avisar(d.error || 'No se pudo duplicar.', 'error');
    avisar('Consejo duplicado: aparece como personalizado en el mismo grupo.', 'exito');
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
          <button onClick={duplicar} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><Copy size={13} /> Duplicar</button>
          {!c.base && <button onClick={eliminar} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-red-400 hover:bg-slate-700 cursor-pointer">Eliminar</button>}
          <button onClick={guardar} disabled={!cambiado || guardando} className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Save size={13} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </article>
  );
}

function NuevoConsejo({ onCreado, onCancelar, inicial = {} }) {
  const { avisar } = useAvisos();
  const [f, setF] = useState({ grupo: '', ambito: '', texto: '', frases: '', libres: '', soloElemento: false, ...inicial });
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

function Consejos({ prefill, onPrefillUsado }) {
  const [consejos, setConsejos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(!!prefill);
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
      {nuevo && <NuevoConsejo inicial={prefill ? { libres: prefill } : {}} onCreado={() => { setNuevo(false); onPrefillUsado(); cargar(); }} onCancelar={() => { setNuevo(false); onPrefillUsado(); }} />}
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

// ---------------------------------------------------------------- Simulador
const nombreDe = (x) => (typeof x === 'string' ? x : (x && (x.nombre || x.name)) || '');

function Simulador() {
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [elemento, setElemento] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [transcripcion, setTranscripcion] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const fin = useRef(null);

  useEffect(() => {
    fetch('/api/categorias').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategorias(d); }).catch(() => {});
  }, []);
  useEffect(() => { if (fin.current) fin.current.scrollIntoView({ block: 'nearest' }); }, [transcripcion]);

  const subcats = useMemo(() => {
    const c = categorias.find(x => nombreDe(x) === categoria);
    return c && Array.isArray(c.subcategorias) ? c.subcategorias : [];
  }, [categorias, categoria]);
  const elementos = useMemo(() => {
    const sc = subcats.find(x => nombreDe(x) === subcategoria);
    return sc && Array.isArray(sc.elementos) ? sc.elementos.map(nombreDe).filter(Boolean) : [];
  }, [subcats, subcategoria]);

  const correr = async (lista) => {
    setCargando(true); setError('');
    try {
      const res = await fetch('/api/asistente/simular', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, subcategoria, elemento, mensajes: lista })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo simular.');
      setMensajes(lista);
      setTranscripcion(d);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const iniciar = () => { setTexto(''); correr([]); };
  const enviar = (t) => { const v = String(t || '').trim(); if (v && !cargando) { setTexto(''); correr([...mensajes, v]); } };
  const ultimo = transcripcion && transcripcion.transcripcion[transcripcion.transcripcion.length - 1];
  const opcionesActuales = ultimo && ultimo.rol === 'sistema' && !transcripcion.cerrado ? separarMarcadores(ultimo.texto).opciones : [];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-slate-400">Prueba cómo conversaría el asistente con un agente, sin crear folios ni afectar las métricas. Elige el tipo de falla y responde como lo haría el agente.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block text-xs text-slate-400">Categoría
            <select className={`${campo} mt-1`} value={categoria} onChange={e => { setCategoria(e.target.value); setSubcategoria(''); setElemento(''); }}>
              <option value="">Elige…</option>
              {categorias.map(c => <option key={nombreDe(c)} value={nombreDe(c)}>{nombreDe(c)}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">Subcategoría
            <select className={`${campo} mt-1`} value={subcategoria} onChange={e => { setSubcategoria(e.target.value); setElemento(''); }} disabled={!categoria}>
              <option value="">Elige…</option>
              {subcats.map(x => <option key={nombreDe(x)} value={nombreDe(x)}>{nombreDe(x)}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">Elemento / síntoma (opcional)
            <select className={`${campo} mt-1`} value={elemento} onChange={e => setElemento(e.target.value)} disabled={!subcategoria}>
              <option value="">Ninguno</option>
              {elementos.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={iniciar} disabled={!categoria || !subcategoria || cargando} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer">
            {transcripcion ? <><RotateCcw size={14} /> Reiniciar</> : <><FlaskConical size={14} /> Empezar prueba</>}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {transcripcion && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
          {transcripcion.transcripcion.map((m, i) => {
            const { texto: t, opciones, imagen } = separarMarcadores(m.texto);
            const sistema = m.rol === 'sistema';
            return (
              <div key={i} className={`flex ${sistema ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${sistema ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-indigo-600 text-white'}`}>
                  <p className={`text-xs mb-1 ${sistema ? 'text-slate-400' : 'text-indigo-200'}`}>{sistema ? 'Asistente TI (Sistema)' : 'Agente (tú)'}</p>
                  {t}
                  {imagen && <img src={imagen} alt="Imagen del consejo" className="mt-2 rounded-lg border border-slate-700 max-h-48" />}
                  {sistema && m.sinConsejo && <p className="mt-2 text-xs text-amber-300">No se encontró un consejo para esto: es un buen candidato a crear uno.</p>}
                  {sistema && opciones.length > 0 && i === transcripcion.transcripcion.length - 1 && <p className="mt-2 text-xs text-slate-400">Botones: {opciones.length}</p>}
                </div>
              </div>
            );
          })}
          <div ref={fin} />
          {transcripcion.cerrado ? (
            <p className="text-sm text-emerald-400">El folio se habría cerrado aquí.</p>
          ) : (
            <>
              {opcionesActuales.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {opcionesActuales.map(o => (
                    <button key={o} onClick={() => enviar(o)} disabled={cargando} className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-600 text-slate-200 hover:border-indigo-400 cursor-pointer text-left">{o}</button>
                  ))}
                </div>
              )}
              <form onSubmit={e => { e.preventDefault(); enviar(texto); }} className="flex gap-2">
                <input className={campo} value={texto} onChange={e => setTexto(e.target.value)} placeholder="O escribe como lo haría el agente, con sus palabras…" aria-label="Mensaje del agente" />
                <button type="submit" disabled={cargando || !texto.trim()} className="px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm inline-flex items-center gap-2 cursor-pointer"><Send size={14} /> Enviar</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Ajustes
const HORAS = Array.from({ length: 24 }, (_, h) => h);
const etiquetaHora = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`;

function Ajustes() {
  const { avisar } = useAvisos();
  const [cfg, setCfg] = useState(null);
  const [original, setOriginal] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch('/api/asistente/config').then(r => r.json()).then(d => { setCfg(d); setOriginal(d); }).catch(() => avisar('No se pudieron cargar los ajustes.', 'error'));
  }, [avisar]);

  if (!cfg) return <p className="text-sm text-slate-400">Cargando ajustes…</p>;
  const cambiado = JSON.stringify(cfg) !== JSON.stringify(original);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch('/api/asistente/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return avisar(d.error || 'No se pudo guardar.', 'error');
      avisar('Ajustes guardados. Se aplican a los tickets nuevos.', 'exito');
      setOriginal(cfg);
    } finally { setGuardando(false); }
  };

  return (
    <form onSubmit={guardar} className="space-y-5">
      <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Horario de atención</h2>
          <p className="text-xs text-slate-400 mt-1">Las solicitudes que un cliente crea fuera de este horario se cierran solas y se le avisa que debe volver a levantarlas. Soporte y los reportes Centinela no se ven afectados. Hora de México.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input type="checkbox" checked={cfg.fueraActivo} onChange={e => setCfg({ ...cfg, fueraActivo: e.target.checked })} className="h-4 w-4 accent-emerald-500" />
          Cerrar automáticamente lo que se cree fuera de horario
        </label>
        <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
          <label className="block text-xs text-slate-400">Empieza el horario sin atención
            <select className={`${campo} mt-1`} value={cfg.fueraDesde} disabled={!cfg.fueraActivo} onChange={e => setCfg({ ...cfg, fueraDesde: Number(e.target.value) })}>
              {HORAS.map(h => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">Se vuelve a atender a las
            <select className={`${campo} mt-1`} value={cfg.fueraHasta} disabled={!cfg.fueraActivo} onChange={e => setCfg({ ...cfg, fueraHasta: Number(e.target.value) })}>
              {HORAS.map(h => <option key={h} value={h}>{etiquetaHora(h)}</option>)}
            </select>
          </label>
        </div>
        {cfg.fueraActivo && cfg.fueraDesde === cfg.fueraHasta && <p className="text-xs text-amber-300">Con la misma hora en ambos campos no se cierra nada.</p>}
      </section>

      <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Aviso de espera</h2>
          <p className="text-xs text-slate-400 mt-1">Cuando hay al menos esta cantidad de solicitudes abiertas sin técnico, el primer mensaje del chat avisa que la atención puede tardar más.</p>
        </div>
        <label className="block text-xs text-slate-400 max-w-48">Solicitudes sin técnico
          <input type="number" min="1" max="500" className={`${campo} mt-1`} value={cfg.umbralEspera} onChange={e => setCfg({ ...cfg, umbralEspera: Number(e.target.value) })} />
        </label>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={!cambiado || guardando} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"><Save size={14} /> {guardando ? 'Guardando…' : 'Guardar ajustes'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Vista
function AdminAsistenteView() {
  const [pestana, setPestana] = useState('resultados');
  const [prefill, setPrefill] = useState('');
  const crearDesdeTexto = (t) => { setPrefill(t); setPestana('consejos'); };
  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5 text-slate-200">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2"><Bot size={22} strokeWidth={1.75} /> Asistente del chat</h1>
        <p className="text-slate-400 text-sm mt-1">Mide qué consejos resuelven los problemas sin visita del técnico y edita los textos que ve el agente, con imagen opcional.</p>
      </div>
      <div className="flex gap-2" role="tablist">
        {[['resultados', 'Resultados'], ['consejos', 'Consejos'], ['simulador', 'Simulador'], ['ajustes', 'Ajustes']].map(([id, t]) => (
          <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className={`px-4 py-2 rounded-lg text-sm border cursor-pointer transition-colors ${pestana === id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>{t}</button>
        ))}
      </div>
      {pestana === 'resultados' && <Resultados onCrearDesdeTexto={crearDesdeTexto} />}
      {pestana === 'consejos' && <Consejos key={prefill} prefill={prefill} onPrefillUsado={() => setPrefill('')} />}
      {pestana === 'simulador' && <Simulador />}
      {pestana === 'ajustes' && <Ajustes />}
    </div>
  );
}

export default AdminAsistenteView;
