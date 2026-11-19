// Pruebas del asistente del chat (sin base de datos). Ejecutar con: npm run test:asistente
const r = require('../respuestasChat.cjs');
let fallas = 0;
const ok = (c, n, e = '') => { if (!c) fallas++; console.log(c ? 'OK ' : 'FALLA', n, e); };
const t = { folio: 'F1', equipo: 'A-1', campana: 'X', creador: 'A', tecnico: 'Sin Asignar', categoria: 'TOUCHPOINT', subcategoria: 'AUDIO', elemento: '', tipo_solicitud: '' };
const ev = (txt, paso, extra = {}) => r.evaluarSiguienteRespuestaChat(t, 'A', txt, paso, null, extra);

// confirmación
let x = ev('ya quedó', 3);
ok(x && !x.cerrarTicket && /Confirmas que ya funciona/.test(x.textoRespuesta) && /OPCIONES/.test(x.textoRespuesta), 'texto libre «ya quedó» pregunta antes de cerrar');
x = ev('✅ ¡Ya quedó solucionado, muchas gracias!', 3);
ok(x && x.cerrarTicket && x.evento === 'resuelto', 'el botón «Ya quedó solucionado» cierra');
x = ev('✅ Sí, ya funciona, puedes cerrarlo', 3, { ultimoSistema: x0() });
function x0() { return '¿Confirmas que ya funciona? Si es así, cierro el folio'; }
ok(x && x.cerrarTicket, 'responder Sí a la confirmación cierra');
x = ev('⏳ No, sigue igual', 3, { ultimoSistema: x0() });
ok(x && !x.cerrarTicket && x.evento === 'escalado', 'responder No deja el folio abierto y cuenta como escalado');
x = ev('ya quedó', 3, { ultimoSistema: x0() });
ok(x && x.cerrarTicket, 'repetir «ya quedó» tras la confirmación cierra');
x = ev('no está solucionado', 3);
ok(x && !x.cerrarTicket && !/Confirmas/.test(x.textoRespuesta), 'una negación no pregunta ni cierra');

// fuera de horario
process.env.FUERA_HORARIO_DESDE = '22'; process.env.FUERA_HORARIO_HASTA = '8';
ok([22, 23, 0, 3, 7].every(h => r.estaFueraDeHorario(h)), 'de 22:00 a 07:59 es fuera de horario');
ok([8, 12, 21].every(h => !r.estaFueraDeHorario(h)), 'de 08:00 a 21:59 sí se atiende');
ok(!r.estaFueraDeHorario(10, { desde: 8, hasta: 8 }), 'desde = hasta desactiva la regla');
ok(r.estaFueraDeHorario(9, { desde: 8, hasta: 18 }) && !r.estaFueraDeHorario(19, { desde: 8, hasta: 18 }), 'ventana dentro del mismo día');
const m = r.mensajeFueraDeHorario('X9');
ok(/#X9/.test(m) && /10:00 p\. m\./.test(m) && /8:00 a\. m\./.test(m) && !/\.\./.test(m), 'mensaje fuera de horario claro y sin puntos dobles');

// aviso de espera
ok(!/en cola/.test(r.agregarAvisoEspera('hola', 3)), 'sin aviso con poca espera');
const a = r.agregarAvisoEspera('hola\n[[OPCIONES:a|b]]', 12);
ok(/en cola/.test(a) && a.endsWith('[[OPCIONES:a|b]]'), 'aviso de espera antes de los botones');

// consejos nuevos por texto libre
const libre = (cat, sub, txt) => { const tk = { ...t, categoria: cat, subcategoria: sub }; return r.evaluarSiguienteRespuestaChat(tk, 'A', txt, 1, null); };
for (const [c, s, txt, esp] of [
  ['TOUCHPOINT', 'SESION UNICA', 'Touchpoint no carga se queda en blanco', /CTRL \+ SHIFT \+ R/],
  ['TOUCHPOINT', 'SESION UNICA', 'mi usuario está bloqueado no me deja entrar', /supervisor/],
  ['DISPOSITIVOS', 'DIADEMA', 'el audio se corta en la llamada', /parte trasera|otra diadema/],
  ['DISPOSITIVOS', 'DIADEMA', 'se escucha eco en las llamadas', /ruedita/],
  ['DISPOSITIVOS', 'MONITOR', 'el segundo monitor no tiene imagen', /segundo monitor/]
]) {
  const y = libre(c, s, txt);
  ok(y && esp.test(y.textoRespuesta), `texto libre "${txt}" -> consejo nuevo`, y ? y.textoRespuesta.slice(0, 60) : 'sin respuesta');
}
// ningún consejo nuevo menciona herramientas que no tienen
const todo = JSON.stringify(r.CONSEJOS_BASE);
ok(!/Configuraci[oó]n >|Panel de control|Administrador de Tareas|CMD|ipconfig/.test(todo), 'ningún consejo manda a Ajustes, Panel de control, CMD ni Administrador de Tareas');

// ajustes guardados desde el panel
r.aplicarConfigAsistente({ fueraActivo: true, fueraDesde: 20, fueraHasta: 7, umbralEspera: 3 });
ok(r.estaFueraDeHorario(21) && r.estaFueraDeHorario(6) && !r.estaFueraDeHorario(8), 'el horario guardado en el panel manda sobre el predeterminado');
ok(/en cola/.test(r.agregarAvisoEspera('hola', 3)) && !/en cola/.test(r.agregarAvisoEspera('hola', 2)), 'el umbral de espera guardado se respeta');
r.aplicarConfigAsistente({ fueraActivo: false });
ok(!r.estaFueraDeHorario(23), 'con el cierre por horario desactivado nunca se cierra');
r.aplicarConfigAsistente({});
// aviso de folio duplicado
const d = r.agregarNota('hola' + String.fromCharCode(10) + '[[OPCIONES:a|b]]', r.avisoFolioDuplicado('0101261'));
ok(/#0101261/.test(d) && d.endsWith('[[OPCIONES:a|b]]'), 'el aviso de folio duplicado va antes de los botones');

console.log(fallas ? fallas + ' FALLAS' : 'TODO OK');
process.exit(fallas ? 1 : 0);
