import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

// Sistema de avisos propio: reemplaza alert() y confirm() del navegador.
//   const { avisar, confirmar } = useAvisos();
//   avisar('Guardado', 'exito' | 'error' | 'info');
//   if (await confirmar('¿Eliminar este usuario?')) { ... }

const AvisosContext = createContext(null);

export const useAvisos = () => {
  const ctx = useContext(AvisosContext);
  if (!ctx) throw new Error('useAvisos debe usarse dentro de <AvisosProvider>');
  return ctx;
};

const ESTILOS = {
  exito: { icono: CheckCircle2, color: 'text-emerald-400' },
  error: { icono: AlertTriangle, color: 'text-red-400' },
  info: { icono: Info, color: 'text-indigo-300' }
};

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);
  const [clavePedida, setClavePedida] = useState(null);
  const [claveTexto, setClaveTexto] = useState('');
  const contador = useRef(0);

  const cerrarAviso = useCallback((id) => setAvisos(prev => prev.filter(a => a.id !== id)), []);

  const avisar = useCallback((mensaje, tipo = 'info') => {
    const id = ++contador.current;
    setAvisos(prev => [...prev.slice(-3), { id, mensaje, tipo }]);
    setTimeout(() => cerrarAviso(id), tipo === 'error' ? 6000 : 4000);
  }, [cerrarAviso]);

  const confirmar = useCallback((mensaje, opciones = {}) => new Promise((resolve) => {
    setConfirmacion({ mensaje, resolve, textoConfirmar: opciones.textoConfirmar || 'Eliminar', peligro: opciones.peligro !== false });
  }), []);

  const responder = (valor) => {
    confirmacion?.resolve(valor);
    setConfirmacion(null);
  };

  // Pide una clave en un cuadro propio. Devuelve el texto escrito o null si se cancela.
  const pedirClave = useCallback((mensaje, opciones = {}) => new Promise((resolve) => {
    setClavePedida({ mensaje, resolve, textoConfirmar: opciones.textoConfirmar || 'Continuar' });
    setClaveTexto('');
  }), []);

  const responderClave = (valor) => {
    clavePedida?.resolve(valor);
    setClavePedida(null);
    setClaveTexto('');
  };

  useEffect(() => {
    if (!confirmacion) return;
    const alTeclear = (e) => { if (e.key === 'Escape') responder(false); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmacion]);

  useEffect(() => {
    if (!clavePedida) return;
    const alTeclear = (e) => { if (e.key === 'Escape') responderClave(null); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePedida]);

  const valor = useMemo(() => ({ avisar, confirmar, pedirClave }), [avisar, confirmar, pedirClave]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}

      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]" aria-live="polite">
        {avisos.map(a => {
          const { icono: Icono, color } = ESTILOS[a.tipo] || ESTILOS.info;
          return (
            <div key={a.id} role="status" className="flex items-start gap-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-4 py-3">
              <Icono size={18} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${color}`} />
              <p className="text-sm text-slate-100 flex-1">{a.mensaje}</p>
              <button onClick={() => cerrarAviso(a.id)} aria-label="Cerrar aviso" className="text-slate-400 hover:text-slate-100 cursor-pointer">
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmacion && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-4" onClick={() => responder(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacion-texto"
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <p id="confirmacion-texto" className="text-sm text-slate-100 leading-relaxed">{confirmacion.mensaje}</p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                autoFocus
                onClick={() => responder(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => responder(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
                  confirmacion.peligro ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {confirmacion.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}

      {clavePedida && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-4" onClick={() => responderClave(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="clave-texto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (claveTexto) responderClave(claveTexto); }}
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6"
          >
            <p id="clave-texto" className="text-sm text-slate-100 leading-relaxed">{clavePedida.mensaje}</p>
            <input
              type="password"
              autoFocus
              autoComplete="off"
              value={claveTexto}
              onChange={(e) => setClaveTexto(e.target.value)}
              aria-label="Clave"
              className="mt-4 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => responderClave(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!claveTexto}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {clavePedida.textoConfirmar}
              </button>
            </div>
          </form>
        </div>
      )}
    </AvisosContext.Provider>
  );
}
