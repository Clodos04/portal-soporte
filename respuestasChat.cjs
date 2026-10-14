// Archivo: respuestasChat.cjs

// 1. GENERADOR DE MENSAJES PARA MODALIDAD CENTINELA DIRECTA
const obtenerMensajeCentinela = (nuevoFolio, esSubsecuente, folioAnterior) => {
  if (esSubsecuente) {
    return `Gracias por crear tu centinela con el folio #${nuevoFolio}. Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnterior}). Te agradecemos que lo sigas reportando para que tu campaña llegue al 100% y se hagan los cambios solicitados.`;
  }
  return `🛡️ Folio Centinela #${nuevoFolio} registrado con éxito para solicitud de cambio de periférico. Se te asignará un técnico en un tiempo máximo de 10 minutos para validar el componente.`;
};

// 2. FLUJO SECUENCIAL DE PREGUNTAS AUTOMÁTICAS EN EL CHAT
// Recibe (ticket, folioAnteriorMes) -> Si folioAnteriorMes existe en Dispositivos, pregunta si ya generó el Centinela
const obtenerFlujoPreguntas = (ticket, folioAnteriorMes = null) => {
  const folio = ticket.folio;
  const nodo = ticket.equipo && ticket.equipo !== 'Ninguno' ? ticket.equipo : 'tu equipo';
  const campana = ticket.campana || 'General';
  const cat = (ticket.categoria || '').toUpperCase();
  const sub = (ticket.subcategoria || '').toUpperCase();
  const elem = (ticket.elemento || '').toUpperCase();

  // --- CATEGORÍA: TOUCHPOINT ---
  if (cat.includes('TOUCHPOINT')) {
    if (sub.includes('AUDIO')) {
      return [
        `🎧 ¡Hola! Folio #${folio} registrado para el nodo ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos esta validación rápida (Pregunta 1 de 3):\n👉 ¿Ya probaste desconectar y volver a conectar la diadema en otro puerto USB de tu mismo CPU?`,
        `Gracias por confirmar. Vamos con la validación 2 de 3:\n👉 Si miras el ícono de bocina de Windows (abajo a la derecha junto al reloj), ¿aparece reconocida la diadema USB o marca una 'X' roja?`,
        `Entendido. Última validación (3 de 3):\n👉 ¿Ya intentaste cerrar Touchpoint por completo y volver a abrirlo (o reiniciar el equipo) asegurándote de que la diadema ya esté bien conectada antes de abrirlo?`,
        `✅ ¡Muchas gracias por tus respuestas! Con este diagnóstico nuestro técnico de TI ya sabe exactamente qué revisar y se acercará a tu posición (${nodo}) en breve.`
      ];
    }
    if (sub.includes('ÚNICA') || sub.includes('UNICA')) {
      return [
        `🔌 Folio #${folio} recibido para ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos esta validación (Pregunta 1 de 3):\n👉 ¿Ya intentaste abrir la sesión de Touchpoint en otro navegador (ej. Chrome o Edge) o en una ventana nueva?`,
        `Perfecto, gracias. Segunda validación (2 de 3):\n👉 Si el agente intenta iniciar sesión con su usuario en otro equipo/computadora, ¿le permite conectarse o se sigue cerrando con su usuario?`,
        `De acuerdo. Última pregunta (3 de 3):\n👉 ¿Ya verificaste que el cable de red detrás del CPU no esté flojo?`,
        `✅ ¡Excelente, gracias por validar! Nuestro equipo de soporte ya cuenta con tus respuestas y se acercará a revisar el nodo ${nodo}.`
      ];
    }
    if (sub.includes('MASIVA')) {
      return [
        `🚨 ¡ALERTA DE PRIORIDAD! Folio #${folio} registrado para ${campana} (Nodos: ${nodo}).\nNos vamos a acercar de inmediato con tu campaña para revisar la falla. Mientras llegamos, confírmanos (Pregunta 1 de 3):\n👉 ¿Aproximadamente cuántos agentes fueron afectados?`,
        `Enterado. Pregunta 2 de 3:\n👉 ¿Qué es lo que les aparece exactamente en pantalla?`,
        `Gracias. Última pregunta (3 de 3):\n👉 ¿En otras páginas tienen acceso normal o están sin conexión?`,
        `✅ ¡Información recibida! Ya vamos en camino con tu campaña (${campana}) para apoyarlos.`
      ];
    }
    if (sub.includes('FOLIO DE SOPORTE')) {
      return [
        `✅ Folio #${folio} registrado exitosamente para ${nodo} (${campana}) como antecedente e historial de que hubo una falla (ya solucionada al abrir Touchpoint en otro navegador o reiniciar el equipo). Si vuelve a presentarse hoy, escríbenos por aquí para acercarnos.`
      ];
    }
  }

  // --- CATEGORÍA: DISPOSITIVOS ---
  if (cat.includes('DISPOSITIVO') || cat.includes('HARDWARE')) {
    
    // SI NO ES LA PRIMERA VEZ EN EL MES (Ya tiene un reporte previo de este dispositivo en el mismo nodo):
    if (folioAnteriorMes) {
      const nombreDispositivo = elem ? `${sub} (${elem})` : (sub || 'DISPOSITIVO');
      return [
        `🛡️ Folio #${folio} recibido para ${nodo} (${campana}).\nValidamos en el sistema que este componente (${nombreDispositivo}) ya cuenta con un reporte previo en el mes (Folio origen: #${folioAnteriorMes}).\nMientras validamos tu solicitud, confírmanos:\n👉 ¿Ya generaste el Reporte Centinela correspondiente para este dispositivo?`,
        `✅ Gracias por confirmar. Validamos que un técnico ya se acercó previamente a realizar pruebas en ${nodo} (Folio origen: #${folioAnteriorMes}). Te agradecemos que lo sigas reportando en el apartado de Centinela para que tu campaña llegue al 100% y se hagan los cambios solicitados.`
      ];
    }

    // SI ES LA PRIMERA VEZ EN EL MES (Flujo normal de revisión y mantenimiento):
    if (sub.includes('DIADEMA')) {
      return [
        `🎧 Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de diadema.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿El problema es de audio/micrófono (se escucha bajo, estática o falso contacto) o requiere ajuste de configuración en la PC?\n*(Nota: Si la diadema está rota y requiere cambio físico por stock, recuerda registrarla como Reporte Centinela).*`,
        `Entendido. Última validación (2 de 2):\n👉 ¿Ya verificaste que el botón del control del cable no esté en 'Mute' (luz roja) y que el volumen de Windows esté arriba del 80%?`,
        `✅ ¡Listo! Gracias por confirmar. Un técnico se acercará a ${nodo} para realizar las pruebas y el mantenimiento necesario.`
      ];
    }
    if (sub.includes('TECLADO')) {
      return [
        `⌨️ Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de teclado.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿Presenta teclas duras o trabadas que requieran limpieza y mantenimiento, o dejó de escribir por completo?`,
        `Gracias. Segunda validación (2 de 2):\n👉 ¿Enciende el foquito de 'Bloq Num' arriba a la derecha del teclado o está totalmente apagado?\n*(Nota: Si requiere reemplazo por desgaste de teclas o daño total, recuerda levantar también su Reporte Centinela).*`,
        `✅ ¡Perfecto! Nuestro técnico se acercará a tu lugar (${nodo}) para revisar la conexión y darle mantenimiento al teclado.`
      ];
    }
    if (sub.includes('MOUSE')) {
      return [
        `🖱️ Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de mouse.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿El puntero brinca/se traba al moverlo (limpieza de sensor) o sientes que algún clic o la ruedita (scroll) se queda atorado?`,
        `De acuerdo. Pregunta 2 de 2:\n👉 ¿La luz roja debajo del mouse sigue encendida de forma continua o se apaga al mover el cable?`,
        `✅ ¡Gracias por confirmar! En breve se acerca un técnico a ${nodo} para darle limpieza y mantenimiento al mouse.`
      ];
    }
    if (sub.includes('RENDIMIENTO') || sub.includes('CPU')) {
      if (elem.includes('DISCO')) {
        return [
          `💽 Folio #${folio} (${nodo} - ${campana}). Reporte de mantenimiento de Disco Duro recibido.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿El equipo muestra alerta de 'Espacio lleno' (requiere depuración de archivos temporales) o tarda demasiado en iniciar Windows?`,
          `Gracias por el dato (Pregunta 2 de 2):\n👉 ¿El equipo sigue encendido ahorita dentro de sesión o marcó algún error en pantalla negra/azul? (Por favor no lo apagues forzosamente).`,
          `✅ ¡Enterado! Un técnico se acercará a ${nodo} para realizar la limpieza de espacio y optimización del disco.`
        ];
      }
      if (elem.includes('RAM') || elem.includes('MEMORIA')) {
        return [
          `⚡ Folio #${folio} (${nodo} - ${campana}). Reporte de optimización de Memoria RAM / Lentitud.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿Ya intentaste cerrar ventanas que no estés ocupando y reiniciar el equipo una vez para liberar memoria?`,
          `Entendido. Pregunta 2 de 2:\n👉 ¿El equipo se congela al usar alguna aplicación en específico o requiere revisión física porque no da video al encender?`,
          `✅ ¡Perfecto! Ya tenemos el diagnóstico para acercarnos a ${nodo} a optimizar y dar mantenimiento al equipo.`
        ];
      }
      if (elem.includes('FORMATEO')) {
        return [
          `💿 Folio #${folio} (${nodo} - ${campana}). Solicitud de Formateo / Mantenimiento de Sistema.\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿Hay algún archivo o carpeta importante en Escritorio o Documentos que debamos respaldar antes de reinstalar el sistema?`,
          `De acuerdo. Última pregunta (2 de 2):\n👉 ¿La posición ${nodo} ya se encuentra libre en este momento para que podamos trabajar en el equipo?`,
          `✅ ¡Excelente! Nuestro técnico se acercará a ${nodo} para realizar el respaldo y mantenimiento del sistema.`
        ];
      }
      return [
        `🖥️ Folio #${folio} registrado para mantenimiento de CPU en ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿Ya intentaste reiniciar el equipo una vez? Cuéntanos por aquí qué síntoma presenta para ir preparados.`,
        `✅ ¡Gracias por la información! Un técnico se acercará a revisar y dar mantenimiento al nodo ${nodo}.`
      ];
    }
  }

  // Flujo por defecto
  return [
    `Folio #${folio} registrado con éxito para ${nodo} (${campana}). Se te asignará un técnico en un tiempo máximo de 10 minutos.`
  ];
};

// 3. EVALUADOR DE SEGUIMIENTO SUBSECUENTE EN EL CHAT
// Devuelve { textoRespuesta, cerrarTicket }
const evaluarSiguienteRespuestaChat = (ticket, remitente, textoUsuario, mensajesDelSistema, folioAnteriorMes = null) => {
  const esCreador = ticket.creador && remitente.toLowerCase().trim() === ticket.creador.toLowerCase().trim();
  const sinTecnicoAun = !ticket.tecnico || ticket.tecnico === 'Sin Asignar';

  if (ticket.tipo_solicitud === 'CENTINELA' || (!esCreador && !sinTecnicoAun)) {
    return null;
  }

  const cat = (ticket.categoria || '').toUpperCase();
  const esDispositivo = cat.includes('DISPOSITIVO') || cat.includes('HARDWARE');
  const textoLower = (textoUsuario || '').toLowerCase();

  // CASO ESPECIAL: Es un Dispositivo que YA tenía folio previo en el mes (2da vez o más)
  if (esDispositivo && folioAnteriorMes) {
    if (mensajesDelSistema === 1) {
      const dijoQueNo = textoLower.includes('no') || textoLower.includes('aun') || textoLower.includes('aún') || textoLower.includes('todavia') || textoLower.includes('todavía');
      
      if (dijoQueNo) {
        return {
          textoRespuesta: `🛡️ Te invitamos a generar tu Reporte Centinela desde el Asistente Guiado para este nodo (${ticket.equipo}). Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnteriorMes}). Te agradecemos que lo sigas reportando en Centinela para que tu campaña llegue al 100% y se hagan los cambios solicitados.`,
          cerrarTicket: true
        };
      }
      return {
        textoRespuesta: `✅ ¡Perfecto! Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnteriorMes}). Te agradecemos que lo sigas reportando en Centinela para que tu campaña llegue al 100% y se hagan los cambios solicitados.`,
        cerrarTicket: true
      };
    }
    return null;
  }

  // FLUJO NORMAL (Primera vez en el mes o categoría Touchpoint)
  const flujoPreguntas = obtenerFlujoPreguntas(ticket, null);
  if (flujoPreguntas.length <= 1) {
    return null;
  }

  const yaSeSoluciono = textoLower.includes('ya quedo') || 
                        textoLower.includes('ya quedó') || 
                        textoLower.includes('ya funciono') || 
                        textoLower.includes('ya funcionó') || 
                        textoLower.includes('solucionado');

  if (yaSeSoluciono && mensajesDelSistema < flujoPreguntas.length) {
    return {
      textoRespuesta: `🎉 ¡Excelente! Qué gusto que ya haya quedado funcionando correctamente con esa validación. Un técnico revisará el folio #${ticket.folio} para confirmar el cierre.`,
      cerrarTicket: false
    };
  }

  if (mensajesDelSistema < flujoPreguntas.length) {
    return {
      textoRespuesta: flujoPreguntas[mensajesDelSistema],
      cerrarTicket: false
    };
  }

  return null;
};

module.exports = {
  obtenerMensajeCentinela,
  obtenerFlujoPreguntas,
  evaluarSiguienteRespuestaChat
};
