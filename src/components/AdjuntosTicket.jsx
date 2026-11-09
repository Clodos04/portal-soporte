import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { useAvisos } from './Avisos';
import { subirAdjunto, validarAdjunto, formatearTamano, TIPOS_ADJUNTO, MAX_ADJUNTO_MB } from '../utils/adjuntos';

// Lista de archivos de un folio, con descarga, subida de más archivos y borrado (solo administradores).
export default function AdjuntosTicket({ folio, esAdmin, senal = 0 }) {
  const { avisar, confirmar } = useAvisos();
  const [lista, setLista] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const entrada = useRef(null);

  const cargar = useCallback(async () => {
    if (!folio) return;
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(folio)}/adjuntos`);
      if (res.ok) setLista(await res.json());
    } catch (e) { /* sin conexión: se conserva la lista actual */ }
  }, [folio]);

  useEffect(() => { cargar(); }, [cargar, senal]);

  const alElegir = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = '';
    const problema = validarAdjunto(archivo);
    if (!archivo) return;
    if (problema) return avisar(problema, 'error');
    setSubiendo(true);
    const r = await subirAdjunto(folio, archivo);
    setSubiendo(false);
    if (r.ok) { avisar('Archivo adjuntado.', 'exito'); cargar(); } else avisar(r.error, 'error');
  };

  const eliminar = async (a) => {
    if (!(await confirmar(`¿Eliminar el archivo «${a.nombre}»?`, { textoConfirmar: 'Eliminar' }))) return;
    const res = await fetch(`/api/adjuntos/${a.id}`, { method: 'DELETE' });
    if (res.ok) cargar(); else avisar('No se pudo eliminar el archivo.', 'error');
  };

  if (lista.length === 0 && !folio) return null;

  return (
    <div className="px-5 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><Paperclip size={14} aria-hidden="true" /> Archivos adjuntos ({lista.length})</p>
        <button type="button" onClick={() => entrada.current && entrada.current.click()} disabled={subiendo}
          className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-50">
          <Upload size={13} aria-hidden="true" /> {subiendo ? 'Subiendo…' : 'Adjuntar'}
        </button>
        <input ref={entrada} type="file" accept={TIPOS_ADJUNTO} onChange={alElegir} className="hidden" aria-label={`Adjuntar archivo (máx. ${MAX_ADJUNTO_MB} MB)`} />
      </div>
      {lista.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {lista.map(a => (
            <li key={a.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <a href={`/api/adjuntos/${a.id}`} className="flex items-center gap-1.5 text-slate-200 hover:text-indigo-300 max-w-[16rem]" title={`Descargar ${a.nombre}`}>
                <Download size={13} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{a.nombre}</span>
                <span className="text-slate-400 shrink-0">{formatearTamano(a.tamano)}</span>
              </a>
              {esAdmin && (
                <button type="button" onClick={() => eliminar(a)} title="Eliminar archivo" aria-label={`Eliminar ${a.nombre}`} className="text-slate-500 hover:text-red-400 cursor-pointer">
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
