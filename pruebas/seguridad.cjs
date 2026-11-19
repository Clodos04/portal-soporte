// Pruebas de seguridad del servidor con MySQL simulado (no toca ninguna base de datos real).
// Ejecutar con: npm run test:seguridad
const Module = require('module');
const path = require('path');
const os = require('os');
const raiz = path.join(__dirname, '..');
const jwt = require(path.join(raiz, 'node_modules', 'jsonwebtoken'));

const PUERTO = 5397;
const SECRETO = 'secreto-de-prueba';
const consultas = [];

const responder = (q, params) => {
  if (/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER)/i.test(q)) return { insertId: 7, affectedRows: 1 };
  if (/SHOW COLUMNS FROM/.test(q)) return ['id', 'folio', 'creador', 'estatus', 'tipo_solicitud'].map(Field => ({ Field }));
  if (/SELECT creador FROM tickets WHERE folio/.test(q)) {
    const f = String(params[0]);
    return f === 'F1' ? [{ creador: 'CLIENTE PRUEBA' }] : f === 'F2' ? [{ creador: 'OTRA PERSONA' }] : [];
  }
  if (/SELECT \* FROM tickets WHERE folio/.test(q)) return [];
  if (/FROM ticket_adjuntos WHERE id/.test(q)) return [{ id: 9, folio: 'F2', nombre_archivo: 'x.pdf', nombre_original: 'x.pdf', tipo: 'application/pdf' }];
  if (/FROM usuarios WHERE username/.test(q)) return [];
  if (/SELECT id, estatus, nivel FROM usuarios/.test(q)) return [
    { id: 1, estatus: 'ACTIVO', nivel: 'ADMINISTRADOR' }, { id: 2, estatus: 'ACTIVO', nivel: 'CLIENTE' },
    { id: 3, estatus: 'INACTIVO', nivel: 'CLIENTE' }, { id: 4, estatus: 'ACTIVO', nivel: 'CLIENTE' }
  ];
  if (/SELECT \* FROM usuarios$/.test(q)) return [
    { id: 1, username: 'a', password: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', nombre: 'ADMIN', paterno: 'PRUEBA', nivel: 'ADMINISTRADOR', estatus: 'ACTIVO', campana: 'X', gruposAsignados: '["SOPORTE"]' }
  ];
  if (/FROM buzon_sugerencias/.test(q) && /^\s*SELECT/i.test(q)) return [];
  if (/^\s*(SELECT|SHOW)/i.test(q)) return [];
  return [];
};
const falso = {
  query(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    const q = String(sql).replace(/\s+/g, ' ');
    consultas.push({ q, params });
    setImmediate(() => cb && cb(null, responder(q, params || []), []));
    return { on() {} };
  },
  connect(cb) { cb && cb(null); }, on() {}, end() {}, ping(cb) { cb && cb(null); }, escape: (x) => `'${x}'`,
  getConnection(cb) { cb(null, { release() {}, query: this.query }); }
};
const original = Module._load;
Module._load = function (request, ...resto) {
  if (request === 'mysql2') return { createConnection: () => falso, createPool: () => falso };
  return original.call(this, request, ...resto);
};
Object.assign(process.env, {
  DB_HOST: 'x', DB_USER: 'x', DB_PASSWORD: 'x', DB_NAME: 'x', CENTINELA_HOST: 'x', CENTINELA_USER: 'x', CENTINELA_PASSWORD: 'x', CENTINELA_DB: 'x',
  JWT_SECRET: SECRETO, PORT: String(PUERTO), UPLOADS_DIR: path.join(os.tmpdir(), 'cti-uploads-prueba')
});
process.on('uncaughtException', (e) => { console.log('EXCEPCIÓN NO CAPTURADA:', e.stack); process.exit(1); });
process.chdir(raiz);
const log = console.log; console.log = () => {}; console.warn = () => {}; console.error = () => {};
require(path.join(raiz, 'server.cjs'));

const cookie = (datos) => 'cti_sesion=' + jwt.sign(datos, SECRETO);
const admin = cookie({ id: 1, username: 'a', nivel: 'ADMINISTRADOR', nombre: 'ADMIN PRUEBA' });
const cliente = cookie({ id: 2, username: 'c', nivel: 'CLIENTE', nombre: 'CLIENTE PRUEBA' });
const llamar = async (metodo, ruta, ck, body, extra = {}) => {
  const res = await fetch(`http://127.0.0.1:${PUERTO}${ruta}`, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(ck ? { Cookie: ck } : {}), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let j = null; try { j = await res.clone().json(); } catch (e) { /* no es JSON */ }
  return [res.status, j];
};
let fallas = 0;
const ok = (c, n, e = '') => { if (!c) fallas++; log(c ? 'OK ' : 'FALLA', n, e); };
const ultimoInsertChat = () => consultas.filter(c => /INSERT INTO mensajes_chat/.test(c.q)).pop();

setTimeout(async () => {
  try {
    let s, j;
    // --- sin sesión no se entra a nada
    [s] = await llamar('GET', '/api/chat/F1');
    ok(s === 401, 'sin sesión: chat 401', s);
    [s] = await llamar('GET', '/api/usuarios');
    ok(s === 401, 'sin sesión: usuarios 401', s);

    // --- chat: cada quien solo en sus folios
    [s] = await llamar('GET', '/api/chat/F1', cliente);
    ok(s === 200, 'cliente lee el chat de su folio', s);
    [s] = await llamar('GET', '/api/chat/F2', cliente);
    ok(s === 403, 'cliente NO lee el chat de otro folio', s);
    [s, j] = await llamar('GET', '/api/chat/NOEXISTE', cliente);
    ok(s === 200 && Array.isArray(j) && j.length === 0, 'folio inexistente: lista vacía sin revelar nada', s);
    [s] = await llamar('GET', '/api/chat/F2', admin);
    ok(s === 200, 'soporte lee cualquier chat', s);
    [s] = await llamar('POST', '/api/chat', cliente, { folio: 'F2', remitente: 'CLIENTE PRUEBA', texto: 'hola' });
    ok(s === 403, 'cliente NO escribe en el folio de otro', s);
    consultas.length = 0;
    [s] = await llamar('POST', '/api/chat', cliente, { folio: 'F1', remitente: 'Sistema', texto: 'me hago pasar por el sistema' });
    ok(s === 200 && ultimoInsertChat() && ultimoInsertChat().params[1] === 'CLIENTE PRUEBA', 'el remitente de un cliente sale de su sesión (no puede ser «Sistema»)', JSON.stringify(ultimoInsertChat() && ultimoInsertChat().params));
    consultas.length = 0;
    [s] = await llamar('POST', '/api/chat', admin, { folio: 'F1', remitente: 'Sistema', texto: 'mensaje del sistema' });
    ok(s === 200 && ultimoInsertChat() && ultimoInsertChat().params[1] === 'Sistema', 'soporte sí puede enviar como «Sistema»');
    consultas.length = 0;
    [s] = await llamar('POST', '/api/chat', admin, { folio: 'F1', remitente: 'OTRA PERSONA', texto: 'suplantación' });
    ok(s === 200 && ultimoInsertChat() && ultimoInsertChat().params[1] === 'ADMIN PRUEBA', 'soporte tampoco puede escribir a nombre de otra persona');
    [s] = await llamar('POST', '/api/chat', cliente, { folio: 'F1', texto: '   ' });
    ok(s === 400, 'mensaje vacío 400', s);

    // --- adjuntos
    [s] = await llamar('GET', '/api/tickets/F2/adjuntos', cliente);
    ok(s === 403, 'cliente NO lista adjuntos de otro folio', s);
    [s] = await llamar('GET', '/api/tickets/F1/adjuntos', cliente);
    ok(s === 200, 'cliente lista adjuntos de su folio', s);
    [s] = await llamar('GET', '/api/adjuntos/9', cliente);
    ok(s === 403, 'cliente NO descarga un adjunto de otro folio', s);
    [s] = await llamar('POST', '/api/tickets/F2/adjuntos', cliente, {});
    ok(s === 403, 'cliente NO sube adjuntos al folio de otro', s);

    // --- buzón
    consultas.length = 0;
    await llamar('GET', '/api/buzon', cliente);
    const b = consultas.find(c => /FROM buzon_sugerencias/.test(c.q));
    ok(b && /WHERE LOWER\(username\)/.test(b.q) && b.params[0] === 'c', 'cliente solo ve su buzón');
    consultas.length = 0;
    await llamar('GET', '/api/buzon', admin);
    const b2 = consultas.find(c => /FROM buzon_sugerencias/.test(c.q));
    ok(b2 && !/WHERE/.test(b2.q), 'soporte ve todo el buzón');
    consultas.length = 0;
    [s] = await llamar('POST', '/api/buzon', cliente, { usuario: 'OTRA PERSONA', username: 'otro', mensaje: 'hola', tipo: 'SUGERENCIA' });
    const ib = consultas.find(c => /INSERT INTO buzon_sugerencias/.test(c.q));
    ok(s === 200 && ib && ib.params[0] === 'CLIENTE PRUEBA' && ib.params[1] === 'c', 'el buzón toma el autor de la sesión, no del navegador', JSON.stringify(ib && ib.params));
    [s] = await llamar('PUT', '/api/buzon/1', cliente, { estatus: 'REVISADO' });
    ok(s === 403, 'cliente no responde el buzón', s);

    // --- KPIs y usuarios
    [s] = await llamar('GET', '/api/kpis/tiempos', cliente);
    ok(s === 403, 'cliente no ve KPIs', s);
    [s] = await llamar('GET', '/api/kpis/tiempos', admin);
    ok(s === 200, 'soporte ve KPIs', s);
    [s, j] = await llamar('GET', '/api/usuarios', cliente);
    ok(s === 200 && Array.isArray(j) && j[0] && !('gruposAsignados' in j[0]) && !('password' in j[0]), 'cliente recibe usuarios sin grupos ni contraseña');
    [s, j] = await llamar('GET', '/api/usuarios', admin);
    ok(s === 200 && j[0] && 'gruposAsignados' in j[0] && !('password' in j[0]), 'soporte recibe grupos y nunca contraseñas');

    // --- sesión vigente (los usuarios se refrescan a los 2 s de arrancar)
    await new Promise(r => setTimeout(r, 2300));
    [s] = await llamar('GET', '/api/chat/F1', cookie({ id: 3, username: 'x', nivel: 'CLIENTE', nombre: 'CLIENTE PRUEBA' }));
    ok(s === 401, 'usuario dado de baja pierde el acceso aunque su sesión no haya vencido', s);
    [s] = await llamar('GET', '/api/kpis/tiempos', cookie({ id: 4, username: 'y', nivel: 'ADMINISTRADOR', nombre: 'EX ADMIN' }));
    ok(s === 403, 'quien dejó de ser administrador pierde esos permisos de inmediato', s);
    [s] = await llamar('GET', '/api/chat/F1', cookie({ id: 99, username: 'z', nivel: 'CLIENTE', nombre: 'CLIENTE PRUEBA', iat: Math.floor(Date.now() / 1000) - 3600 }));
    ok(s === 401, 'usuario eliminado pierde el acceso', s);

    // --- límite de intentos por usuario (cada intento llega desde otra IP para saltar el límite por IP)
    let ultimo;
    for (let i = 0; i < 22; i++) {
      [ultimo, j] = await llamar('POST', '/api/login', null, { username: 'victima', password: 'mala' + i }, { 'X-Forwarded-For': `10.0.0.${i + 1}` });
    }
    ok(ultimo === 429 && j && /este usuario/.test(j.error || ''), 'tras muchos fallos el usuario se bloquea aunque cambien de IP', `${ultimo} ${j && j.error}`);
  } catch (e) { log('ERROR de prueba:', e.stack); fallas++; }
  log(fallas ? fallas + ' FALLAS' : 'TODO OK');
  process.exit(fallas ? 1 : 0);
}, 1500);
