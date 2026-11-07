import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { exportarGraficaComoPng } from '../../utils/exportarGrafica';
import { useAvisos } from '../Avisos';

// Contenedor común de las gráficas: título, descripción, acciones y botón "Exportar PNG".
export default function TarjetaGrafica({ titulo, descripcion, acciones, exportable = true, className = '', children }) {
  const contenedorRef = useRef(null);
  const [exportando, setExportando] = useState(false);
  const { avisar } = useAvisos();

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarGraficaComoPng(contenedorRef.current, titulo);
    } catch (error) {
      avisar(error.message || 'No se pudo exportar la gráfica.', 'error');
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className={`bg-slate-800 border border-slate-700 rounded-2xl p-5 sm:p-6 animate-entrada ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white tracking-tight">{titulo}</h3>
          {descripcion && <p className="text-xs text-slate-400 mt-0.5">{descripcion}</p>}
        </div>
        <div className="flex items-center gap-2">
          {acciones}
          {exportable && (
            <button
              onClick={exportar}
              disabled={exportando}
              title="Descargar como imagen PNG"
              aria-label={`Descargar la gráfica ${titulo} como imagen`}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>
      <div ref={contenedorRef}>{children}</div>
    </section>
  );
}
