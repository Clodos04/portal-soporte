// Archivo: respuestasChat.cjs

// Helper para empaquetar texto + botones interactivos para LiveChatView.jsx
const armarMensajeConOpciones = (texto, listaOpciones = []) => {
  if (!listaOpciones || listaOpciones.length === 0) return texto;
  return `${texto}\n[[OPCIONES:${listaOpciones.join('|')}]]`;
};

// 1. GENERADOR DE MENSAJES PARA MODALIDAD CENTINELA DIRECTA
const obtenerMensajeCentinela = (nuevoFolio, esSubsecuente, folioAnterior) => {
  if (esSubsecuente) {
    return `Gracias por crear tu centinela con el folio #${nuevoFolio}. Validamos que un técnico ya se acercó previamente a realizar pruebas (Folio origen: #${folioAnterior}). Te agradecemos que lo sigas reportando para que tu campaña llegue al 100% y se hagan los cambios solicitados.`;
  }
  return `🛡️ Folio Centinela #${nuevoFolio} registrado con éxito para solicitud de cambio de periférico. Se te asignará un técnico en un tiempo máximo de 10 minutos para validar el componente.`;
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
        `✅ Folio #${folio} registrado exitosamente para ${nodo} (${campana}) como antecedente e historial de que hubo una falla (ya solucionada al abrir Touchpoint en otro navegador o reiniciar el equipo). Si vuelve a presentarse hoy, escríbenos por aquí para acercarnos.`
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
    `Folio #${folio} registrado con éxito para ${nodo} (${campana}). Se te asignará un técnico en un tiempo máximo de 10 minutos.`
  ];
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
  const textoLower = texto.toLowerCase();

  // --------------------------------------------------------------------------
  // CASO ESPECIAL: DISPOSITIVO REPETIDO EN EL MES (Valida si ya hizo Centinela)
  // --------------------------------------------------------------------------
  if (esDispositivo && folioAnteriorMes) {
    if (mensajesDelSistema === 1) {
      const dijoQueNo = textoLower.includes('no') || textoLower.includes('aun') || textoLower.includes('aún');
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

  // Si en cualquier momento el usuario escribe que ya se solucionó
  if (textoLower.includes('ya quedo') || textoLower.includes('ya quedó') || textoLower.includes('ya funciono') || textoLower.includes('ya funcionó') || textoLower.includes('solucionado')) {
    return {
      textoRespuesta: `🎉 ¡Excelente! Qué gusto que ya haya quedado funcionando correctamente. Un técnico revisará el folio #${folio} para confirmar el cierre.`,
      cerrarTicket: false
    };
  }

  // ==========================================================================
  // PASO 1 -> PASO 2: El usuario eligió una de las 3 Opciones Principales
  // Desplegamos las 3 sub-opciones sutiles correspondientes
  // ==========================================================================
  if (mensajesDelSistema === 1) {

    // --- TOUCHPOINT: FALLA DE AUDIO ---
    if (cat.includes('TOUCHPOINT') && sub.includes('AUDIO')) {
      if (textoLower.includes('no me escucha') || textoLower.includes('micrófono') || textoLower.includes('microfono')) {
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
      if (textoLower.includes('no escucho') || textoLower.includes('bocinas') || textoLower.includes('audífonos') || textoLower.includes('audifonos')) {
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
      if (textoLower.includes('toda la campaña') || textoLower.includes('isla completa')) {
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
      if (textoLower.includes('dejó de responder') || textoLower.includes('no enciende')) {
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

    // Si era DISCO, RAM o FORMATEO directo (que ya mostró las 3 sub-opciones desde el Paso 1), cerramos con confirmación:
    if (esDispositivo && (sub.includes('RENDIMIENTO') || sub.includes('CPU')) && elem) {
      const notaCentinela = textoLower.includes('advertencia sobre la unidad')
        ? `\n*(Nota: Recuerda que si la unidad requiere reemplazo definitivo o cambio a SSD por daño físico, se gestiona mediante Reporte Centinela).*`
        : '';
      return {
        textoRespuesta: `✅ ¡Muchas gracias por confirmar! Nuestro técnico de TI ya cuenta con el detalle exacto y se acercará a la posición ${nodo} (${campana}) para realizar el mantenimiento correspondiente.${notaCentinela}`,
        cerrarTicket: false
      };
    }
  }

  // ==========================================================================
  // PASO 2 -> PASO 3 (CIERRE): El usuario eligió la sub-opción de 2do nivel
  // ==========================================================================
  if (mensajesDelSistema === 2) {
    const requiereRecordatorioCentinela =
      textoLower.includes('reemplazo por stock') ||
      textoLower.includes('borrosos o desgastados') ||
      textoLower.includes('cerca de la base del mouse') ||
      textoLower.includes('advertencia sobre la unidad');

    const notaCentinela = requiereRecordatorioCentinela
      ? `\n\n🛡️ *Nota importante: Te recordamos que cuando un periférico presenta daño físico definitivo o desgaste total y requiere reemplazo por stock, el trámite debe registrarse en el apartado de Reporte Centinela.*`
      : '';

    return {
      textoRespuesta: `✅ ¡Perfecto, muchas gracias por la información! Con este detalle nuestro técnico de TI ya sabe exactamente qué herramientas llevar y se acercará a revisar tu posición (${nodo} - ${campana}) en breve.${notaCentinela}`,
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
