// Archivo: respuestasChat.cjs

// 1. GENERADOR DE MENSAJES PARA CENTINELA (Primer reporte vs Subsecuente en el mes)
const obtenerMensajeCentinela = (nuevoFolio, esSubsecuente, folioAnterior) => {
  if (esSubsecuente) {
    return `Gracias por crear tu centinela con el folio #${nuevoFolio}. Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnterior}). Te agradecemos que lo sigas reportando para que tu campaña llegue al 100% y se hagan los cambios solicitados.`;
  }
  return `Folio #${nuevoFolio} registrado con éxito. Se te asignará un técnico en un tiempo máximo de 10 minutos.`;
};

// 2. FLUJO SECUENCIAL DE PREGUNTAS AUTOMÁTICAS EN EL CHAT (PASO 1 -> PASO 2 -> PASO 3)
const obtenerFlujoPreguntas = (ticket) => {
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
        `🎧 ¡Hola! Folio #${folio} registrado para el nodo ${nodo} (${campana}).\nEn lo que se acerca un técnico, ayúdanos con esta validación rápida (Pregunta 1 de 3):\n👉 ¿Ya probaste desconectar y volver a conectar la diadema en otro puerto USB de tu mismo CPU?`,
        `Gracias por confirmar. Vamos con la validación 2 de 3:\n👉 Si miras el ícono de bocina de Windows (abajo a la derecha junto al reloj), ¿aparece reconocida la diadema USB o marca una 'X' roja?`,
        `Entendido. Última validación (3 de 3):\n👉 ¿Ya intentaste cerrar Touchpoint por completo y volver a abrirlo (o reiniciar el equipo) asegurándote de que la diadema ya esté bien conectada antes de abrirlo?`,
        `✅ ¡Muchas gracias por tus respuestas! Con este diagnóstico nuestro técnico de TI ya sabe exactamente qué revisar y se acercará a tu posición (${nodo}) en breve.`
      ];
    }
    if (sub.includes('ÚNICA') || sub.includes('UNICA')) {
      return [
        `🔌 Folio #${folio} recibido para ${nodo} (${campana}).\nPara agilizar tu soporte, ayúdanos con esta validación (Pregunta 1 de 3):\n👉 ¿Ya intentaste abrir la sesión de Touchpoint en otro navegador (ej. Chrome o Edge) o en una ventana nueva?`,
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
    if (sub.includes('DIADEMA')) {
      return [
        `🎧 Folio #${folio} registrado en ${nodo} (${campana}).\nPara saber si llevamos cambio de diadema de una vez, confírmanos (Pregunta 1 de 2):\n👉 ¿La diadema presenta algún daño físico visible (cable pelado, micrófono roto o sin almohadilla) o es falso contacto?`,
        `Entendido. Última validación (2 de 2):\n👉 ¿Ya verificaste que el botón del control de la diadema no esté en 'Mute' (color rojo) y probaste conectarla en otro puerto USB de tu CPU?`,
        `✅ ¡Listo! Gracias por el dato, el técnico asignado ya lleva el material necesario hacia ${nodo}.`
      ];
    }
    if (sub.includes('TECLADO')) {
      return [
        `⌨️ Folio #${folio} registrado en ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos (Pregunta 1 de 2):\n👉 ¿El teclado no enciende ninguna luz (posible falso atrás del CPU) o son teclas específicas las que están duras / borradas?`,
        `Gracias. Segunda validación (2 de 2):\n👉 Si cambias el cable del teclado a otro puerto USB disponible del mismo CPU, ¿reacciona?`,
        `✅ ¡Perfecto! Tomamos nota para llevar el equipo necesario a tu lugar (${nodo}).`
      ];
    }
    if (sub.includes('MOUSE')) {
      return [
        `🖱️ Folio #${folio} registrado en ${nodo} (${campana}).\nConfírmanos rápido por aquí (Pregunta 1 de 2):\n👉 ¿Enciende la luz roja debajo del mouse o está totalmente apagado?`,
        `De acuerdo. Pregunta 2 de 2:\n👉 ¿El fallo es en los botones de clic, la ruedita (scroll) o el cursor se traba en pantalla?`,
        `✅ ¡Gracias por confirmar! En breve se acerca un técnico a ${nodo} para apoyarte.`
      ];
    }
    if (sub.includes('RENDIMIENTO') || sub.includes('CPU')) {
      if (elem.includes('DISCO')) {
        return [
          `💽 Folio #${folio} (${nodo} - ${campana}). Reporte de Disco Duro recibido (Pregunta 1 de 2):\n👉 ¿El equipo muestra aviso de 'Espacio lleno', tarda demasiado en iniciar o da error al leer archivos?`,
          `Gracias por el dato (Pregunta 2 de 2):\n👉 ¿El equipo sigue encendido ahorita en Windows o se quedó en pantalla negra/azul? (Por favor no lo apagues forzosamente).`,
          `✅ ¡Enterado! Un técnico de soporte se acercará a ${nodo} para revisar la unidad de almacenamiento.`
        ];
      }
      if (elem.includes('RAM') || elem.includes('MEMORIA')) {
        return [
          `⚡ Folio #${folio} (${nodo} - ${campana}). Reporte de Memoria RAM / Lentitud (Pregunta 1 de 2):\n👉 ¿Ya intentaste cerrar pestañas innecesarias del navegador y reiniciar el equipo una vez?`,
          `Entendido. Pregunta 2 de 2:\n👉 ¿Con qué programa o página en específico sientes que el equipo se congela más?`,
          `✅ ¡Perfecto! Ya tenemos el reporte completo para revisar el rendimiento de ${nodo}.`
        ];
      }
      if (elem.includes('FORMATEO')) {
        return [
          `💿 Folio #${folio} (${nodo} - ${campana}). Solicitud de Formateo registrada (Pregunta 1 de 2):\n👉 ¿Hay algún archivo o carpeta importante en Escritorio o Documentos que debamos respaldar antes de reinstalar el sistema?`,
          `De acuerdo. Última pregunta (2 de 2):\n👉 ¿La posición ${nodo} ya se encuentra libre en este momento para que podamos proceder con el formateo del equipo?`,
          `✅ ¡Excelente! Nuestro técnico se acercará a ${nodo} para realizar el formateo.`
        ];
      }
      return [
        `🖥️ Folio #${folio} registrado para revisión de CPU en ${nodo} (${campana}).\n👉 ¿Ya intentaste reiniciar el equipo una vez? Cuéntanos por aquí qué síntoma principal presenta.`,
        `✅ ¡Gracias por la información! Un técnico se acercará a revisar el nodo ${nodo}.`
      ];
    }
  }

  // --- AQUÍ PUEDES AGREGAR MÁS CATEGORÍAS EN EL FUTURO ---

  // Flujo por defecto
  return [
    `Folio #${folio} registrado con éxito para ${nodo} (${campana}). Se te asignará un técnico en un tiempo máximo de 10 minutos.`
  ];
};

// 3. EVALUADOR DE SEGUIMIENTO SUBSECUENTE EN EL CHAT
const evaluarSiguienteRespuestaChat = (ticket, remitente, textoUsuario, mensajesDelSistema) => {
  // No responder automáticamente si es Centinela o si ya no es el usuario/sin técnico
  const esCreador = ticket.creador && remitente.toLowerCase().trim() === ticket.creador.toLowerCase().trim();
  const sinTecnicoAun = !ticket.tecnico || ticket.tecnico === 'Sin Asignar';

  if (ticket.tipo_solicitud === 'CENTINELA' || (!esCreador && !sinTecnicoAun)) {
    return null;
  }

  const flujoPreguntas = obtenerFlujoPreguntas(ticket);
  if (flujoPreguntas.length <= 1) {
    return null;
  }

  const textoLower = (textoUsuario || '').toLowerCase();
  const yaSeSoluciono = textoLower.includes('ya quedo') || 
                        textoLower.includes('ya quedó') || 
                        textoLower.includes('ya funciono') || 
                        textoLower.includes('ya funcionó') || 
                        textoLower.includes('solucionado');

  // Si el usuario avisa que ya quedó resuelto antes de terminar las preguntas
  if (yaSeSoluciono && mensajesDelSistema < flujoPreguntas.length) {
    return `🎉 ¡Excelente! Qué gusto que ya haya quedado funcionando correctamente con esa validación. Un técnico revisará el folio #${ticket.folio} para confirmar el cierre.`;
  }

  // Si aún faltan preguntas del flujo por enviar, devolvemos la que toca
  if (mensajesDelSistema < flujoPreguntas.length) {
    return flujoPreguntas[mensajesDelSistema];
  }

  return null;
};

module.exports = {
  obtenerMensajeCentinela,
  obtenerFlujoPreguntas,
  evaluarSiguienteRespuestaChat
};
