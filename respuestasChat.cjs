// Archivo: respuestasChat.cjs

// Helper para empaquetar texto + botones interactivos para LiveChatView.jsx
const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const armarMensajeConOpciones = (texto, listaOpciones = []) => {
  if (!listaOpciones || listaOpciones.length === 0) return texto;
  return `${texto}\n[[OPCIONES:${listaOpciones.join('|')}]]`;
};

// 1. GENERADOR DE MENSAJES PARA MODALIDAD CENTINELA DIRECTA
// Texto de cierre de un reporte Centinela repetido: retoma la solución dada en el primer folio de esa falla.
const armarResolucionCentinela = (folioAnterior, resolucionAnterior) => {
  const solucion = String(resolucionAnterior || '').trim();
  if (solucion) {
    return `Falla ya atendida: se reportó antes en el folio #${folioAnterior}. Solución aplicada en ese folio: ${solucion} Ya se validó con esa solución. Se sigue registrando el reporte para el cumplimiento de Centinela.`;
  }
  return `Falla ya reportada en el folio #${folioAnterior}, que sigue en atención. Este reporte se registra para el cumplimiento de Centinela y el seguimiento continúa en ese folio.`;
};

const obtenerMensajeCentinela = (nuevoFolio, esSubsecuente, folioAnterior, resolucionAnterior = '') => {
  if (esSubsecuente) {
    const solucion = String(resolucionAnterior || '').trim();
    const detalle = solucion
      ? `Un técnico ya atendió esta falla (Folio origen: #${folioAnterior}). Solución aplicada: ${solucion} Ya se validó con esa solución.`
      : `Un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnterior}).`;
    return `Gracias por crear tu centinela con el folio #${nuevoFolio}. ${detalle} Te agradecemos que lo sigas reportando para que tu campaña llegue al 100% y se hagan los cambios solicitados.`;
  }
  return `🛡️ Folio Centinela #${nuevoFolio} registrado con éxito para solicitud de cambio de periférico. Un técnico tomará tu reporte en breve para validar el componente.`;
};

// 2. MENSAJE INICIAL CON LAS 3 OPCIONES PRINCIPALES AL CREAR EL TICKET
const obtenerFlujoPreguntas = (ticket, folioAnteriorMes = null) => {
  const folio = ticket.folio;
  const nodo = ticket.equipo && ticket.equipo !== 'Ninguno' ? ticket.equipo : 'tu equipo';
  const campana = ticket.campana || 'General';
  const cat = (ticket.categoria || '').toUpperCase();
  const sub = (ticket.subcategoria || '').toUpperCase();
  const elem = (ticket.elemento || '').toUpperCase();

  // ==========================================================================
  // CATEGORÍA: TOUCHPOINT
  // ==========================================================================
  if (cat.includes('TOUCHPOINT')) {
    if (sub.includes('AUDIO')) {
      return [
        armarMensajeConOpciones(
          `🎧 ¡Hola! Folio #${folio} registrado para el nodo ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos seleccionando cuál de estas opciones describe el problema de audio:`,
          [
            `🔇 No me escucha el cliente (Problema con mi micrófono)`,
            `🔈 No escucho al cliente (Problema con mis bocinas / audífonos)`,
            `❌ Touchpoint no detecta la diadema (Error de reconocimiento)`
          ]
        )
      ];
    }

    if (sub.includes('ÚNICA') || sub.includes('UNICA')) {
      return [
        armarMensajeConOpciones(
          `🔌 Folio #${folio} recibido para ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos seleccionando qué ocurre exactamente en la posición:`,
          [
            `🔄 El sistema saca al agente de sesión repentinamente`,
            `🌐 La plataforma de Touchpoint no carga o se queda en pantalla blanca`,
            `🔌 El equipo pierde red o se desconoce el motivo principal`
          ]
        )
      ];
    }

    if (sub.includes('MASIVA')) {
      return [
        armarMensajeConOpciones(
          `🚨 ¡ALERTA DE PRIORIDAD! Folio #${folio} registrado para ${campana} (Nodos: ${nodo}).\nNos vamos a acercar de inmediato con tu campaña. Mientras llegamos, confírmanos el alcance seleccionando una opción:`,
          [
            `👥 Afecta únicamente a un grupo reducido (de 2 a 5 posiciones juntas)`,
            `🏢 Toda la campaña o isla completa se quedó sin servicio al mismo tiempo`,
            `🌐 Se cayó la red por completo (Sin acceso a herramientas ni internet)`
          ]
        )
      ];
    }

    if (sub.includes('FOLIO DE SOPORTE')) {
      return [
        armarMensajeConOpciones(
          `✅ Folio #${folio} registrado exitosamente para ${nodo} (${campana}) como antecedente e historial de que hubo una falla (ya solucionada al abrir Touchpoint en otro navegador o reiniciar el equipo).
Confírmanos cómo sigue la posición:`,
          [
            `🔁 La falla volvió a presentarse y necesito que se acerquen`,
            `📝 Ya quedó resuelta, solo quiero dejar el registro`
          ]
        )
      ];
    }
  }

  // ==========================================================================
  // CATEGORÍA: DISPOSITIVOS
  // ==========================================================================
  if (cat.includes('DISPOSITIVO') || cat.includes('HARDWARE')) {
    
    // SI NO ES LA PRIMERA VEZ EN EL MES (Ya existe un folio previo de este nodo y dispositivo)
    if (folioAnteriorMes) {
      const nombreDispositivo = elem ? `${sub} (${elem})` : (sub || 'DISPOSITIVO');
      return [
        armarMensajeConOpciones(
          `🛡️ Folio #${folio} recibido para ${nodo} (${campana}).\nValidamos en el sistema que este componente (${nombreDispositivo}) ya cuenta con un reporte previo en el mes (Folio origen: #${folioAnteriorMes}).\nMientras validamos tu solicitud, confírmanos:`,
          [
            `✅ Sí, ya generé su Reporte Centinela`,
            `❌ Aún no genero el Reporte Centinela`
          ]
        )
      ];
    }

    // SI ES LA PRIMERA VEZ EN EL MES:
    if (sub.includes('DIADEMA')) {
      return [
        armarMensajeConOpciones(
          `🎧 Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de diadema.\nMientras el técnico se acerca, confírmanos seleccionando qué síntoma presenta:`,
          [
            `🔊 El audio o micrófono se escucha muy bajo o con interferencia`,
            `🛑 El botón 'Mute' o los controles físicos no responden`,
            `❌ La diadema no emite ningún sonido o requiere revisión general`
          ]
        )
      ];
    }

    if (sub.includes('TECLADO')) {
      return [
        armarMensajeConOpciones(
          `⌨️ Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de teclado.\nMientras el técnico se acerca, confírmanos seleccionando qué detalle presenta:`,
          [
            `🧹 Teclas duras, trabadas o que se atoran al escribir`,
            `🔌 El teclado dejó de responder por completo o no enciende`,
            `⚡ Se presionan teclas solas o escribe caracteres extraños`
          ]
        )
      ];
    }

    if (sub.includes('MOUSE')) {
      return [
        armarMensajeConOpciones(
          `🖱️ Folio #${folio} registrado en ${nodo} (${campana}) para revisión/mantenimiento de mouse.\nMientras el técnico se acerca, confírmanos seleccionando qué comportamiento notas:`,
          [
            `🎯 El puntero brinca, se traba o no se mueve con fluidez`,
            `🖱️ Los botones de clic (izquierdo/derecho) o la ruedita fallan`,
            `🔌 El mouse está totalmente apagado o pierde conexión`
          ]
        )
      ];
    }

    if (sub.includes('RENDIMIENTO') || sub.includes('CPU')) {
      if (elem.includes('DISCO')) {
        return [
          armarMensajeConOpciones(
            `💽 Folio #${folio} (${nodo} - ${campana}). Reporte de mantenimiento de Disco Duro recibido.\nMientras el técnico se acerca, confírmanos seleccionando qué síntoma presenta el equipo:`,
            [
              `📂 El equipo muestra constantemente avisos de 'Poco espacio disponible en disco C:'`,
              `⏳ Las aplicaciones tardan varios minutos en abrir o al encender la PC se queda pasmada`,
              `⚠️ El sistema operativo lanzó un mensaje de advertencia sobre la unidad de almacenamiento`
            ]
          )
        ];
      }

      if (elem.includes('RAM') || elem.includes('MEMORIA')) {
        return [
          armarMensajeConOpciones(
            `⚡ Folio #${folio} (${nodo} - ${campana}). Reporte de optimización de Memoria RAM / Lentitud.\nMientras el técnico se acerca, confírmanos seleccionando qué comportamiento notas:`,
            [
              `🌐 El equipo se congela por completo al abrir pestañas del navegador o herramientas de trabajo simultáneas`,
              `🔄 La PC se reinicia de la nada o arroja pantallas de error repentinas ('Pantalla Azul')`,
              `📊 Al abrir el Administrador de Tareas el uso de la memoria se mantiene al 100% permanente`
            ]
          )
        ];
      }

      if (elem.includes('FORMATEO')) {
        return [
          armarMensajeConOpciones(
            `💿 Folio #${folio} (${nodo} - ${campana}). Solicitud de Formateo / Mantenimiento de Sistema.\nMientras el técnico se acerca, confírmanos seleccionando el estado de la posición:`,
            [
              `🗂️ Requerimos respaldar manuales, plantillas o archivos importantes ubicados en Escritorio antes de iniciar`,
              `🦠 El equipo presenta lentitud extrema por posibles conflictos de software que ya no se quitan con limpieza`,
              `🕒 Ya validamos que la posición se encuentre desocupada para que el técnico pueda trabajar sin afectar la operación`
            ]
          )
        ];
      }

      // Si entró a Rendimiento CPU general sin elemento específico, le damos las 3 ramas principales
      return [
        armarMensajeConOpciones(
          `🖥️ Folio #${folio} registrado para mantenimiento de CPU en ${nodo} (${campana}).\nMientras el técnico se acerca, confírmanos qué área requiere atención:`,
          [
            `💽 Disco Duro / Almacenamiento (Espacio lleno o lentitud de lectura)`,
            `⚡ Memoria RAM / Congelamientos por exceso de procesos`,
            `💿 Formateo / Reinstalación limpia de Sistema Operativo`
          ]
        )
      ];
    }
  }

  return [
    `Folio #${folio} registrado con éxito para ${nodo} (${campana}). Un técnico tomará tu solicitud en breve; puedes seguir el avance en este chat.`
  ];
};

// ============================================================================
// CONSEJOS CONCRETOS (paso 3): según el botón que eligió el cliente en el paso 2.
// Cada consejo es algo que el agente puede intentar sin permisos especiales mientras llega el técnico.
// ============================================================================
const NOTA_CENTINELA = '\n\n🛡️ *Nota importante: cuando un periférico tiene daño físico definitivo, el cambio se gestiona mediante Reporte Centinela desde el Asistente Guiado.*';
const CONSEJOS_ESPECIFICOS = [
  // ----- TOUCHPOINT: AUDIO -----
  { si: ['enciende sus luces', 'mover un poco el cable', 'navegador y el equipo por completo'], tip: 'Conecta la diadema en un puerto USB de la parte trasera del CPU, cierra Touchpoint y ábrelo de nuevo. Cuando el navegador pida permiso para usar el micrófono elige «Permitir»; si ya lo habías bloqueado, haz clic en el candado junto a la dirección, actívalo y recarga la página. Evita mover el cable durante una llamada.' },
  // ----- TOUCHPOINT: SESIÓN ÚNICA -----
  { si: ['aleatoria', 'entra una llamada'], tip: 'Cierra las pestañas y programas que no uses y confirma que tu usuario de Touchpoint no esté abierto en otro equipo. Si se vuelve a caer, anota la hora exacta: con ese dato el técnico ubica la causa mucho más rápido.' },
  { si: ['se congela por unos segundos', 'pantalla de cierre'], tip: 'Presiona CTRL + SHIFT + R para una recarga limpia y revisa que el cable de red esté firme. Si vuelve a ocurrir, anota la hora exacta y si ya había una llamada en curso.' },
  { si: ['unicamente le pasa a este agente', 'otra posicion de la isla'], tip: 'Como solo le ocurre a este agente, el técnico revisará su perfil y su navegador. Mientras llega, cierra sesión, borra la caché (CTRL + SHIFT + SUPR) y vuelve a entrar.' },
  { si: ['mensaje de error de conexion', 'certificado', 'sitio no disponible'], tip: 'Revisa que la fecha y la hora de Windows sean correctas (un reloj desajustado provoca errores de certificado), cierra el navegador por completo y ábrelo de nuevo. Anota el texto exacto del error.' },
  { si: ['otro navegador'], tip: 'Si falla igual en Edge y en Chrome, lo más probable es la red o el servicio y no el equipo; no reinstales nada. El técnico revisará la conexión de la posición.' },
  // ----- TOUCHPOINT: CAÍDA MASIVA -----
  { si: ['misma linea', 'bloque de escritorios'], tip: 'No desconectes ni muevas cables. Anota qué posiciones del bloque están afectadas: si comparten el mismo switch o cable, el técnico lo ubica de inmediato.' },
  { si: ['diferentes lugares', 'misma campana'], tip: 'Pide a tu supervisor la lista de agentes afectados y la hora en que empezó. Si están dispersos, la causa suele estar en el servicio y no en el cableado.' },
  { si: ['limpiar o mover', 'escritorios se cayeron'], tip: 'Revisa sin jalar que los cables de red de esas posiciones estén firmes en el CPU y en la pared, y avísanos qué posiciones recuperaron conexión.' },
  { si: ['expulsion de sesion', 'simultanea'], tip: 'Mantén el chat abierto y no reinicies los equipos: así el técnico revisa el estado actual. Anota la hora exacta en que todos perdieron sesión.' },
  { si: ['siguen con energia', 'ningun navegador abre'], tip: 'No reinicies los equipos todavía. Confirma con tu supervisor si hay otras campañas afectadas y dinos la hora en que empezó la falla.' },
  { si: ['otras campanas vecinas', 'operan con normalidad'], tip: 'Gracias, ese dato ayuda a acotar el alcance a tu campaña. Mantén el chat abierto y avísanos si más posiciones se ven afectadas.' },
  { si: ['ninguna pagina web'], tip: 'Revisa que los cables de red estén firmes y avísanos si el foquito de red del CPU está apagado. No reinicies todos los equipos a la vez.' },
  { si: ['mensajeria', 'herramientas complementarias'], tip: 'Si también fallan las herramientas complementarias, el problema es de conectividad y no de una sola aplicación. Mantén el chat abierto y avísanos si algo regresa.' },
  { si: ['parpadeo o corte general', 'energia electrica'], tip: 'Un corte de energía puede apagar los switches de la zona. Revisa que no haya equipos de red apagados o con luces extrañas, sin tocar cables, y avísanos.' },
  // ----- DIADEMA -----
  { si: ['muy lejano o debil'], tip: 'Acerca el micrófono de la diadema a unos 2 dedos de tu boca y revisa en Windows (Configuración > Sonido > Entrada) que el nivel del micrófono esté alto y la diadema sea el dispositivo seleccionado.' },
  { si: ['se corta por completo', 'mueva ligeramente el cable', 'muevo ligeramente el cable'], tip: 'Deja de mover el cable: ese comportamiento indica un falso contacto. Conéctala en un puerto USB de la parte trasera del CPU para trabajar mientras llega el técnico.' + NOTA_CENTINELA },
  { si: ['indicador de silencio', 'parpadeando o en rojo'], tip: 'Presiona una vez el botón de silencio del control y revisa que Touchpoint no tenga el micrófono silenciado (ícono del micrófono tachado). Si el foco sigue rojo, avísanos.' },
  { si: ['subir/bajar volumen', 'no ejecutan ninguna accion'], tip: 'Mientras llega el técnico, ajusta el volumen desde el ícono de bocina de la barra de tareas de Windows. Los botones del control no afectan la llamada si el audio se escucha bien.' },
  { si: ['control en linea', 'caliente'], tip: 'Si el control se siente caliente, desconéctalo y no lo uses. Avísanos por aquí para que el técnico lo revise.' },
  { si: ['windows no reconoce'], tip: 'Desconecta la diadema, espera 5 segundos y conéctala en un puerto USB trasero. Luego abre Configuración > Sonido y elige la diadema como dispositivo de entrada y de salida.' },
  { si: ['otro puerto usb', 'sigue sin detectarla', 'sigue sin dar senal'], tip: 'No sigas probando puertos. El técnico revisará con otro dispositivo para descartar si la falla es del equipo o del periférico.' },
  // ----- TECLADO -----
  { si: ['letra aparece repetida', 'aaaaaa'], tip: 'Desconecta y vuelve a conectar el teclado en otro puerto USB. Si sigue repitiendo teclas, deja de usarlo y avísanos: puede tener una tecla trabada.' },
  { si: ['comandos extranos', 'ventanas secundarias'], tip: 'Presiona una por una las teclas Windows, Ctrl, Alt y Shift: a veces una queda atorada y activa comandos sin querer. Si sigue pasando, avísanos.' },
  { si: ['incidente de liquidos', 'liquidos'], tip: '⚠️ Desconecta el teclado de inmediato, no lo agites ni lo sigas usando. Avísanos por aquí y el técnico lo revisará para evitar daños en el equipo.' },
  { si: ['barra espaciadora', 'enter se inclinan'], tip: 'No fuerces la tecla ni la quites. Si la barra o el ENTER quedan flojos, se gestionará su cambio con el técnico.' + NOTA_CENTINELA },
  { si: ['ninguna tecla funciona'], tip: 'Desconecta el teclado y conéctalo en un puerto USB de la parte trasera del CPU. Si sigue sin responder en ningún programa, avísanos: el técnico lo reemplazará o lo probará con otro.' },
  // ----- MOUSE -----
  { si: ['cursor se congela', 'errática', 'erratica'], tip: 'Limpia con un paño seco la parte de abajo del mouse (el sensor óptico) y úsalo sobre una superficie lisa y mate, como una alfombrilla limpia.' },
  { si: ['salta hacia las esquinas'], tip: 'Ese salto suele deberse a una superficie con brillo o reflejo. Prueba el mouse sobre una alfombrilla o una hoja blanca mate.' },
  { si: ['pesado', 'raspa'], tip: 'Limpia la alfombrilla y la base del mouse con un paño seco. Si sigue raspando, el técnico revisará el mouse.' },
  { si: ['ruedita', 'scroll'], tip: 'Recarga la página (F5) y prueba la ruedita en otra aplicación. Si solo falla en una, es de esa aplicación y no del mouse.' },
  { si: ['izquierdo se siente flojo', 'sonido de clic'], tip: 'Evita presionar con fuerza el botón. Cuando el mecanismo ya está desgastado, el cambio se gestiona con el técnico.' + NOTA_CENTINELA },
  { si: ['luz roja optica', 'totalmente apagada'], tip: 'Conecta el mouse en un puerto USB de la parte trasera del CPU. Si sigue sin encender la luz roja, el técnico lo cambiará o lo probará con otro.' },
  // ----- RENDIMIENTO CPU: DISCO -----
  { si: ['poco espacio disponible'], tip: 'Vacía la Papelera de reciclaje y cierra los programas que no uses. No borres carpetas del sistema ni archivos de trabajo que no reconozcas; el técnico liberará espacio de forma segura.' },
  { si: ['tardan varios minutos', 'se queda pasmada'], tip: 'Si no estás en llamada, usa Inicio > Reiniciar (no Apagar) para limpiar procesos. Si al volver sigue lenta, avísanos.' },
  // ----- RENDIMIENTO CPU: RAM Y FORMATEO -----
  { si: ['se congela por completo al abrir pestanas'], tip: 'Cierra las pestañas y programas que no necesites; deja abiertas solo Touchpoint y tus herramientas de trabajo.' },
  { si: ['se reinicia de la nada', 'pantalla azul'], tip: 'Si vuelve a aparecer una pantalla azul, anota el código de error que muestra (por ejemplo, el texto en mayúsculas). Ayuda mucho al técnico.' },
  { si: ['administrador de tareas', 'se mantiene al 100'], tip: 'Presiona CTRL + SHIFT + ESC, abre la pestaña de Procesos, ordena por Memoria y anota qué aplicación consume más. Dinos cuál es.' },
  { si: ['respaldar manuales', 'plantillas'], tip: 'Mientras llega el técnico, avísanos por aquí qué archivos necesitas conservar y dónde están guardados, para que no se pierdan al dar mantenimiento.' },
  { si: ['conflictos de software'], tip: 'No instales ni desinstales programas por tu cuenta. El técnico revisará qué software provoca el conflicto.' },
  { si: ['posicion se encuentre desocupada'], tip: 'Perfecto. Cuando llegue el técnico, confirma con tu supervisor que la posición puede quedar fuera de operación el tiempo necesario.' }
];
const buscarConsejoEspecifico = (textoNormalizado) => {
  const hallado = CONSEJOS_ESPECIFICOS.find(c => c.si.some(f => textoNormalizado.includes(f)));
  return hallado ? hallado.tip : null;
};

// ============================================================================
// 3. EVALUADOR DEL ÁRBOL DE RESPUESTAS (Sub-opciones de 2do nivel y Cierre)
// ============================================================================
const evaluarSiguienteRespuestaChat = (ticket, remitente, textoUsuario, mensajesDelSistema, folioAnteriorMes = null) => {
  const esCreador = ticket.creador && remitente.toLowerCase().trim() === ticket.creador.toLowerCase().trim();
  const sinTecnicoAun = !ticket.tecnico || ticket.tecnico === 'Sin Asignar';

  if (ticket.tipo_solicitud === 'CENTINELA' || (!esCreador && !sinTecnicoAun)) {
    return null;
  }

  const folio = ticket.folio;
  const nodo = ticket.equipo && ticket.equipo !== 'Ninguno' ? ticket.equipo : 'tu equipo';
  const campana = ticket.campana || 'General';
  const cat = (ticket.categoria || '').toUpperCase();
  const sub = (ticket.subcategoria || '').toUpperCase();
  const elem = (ticket.elemento || '').toUpperCase();
  const esDispositivo = cat.includes('DISPOSITIVO') || cat.includes('HARDWARE');
  const texto = (textoUsuario || '').trim();
  // Sin mayúsculas ni acentos: "Ya quedó", "ya quedo" y "YA QUEDÓ" valen lo mismo
  const textoLower = sinAcentos(texto);
  const dice = (...frases) => frases.some(f => textoLower.includes(f));
  // Negaciones: "no está solucionado" no debe cerrar el folio
  const niega = /\b(no|nunca|tampoco|todavia|aun|sigue|siguen|persiste|falla|fallando)\b/.test(textoLower);

  // --------------------------------------------------------------------------
  // CASO ESPECIAL: DISPOSITIVO REPETIDO EN EL MES (Valida si ya hizo Centinela)
  // --------------------------------------------------------------------------
  if (esDispositivo && folioAnteriorMes) {
    if (mensajesDelSistema === 1) {
      const dijoQueNo = /\bno\b/.test(textoLower) || textoLower.includes('aun no');
      if (dijoQueNo) {
        return {
          textoRespuesta: `🛡️ Te invitamos a generar tu Reporte Centinela desde el Asistente Guiado para este nodo (${nodo}). Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnteriorMes}). Te agradecemos que lo sigas reportando en Centinela para que tu campaña llegue al 100% y se hagan los cambios solicitados.`,
          cerrarTicket: true
        };
      }
      return {
        textoRespuesta: `✅ ¡Perfecto! Validamos que un técnico ya se acercó previamente a realizar pruebas en ${nodo} (Folio origen: #${folioAnteriorMes}). Te agradecemos que lo sigas reportando en Centinela para que tu campaña llegue al 100% y se hagan los cambios solicitados.`,
        cerrarTicket: true
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // TOUCHPOINT: FOLIO DE SOPORTE (antecedente). Si la falla volvió se atiende; si no, el folio queda como registro.
  // --------------------------------------------------------------------------
  if (cat.includes('TOUCHPOINT') && sub.includes('FOLIO DE SOPORTE') && mensajesDelSistema === 1) {
    if (textoLower.includes('volvi') || textoLower.includes('se acerquen')) {
      return {
        textoRespuesta: `🙌 Entendido. Registramos que la falla volvió a presentarse en ${nodo} (${campana}) y avisamos a un técnico para que se acerque a tu posición. Mientras llega, vuelve a cerrar Touchpoint por completo y ábrelo en una ventana nueva de Edge o Chrome; si el problema continúa, escríbenos por aquí qué mensaje o comportamiento ves para adelantarle el diagnóstico.`,
        cerrarTicket: false
      };
    }
    if (textoLower.includes('registro') || textoLower.includes('resuelta')) {
      return {
        textoRespuesta: `✅ ¡Gracias por confirmarlo! Dejamos el folio #${folio} cerrado como antecedente de la falla en ${nodo} (${campana}); ese historial nos ayuda a detectar si el mismo equipo falla seguido. Si vuelve a presentarse, crea un nuevo reporte desde el asistente guiado y lo atendemos de inmediato.`,
        cerrarTicket: true
      };
    }
  }

  // Si en cualquier momento el usuario escribe que ya se solucionó
  if (!niega && dice('ya quedo', 'ya funciono', 'solucionado', 'ya sirvio', 'ya se arreglo', 'ya quedo resuelto')) {
    return {
      textoRespuesta: `🎉 ¡Excelente! Qué gusto que ya haya quedado funcionando correctamente. Este folio #${folio} se cerrará automáticamente en este momento. ¡Que tengas un excelente turno!`,
      cerrarTicket: true
    };
  }

  // Si el usuario hace clic en "Aún falla, quedo en espera"
  if (dice('aun falla', 'espera del tecnico', 'espera de tecnico') || (mensajesDelSistema >= 2 && niega && dice('solucionado', 'quedo', 'funciona', 'sirve', 'igual', 'resuelto'))) {
    return {
      textoRespuesta: `Entendido. Mantendremos el folio #${folio} abierto y en breve un técnico se acercará a tu posición para brindarte el soporte necesario.`,
      cerrarTicket: false
    };
  }

  // ==========================================================================
  // PASO 1 -> PASO 2: El usuario eligió una de las 3 Opciones Principales
  // Desplegamos las 3 sub-opciones sutiles correspondientes
  // ==========================================================================
  if (mensajesDelSistema === 1) {

    // --- TOUCHPOINT: FOLIO DE SOPORTE (Historial) ---
    if (cat.includes('TOUCHPOINT') && sub.includes('FOLIO DE SOPORTE')) {
      if (textoLower.includes('hola') || textoLower.includes('falla') || textoLower.includes('volvio') || textoLower.includes('volvio')) {
        return {
          textoRespuesta: `¡Hola! Registramos tu mensaje. Como nos indicas que la falla en Touchpoint persiste o requieres apoyo, en un momento un técnico se acercará a tu posición para revisarlo.`,
          cerrarTicket: false
        };
      }
    }

    // --- TOUCHPOINT: FALLA DE AUDIO ---
    if (cat.includes('TOUCHPOINT') && sub.includes('AUDIO')) {
      if (textoLower.includes('no me escucha') || textoLower.includes('microfono') || textoLower.includes('microfono')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos la situación. Para verificar si podemos agilizar el ajuste de la posición, ayúdanos seleccionando cuál de estos escenarios describe mejor lo que pasa:`,
            [
              `🔊 El volumen se percibe muy bajo aunque hable fuerte`,
              `🛑 El botón 'Mute' del control o de Touchpoint se activa solo / parpadea`,
              `🔇 Los clientes de plano no escuchan nada, como si estuviera totalmente mudo`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('no escucho') || textoLower.includes('bocinas') || textoLower.includes('audifonos') || textoLower.includes('audifonos')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendido. Para descartar un detalle rápido de configuración en Windows, indícanos qué notas en tus audífonos:`,
            [
              `🔉 Se escucha con muchísima estática, ruido o zumbido constante`,
              `🔕 Se escucha únicamente de un solo lado (oído izquierdo/derecho)`,
              `🔇 No se escucha absolutamente nada en la llamada, como si estuviera desconectado`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `No te preocupes, vamos a revisarlo. Selecciona qué sucede al conectar tu dispositivo al equipo:`,
          [
            `💡 Al conectarla, la diadema enciende sus luces/controles pero Touchpoint sigue sin detectarla`,
            `🔌 Al mover un poco el cable o el conector USB, parpadea o se desconecta`,
            `🔄 Ya reinicié el navegador y el equipo por completo y sigue sin reconocerla`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- TOUCHPOINT: DESCONEXIÓN ÚNICA ---
    if (cat.includes('TOUCHPOINT') && (sub.includes('ÚNICA') || sub.includes('UNICA'))) {
      if (textoLower.includes('saca al agente') || textoLower.includes('repentinamente')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos que esto interrumpe la operación. Para ubicar mejor la causa de la caída de sesión, ayúdanos seleccionando:`,
            [
              `⏱️ Ocurre de forma aleatoria justo cuando entra una llamada o interacción`,
              `🛑 La página se congela por unos segundos y después aparece la pantalla de cierre de sesión`,
              `💻 Únicamente le pasa a este agente, incluso si prueba en otra posición de la isla`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('no carga') || textoLower.includes('pantalla blanca')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendido. Para descartar un detalle rápido con el navegador del equipo, indícanos qué visualiza el agente:`,
            [
              `🔄 Se queda cargando con el círculo girando indefinidamente sin abrir el login`,
              `⚠️ Muestra un mensaje de error de conexión, certificado o 'Sitio no disponible'`,
              `🌐 Ya intentamos abrirlo en otro navegador (Edge/Chrome) pero hace exactamente lo mismo`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `No te preocupes, vamos a revisarlo a detalle. Selecciona cuál de estos indicios notas en tu posición:`,
          [
            `💡 El foquito de red (Ethernet) detrás del CPU o en el switch está apagado o parpadea extraño`,
            `🖥️ El equipo muestra notificación de 'Red no identificada' o 'Sin acceso a Internet'`,
            `⚡ Ocurrió una pequeña variante de energía o reinicio imprevisto en la posición`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- TOUCHPOINT: DESCONEXIÓN MASIVA ---
    if (cat.includes('TOUCHPOINT') && sub.includes('MASIVA')) {
      if (textoLower.includes('grupo reducido') || textoLower.includes('2 a 5')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendemos la urgencia por el número de agentes involucrados. Para ubicar el origen en la isla, indícanos:`,
            [
              `📍 Son posiciones que están juntas en la misma línea o bloque de escritorios`,
              `🔀 Los agentes afectados están combinados en diferentes lugares pero son de la misma campaña`,
              `🔌 Coincide con que al limpiar o mover ligeramente los escritorios se cayeron de red`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('toda la campana') || textoLower.includes('isla completa')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Registramos la alerta de gran impacto. Para coordinar el apoyo inmediato con tu campaña, confírmanos:`,
            [
              `🛑 A todos los asesores les apareció el mismo aviso de expulsión de sesión de forma simultánea`,
              `💻 Los equipos siguen con energía pero ningún navegador abre ninguna página interna ni externa`,
              `📞 El supervisor de piso nos confirma que otras campañas vecinas operan con normalidad`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `De acuerdo, prioridad máxima de conectividad. Selecciona qué otros servicios se encuentran interrumpidos:`,
          [
            `🔴 Ninguna página web (interna ni externa) abre en las computadoras de la zona`,
            `💬 Las aplicaciones de mensajería o herramientas complementarias de trabajo también se desconectaron`,
            `⚡ Hubo un parpadeo o corte general de energía eléctrica en el área hace unos minutos`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- DISPOSITIVOS: DIADEMA ---
    if (esDispositivo && sub.includes('DIADEMA')) {
      if (textoLower.includes('muy bajo') || textoLower.includes('interferencia')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendemos lo importante que es la claridad en llamadas. Ayúdanos seleccionando qué síntoma exacto percibes:`,
            [
              `🔉 El volumen de voz que transmito se escucha muy lejano o débil para los clientes`,
              `⚡ Se percibe estática constante, zumbido o cortes al hablar`,
              `🔇 El sonido de las llamadas se corta por completo si muevo ligeramente el cable`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('mute') || textoLower.includes('controles')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos el inconveniente con los controles. Indícanos qué comportamiento notas en el dispositivo:`,
            [
              `🔴 El botoncito indicador de silencio se queda parpadeando o en rojo fijo`,
              `🎚️ Los botones de subir/bajar volumen de la diadema no ejecutan ninguna acción en la PC`,
              `🔌 El control en línea se siente caliente o presenta un falso contacto al presionarlo`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `De acuerdo, vamos a revisarlo en tu posición. Selecciona cuál de estos escenarios se ajusta más a tu caso:`,
          [
            `💻 Windows no reconoce el dispositivo de audio predeterminado al conectarlo`,
            `🔄 Ya probamos en otro puerto USB del CPU pero el equipo sigue sin detectarla`,
            `⚠️ La diadema presenta desgaste físico severo o daño estructural que amerita reemplazo por stock`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- DISPOSITIVOS: TECLADO ---
    if (esDispositivo && sub.includes('TECLADO')) {
      if (textoLower.includes('duras') || textoLower.includes('trabadas') || textoLower.includes('atoran')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos que esto afecta la velocidad de captura. Para evaluar el tipo de limpieza que requiere, indícanos:`,
            [
              `🍯 Algunas teclas se sienten pegajosas o tardan en regresar a su posición original`,
              `🔤 Las letras o números principales están muy borrosos o desgastados visualmente`,
              `⌨️ La barra espaciadora o el ENTER se inclinan hacia un lado al presionarlos`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('dejo de responder') || textoLower.includes('no enciende')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendido. Para descartar un detalle rápido de conexión en el equipo, ayúdanos seleccionando:`,
            [
              `💡 Las luces indicadoras (Bloq Mayús / Bloq Num) están completamente apagadas`,
              `🔄 Al desconectar y reconectar el cable USB en el CPU, parpadea un segundo pero vuelve a apagarse`,
              `🛑 Ninguna tecla funciona en ningún programa ni en la pantalla de inicio de sesión`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `Registramos un comportamiento inusual. Para ubicar la causa exacta, confírmanos:`,
          [
            `🔣 Al presionar una letra aparece repetida muchas veces en pantalla (ej. 'aaaaaa')`,
            `🌐 Al teclear se activan comandos extraños o abre ventanas secundarias por sí solo`,
            `💧 Ocurrió un pequeño incidente de líquidos sobre el teclado hace un momento`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- DISPOSITIVOS: MOUSE ---
    if (esDispositivo && sub.includes('MOUSE')) {
      if (textoLower.includes('puntero') || textoLower.includes('brinca') || textoLower.includes('fluidez')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos lo frustrante que es navegar con fallas en el cursor. Selecciona qué comportamiento notas:`,
            [
              `🔍 El cursor se congela por momentos o se mueve de forma errática al deslizar el mouse`,
              `🖥️ Al levantar el mouse y volverlo a apoyar, el cursor salta hacia las esquinas de la pantalla`,
              `🖱️ El deslizamiento se siente pesado o raspa contra la alfombrilla`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('botones') || textoLower.includes('clic') || textoLower.includes('ruedita')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendido. Para ubicar el desgaste en los mecanismos de clic, indícanos:`,
            [
              `👆 Al dar un solo clic el sistema detecta doble clic o no responde a la primera`,
              `📜 La ruedita (scroll) gira pero la página web no sube ni baja de forma correcta`,
              `🔇 El botón izquierdo se siente flojo o ya no emite el sonido de clic tradicional`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `No te preocupes, lo revisamos en tu posición. Selecciona qué sucede al manipularlo:`,
          [
            `🔴 La luz roja óptica de la parte inferior se encuentra totalmente apagada`,
            `⚡ Al mover ligeramente el cable cerca de la base del mouse, la PC parpadea o reconecta el dispositivo`,
            `🔄 Ya lo probamos en otro puerto USB del equipo pero sigue sin dar señal de vida`
          ]
        ),
        cerrarTicket: false
      };
    }

    // --- DISPOSITIVOS: RENDIMIENTO CPU (Si no traía elemento preseleccionado) ---
    if (esDispositivo && (sub.includes('RENDIMIENTO') || sub.includes('CPU')) && !elem) {
      if (textoLower.includes('disco')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Comprendemos que el rendimiento del equipo es clave. Para orientar el mantenimiento, indícanos:`,
            [
              `📂 El equipo muestra constantemente avisos de 'Poco espacio disponible en disco C:'`,
              `⏳ Las aplicaciones tardan varios minutos en abrir o al encender la PC se queda pasmada`,
              `⚠️ El sistema operativo lanzó un mensaje de advertencia sobre la unidad de almacenamiento`
            ]
          ),
          cerrarTicket: false
        };
      }
      if (textoLower.includes('ram') || textoLower.includes('memoria')) {
        return {
          textoRespuesta: armarMensajeConOpciones(
            `Entendido. Para afinar el diagnóstico de optimización de memoria, confírmanos:`,
            [
              `🌐 El equipo se congela por completo al abrir pestañas del navegador o herramientas de trabajo simultáneas`,
              `🔄 La PC se reinicia de la nada o arroja pantallas de error repentinas ('Pantalla Azul')`,
              `📊 Al abrir el Administrador de Tareas el uso de la memoria se mantiene al 100% permanente`
            ]
          ),
          cerrarTicket: false
        };
      }
      return {
        textoRespuesta: armarMensajeConOpciones(
          `De acuerdo, mantenimiento correctivo mayor. Para coordinar el respaldo y la intervención con el técnico, confírmanos:`,
          [
            `🗂️ Requerimos respaldar manuales, plantillas o archivos importantes ubicados en Escritorio antes de iniciar`,
            `🦠 El equipo presenta lentitud extrema por posibles conflictos de software que ya no se quitan con limpieza`,
            `🕒 Ya validamos que la posición se encuentre desocupada para que el técnico pueda trabajar sin afectar la operación`
          ]
        ),
        cerrarTicket: false
      };
    }

    // Si era DISCO, RAM o FORMATEO directo (que ya mostró las 3 sub-opciones desde el Paso 1), cerramos con opciones Sí/No
    if (esDispositivo && (sub.includes('RENDIMIENTO') || sub.includes('CPU')) && elem) {
      const notaCentinela = textoLower.includes('advertencia sobre la unidad')
        ? `\n*(Nota: Recuerda que si la unidad requiere reemplazo definitivo o cambio a SSD por daño físico, se gestiona mediante Reporte Centinela).*`
        : '';
      return {
        textoRespuesta: armarMensajeConOpciones(
          `✅ ¡Muchas gracias por confirmar! Nuestro técnico de TI ya cuenta con el detalle exacto. ¿El problema ya se solucionó o sigues requiriendo la visita del técnico en tu posición ${nodo}?${notaCentinela}`,
          [
            `✅ ¡Ya quedó solucionado, muchas gracias!`,
            `⏳ Aún falla, quedo en espera del técnico`
          ]
        ),
        cerrarTicket: false
      };
    }
  }

  // ==========================================================================
  // PASO 2 -> PASO 3 (CIERRE FINAL DEL ÁRBOL): Da un Tip Técnico y Opciones Sí/No
  // ==========================================================================
  if (mensajesDelSistema === 2) {
    // TOUCHPOINT: además de avisar que el técnico va en camino, se dan pasos concretos para intentar mientras llega
    if (cat.includes('TOUCHPOINT')) {
      const quien = `${nodo} (${campana})`;
      const cierre = `Si con esto ya quedó, escríbenos «ya quedó» y un técnico confirmará el cierre del folio #${folio}. Si sigue igual, no te preocupes: tu reporte ya está registrado y un técnico se acercará a revisar la posición.`;
      if (sub.includes('AUDIO')) {
        return {
          textoRespuesta: `✅ ¡Gracias, con este detalle ya sabemos qué revisar en ${quien}! Mientras el técnico llega, puedes intentar esto:\n1) En Windows, abre Configuración > Sonido y confirma que tu diadema sea el dispositivo de entrada y de salida predeterminado, y que no esté en silencio.\n2) Desconecta la diadema, espera 5 segundos y conéctala en otro puerto USB del CPU.\n3) Cierra Touchpoint por completo y ábrelo de nuevo en una ventana nueva de Edge o Chrome; si el navegador pide permiso para el micrófono, elige «Permitir».\n\n${cierre}`,
          cerrarTicket: false
        };
      }
      if (sub.includes('ÚNICA') || sub.includes('UNICA')) {
        return {
          textoRespuesta: `✅ ¡Gracias, ya tenemos lo necesario para revisar ${quien}! Mientras el técnico llega, puedes intentar esto:\n1) Verifica que tu sesión de Touchpoint no esté abierta en otro equipo; si lo está, ciérrala allí.\n2) Cierra sesión, borra la caché del navegador (Ctrl + Shift + Supr) y vuelve a entrar.\n3) Revisa que el cable de red esté firme en el CPU y en la pared, y que otras páginas abran con normalidad.\n\n${cierre}`,
          cerrarTicket: false
        };
      }
      if (sub.includes('MASIVA')) {
        return {
          textoRespuesta: `🚨 ¡Gracias! Dejamos registrada la alerta de ${quien} con prioridad alta y avisamos al equipo técnico. Mientras tanto:\n1) Confirma con tu supervisor cuántas posiciones siguen sin servicio.\n2) No reinicies ni apagues los equipos hasta que te lo indiquemos, para poder revisar el estado actual.\n3) Mantén abierto este chat: te escribiremos aquí en cuanto haya avance.`,
          cerrarTicket: false
        };
      }
    }

    let consejoTecnico = "Nuestro técnico de TI ya cuenta con el detalle exacto de la falla.";

    // ----- TIPS TÉCNICOS SEGÚN LA RESPUESTA ANTERIOR -----
    
    // TOUCHPOINT: AUDIO
    if (textoLower.includes('volumen se percibe muy bajo') || textoLower.includes('estatica constante')) {
      consejoTecnico = "Como primer paso, por favor desconecta tu diadema del puerto USB frontal y conéctala en uno de los puertos USB de la parte trasera del CPU (directo a la placa base).";
    } else if (textoLower.includes('boton \'mute\'') || textoLower.includes('no escuchan nada') || textoLower.includes('un solo lado')) {
      consejoTecnico = "Por favor verifica que el volumen en la barra de tareas de Windows esté al 100%, y asegúrate de que el plug de la diadema (si es desprendible) esté bien conectado al control de volumen del cable.";
    } 
    // TOUCHPOINT: DESCONEXIÓN Y RED
    else if (textoLower.includes('saca al agente') || textoLower.includes('se queda cargando') || textoLower.includes('foquito de red') || textoLower.includes('notificacion de \'red no identificada\'')) {
      consejoTecnico = "Antes de que el técnico llegue, por favor intenta presionar CTRL + SHIFT + R en tu navegador para forzar una recarga limpia, o asegúrate de que el cable de red gris/azul detrás de tu CPU esté bien conectado hasta escuchar un 'clic'.";
    }
    // DISPOSITIVOS: TECLADO Y MOUSE
    else if (textoLower.includes('pegajosas') || textoLower.includes('brinca') || textoLower.includes('doble clic') || textoLower.includes('apaga') || textoLower.includes('falso contacto')) {
      consejoTecnico = "Si el equipo lo permite, prueba desconectando el dispositivo y conectándolo en otro puerto USB libre para descartar una falla del puerto actual.";
    }
    // NOTAS CENTINELA O DAÑO FÍSICO
    else if (textoLower.includes('reemplazo por stock') || textoLower.includes('borrosos o desgastados') || textoLower.includes('cerca de la base del mouse') || textoLower.includes('advertencia sobre la unidad') || textoLower.includes('liquidos sobre el teclado')) {
      consejoTecnico = "Registramos la necesidad física del componente en la posición.\n\n🛡️ *Nota importante: Te recordamos que cuando un periférico presenta daño físico definitivo o desgaste total y requiere reemplazo, el trámite final para inventario debe registrarse en el apartado de Reporte Centinela.*";
    }

    const consejoEspecifico = buscarConsejoEspecifico(textoLower);
    if (consejoEspecifico) consejoTecnico = consejoEspecifico;

    return {
      textoRespuesta: armarMensajeConOpciones(
        `✅ ¡Anotado, muchas gracias por la información!\n\n💡 **Tip de Soporte:** ${consejoTecnico}\n\n¿Lograste solucionar el problema con este paso o sigues requiriendo que el técnico se acerque a tu posición?`,
        [
          `✅ ¡Ya quedó solucionado, muchas gracias!`,
          `⏳ Aún falla, quedo en espera del técnico`
        ]
      ),
      cerrarTicket: false
    };
  }

  // Mensaje libre al final del flujo: se acusa recibo una sola vez (el paso se cuenta por mensajes del sistema)
  if (mensajesDelSistema === 3 && texto && sinTecnicoAun) {
    return {
      textoRespuesta: `📩 Recibimos tu mensaje y lo agregamos al folio #${folio} para que el técnico lo vea. Si el problema ya quedó resuelto, escríbenos «ya quedó»; si no, un técnico te atenderá en cuanto esté disponible.`,
      cerrarTicket: false
    };
  }

  return null;
};

module.exports = {
  armarResolucionCentinela,
  obtenerMensajeCentinela,
  obtenerFlujoPreguntas,
  evaluarSiguienteRespuestaChat
};
