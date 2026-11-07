import React from 'react';

function GuiaTicketsView() {
  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6 text-slate-200">
      
      {/* Encabezado */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Guía de Creación de Tickets</h1>
        <p className="text-slate-400 text-sm mt-1">Manual paso a paso para reportar incidencias de forma correcta y eficiente.</p>
      </div>

      {/* Contenido de la Guía */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Paso 1 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-3 relative overflow-hidden">
          <div className="text-4xl font-semibold text-indigo-400/20 absolute top-4 right-4">01</div>
          <h3 className="text-lg font-bold text-white">Inicia una Solicitud</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Haz clic en el botón <strong className="text-slate-200">Nueva solicitud</strong> ubicado en la parte superior derecha de tu panel de solicitudes.
          </p>
        </div>

        {/* Paso 2 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-3 relative overflow-hidden">
          <div className="text-4xl font-semibold text-indigo-500/20 absolute top-4 right-4">02</div>
          <h3 className="text-lg font-bold text-white">Usa el Asistente de Falla</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Si no sabes cómo tipificar tu problema, haz clic en el botón <strong className="text-slate-200">¿No sabes cómo tipificar?</strong> para que el asistente te guíe paso a paso hasta la categoría exacta.
          </p>
        </div>

        {/* Paso 3 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-3 relative overflow-hidden">
          <div className="text-4xl font-semibold text-indigo-400/20 absolute top-4 right-4">03</div>
          <h3 className="text-lg font-bold text-white">Detalla y Envía</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Completa el asunto, describe claramente tu situación, selecciona los equipos afectados, adjunta una captura si es necesario y haz clic en <strong className="text-slate-200">Guardar Solicitud</strong>.
          </p>
        </div>

      </div>

      {/* Consejos adicionales */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">
          Consejos para una atención más rápida
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <li className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60 space-y-1">
            <strong className="text-white block font-semibold">Sé específico en la descripción</strong>
            Menciona mensajes de error exactos, los pasos que realizaste antes de la falla y el nombre de la herramienta involucrada.
          </li>
          <li className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60 space-y-1">
            <strong className="text-white block font-semibold">Adjunta evidencias visuales</strong>
            Una captura de pantalla ayuda al equipo técnico a identificar el problema de inmediato y reduce el tiempo de resolución.
          </li>
        </ul>
      </div>

    </div>
  );
}

export default GuiaTicketsView;