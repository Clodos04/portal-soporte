require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// Importamos las respuestas automáticas y lógica de Centinela / Chat
const {
  obtenerMensajeCentinela,
  obtenerFlujoPreguntas,
  evaluarSiguienteRespuestaChat
} = require('./respuestasChat.cjs');

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD (variables de entorno, ver .env.example)
// ============================================================================
const requeridas = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CENTINELA_HOST', 'CENTINELA_USER', 'CENTINELA_PASSWORD', 'CENTINELA_DB'];
const faltantes = requeridas.filter(k => !process.env[k]);
if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Revisa .env.example`);
  process.exit(1);
}

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET no definido: se generó uno temporal (las sesiones se cierran al reiniciar el servidor).');
}
const COOKIE_NAME = 'cti_sesion';
const SESSION_HORAS = Number(process.env.SESSION_HORAS) || 12;
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: SESSION_HORAS * 60 * 60 * 1000
};
// Orígenes externos permitidos (el portal se sirve desde el mismo origen, por lo que normalmente queda vacío)
const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ORIGENES_PERMITIDOS.length > 0 ? ORIGENES_PERMITIDOS : false,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false, hsts: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({ origin: ORIGENES_PERMITIDOS.length > 0 ? ORIGENES_PERMITIDOS : false, credentials: true }));

// ESTO HACE QUE LA CARPETA PUBLIC SEA ACCESIBLE PÚBLICAMENTE (Soluciona el audio 404)
app.use(express.static(path.join(__dirname, 'public')));

// 1. Conexión principal para Tickets y lógica general (sav) – pool con reconexión automática
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true
});

// 2. Conexión dedicada para Centinela (usar un usuario de SOLO LECTURA, no root)
const dbCentinela = mysql.createPool({
  host: process.env.CENTINELA_HOST,
  user: process.env.CENTINELA_USER,
  password: process.env.CENTINELA_PASSWORD,
  database: process.env.CENTINELA_DB,
  port: process.env.CENTINELA_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  enableKeepAlive: true
});

db.getConnection((err, conn) => {
  if (conn) conn.release();
  if (err) {
    console.error('Error BD Tickets:', err);
  } else {
    console.log('Conectado a BD Tickets (sav)');
    // Crear automáticamente la tabla buzon_sugerencias si no existe
    const sqlTablaBuzon = `
      CREATE TABLE IF NOT EXISTS buzon_sugerencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(150) NOT NULL,
        username VARCHAR(100) DEFAULT '',
        campana VARCHAR(100) DEFAULT 'General',
        tipo VARCHAR(50) DEFAULT 'SUGERENCIA',
        mensaje TEXT NOT NULL,
        estatus VARCHAR(50) DEFAULT 'PENDIENTE',
        respuesta_admin TEXT,
        fecha_creacion DATETIME
      )
    `;
    db.query(sqlTablaBuzon, (errTabla) => {
      if (errTabla) console.error('Error al crear/verificar tabla buzon_sugerencias:', errTabla);
      else console.log('Tabla buzon_sugerencias verificada correctamente en BD sav');
    });
  }
});

dbCentinela.getConnection((err, conn) => {
  if (conn) conn.release();
  if (err) console.error('Error BD Centinela:', err);
  else console.log('Conectado a Servidor Centinela (Base de datos: Centinela)');
});

// ============================================================================
// AUTENTICACIÓN Y AUTORIZACIÓN (JWT en cookie httpOnly)
// ============================================================================
const emitirSesion = (res, usuario) => {
  const token = jwt.sign(
    { id: usuario.id, username: usuario.username, nivel: usuario.nivelNormalizado, nombre: usuario.nombreCompleto },
    JWT_SECRET,
    { expiresIn: `${SESSION_HORAS}h` }
  );
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
};

const leerSesion = (token) => {
  try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
};

const requireAuth = (req, res, next) => {
  const sesion = leerSesion(req.cookies && req.cookies[COOKIE_NAME]);
  if (!sesion) return res.status(401).json({ error: 'Sesión no válida o expirada. Inicia sesión de nuevo.' });
  req.sesion = sesion;
  next();
};

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.sesion.nivel !== 'ADMINISTRADOR') return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    next();
  });
};

const esHashBcrypt = (valor) => typeof valor === 'string' && /^\$2[aby]\$\d{2}\$/.test(valor);
const hashPassword = (plano) => bcrypt.hashSync(String(plano), 10);

// Nunca exponer la contraseña al cliente
const sanitizarUsuario = (u) => {
  const { password, ...resto } = u;
  return resto;
};

const parseJsonSeguro = (v) => {
  if (typeof v !== 'string') return v || [];
  try { return JSON.parse(v || '[]'); } catch (e) { return []; }
};

// Evita "mass assignment": solo se escriben columnas que realmente existen en la tabla (y nunca `id`)
const columnasTabla = {};
['tickets', 'encuestas'].forEach(tabla => {
  db.query(`SHOW COLUMNS FROM ${tabla}`, (err, cols) => {
    if (err) return console.error(`No se pudieron leer columnas de ${tabla}:`, err.message);
    columnasTabla[tabla] = new Set(cols.map(c => c.Field));
  });
});
// Tickets cerrados antes de existir fecha_cierre: se toma su última modificación (solo rellena los vacíos).
setTimeout(() => {
  if (columnasTabla.tickets && columnasTabla.tickets.has('fecha_cierre')) {
    db.query("UPDATE tickets SET fecha_cierre = updated_at WHERE LOWER(estatus) LIKE '%cerrado%' AND fecha_cierre IS NULL AND updated_at IS NOT NULL", (err) => {
      if (err) console.error('No se pudo rellenar fecha_cierre:', err.message);
    });
  }
}, 5000);
const filtrarColumnas = (tabla, datos) => {
  const permitidas = columnasTabla[tabla];
  if (!permitidas) return datos;
  const limpio = {};
  Object.keys(datos).forEach(k => { if (k !== 'id' && permitidas.has(k)) limpio[k] = datos[k]; });
  return limpio;
};

// ============================================================================
// AUDITORÍA DE TICKETS: quién cambió qué y cuándo
// ============================================================================
db.query(`
  CREATE TABLE IF NOT EXISTS auditoria_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(30) NOT NULL,
    usuario VARCHAR(150) NOT NULL,
    accion VARCHAR(40) NOT NULL,
    campo VARCHAR(60) DEFAULT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha DATETIME NOT NULL,
    INDEX idx_auditoria_folio (folio),
    INDEX idx_auditoria_fecha (fecha)
  )
`, (err) => { if (err) console.error('Error al crear/verificar tabla auditoria_tickets:', err.message); });

const CAMPOS_AUDITADOS = ['estatus', 'tecnico', 'grupo', 'categoria', 'subcategoria', 'elemento', 'equipo', 'resolucion', 'asunto', 'prioridad'];

const registrarAuditoria = (folio, usuario, accion, cambios = [{}]) => {
  const fecha = obtenerFechaMySQL();
  const filas = cambios.map(c => [String(folio), usuario || 'Sistema', accion, c.campo || null,
    c.anterior === undefined || c.anterior === null ? null : String(c.anterior).slice(0, 2000),
    c.nuevo === undefined || c.nuevo === null ? null : String(c.nuevo).slice(0, 2000), fecha]);
  if (filas.length === 0) return;
  db.query('INSERT INTO auditoria_tickets (folio, usuario, accion, campo, valor_anterior, valor_nuevo, fecha) VALUES ?', [filas], (err) => {
    if (err) console.error('No se pudo registrar auditoría:', err.message);
  });
};

const nombreActor = (req) => (req.sesion && (req.sesion.nombre || req.sesion.username)) || 'Sistema';

// Configuración de conexiones de Socket.io en tiempo real (requiere sesión válida)
io.use((socket, next) => {
  const cookies = Object.fromEntries(
    String(socket.handshake.headers.cookie || '').split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const i = c.indexOf('=');
      return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const sesion = leerSesion(cookies[COOKIE_NAME]);
  if (!sesion) return next(new Error('No autorizado'));
  socket.data.sesion = sesion;
  next();
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado en tiempo real: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================================
// FUNCIONES DE FECHA Y HORA EXACTA DE MÉXICO
// ============================================================================
const obtenerFechaHoraMexico = () => {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  return {
    fechaSolo: `${yyyy}-${mm}-${dd}`,
    fechaHora: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    horaCorta: `${hh}:${min}`,
    prefijoFolio: `${dd}${mm}${String(yyyy).slice(-2)}`
  };
};

const obtenerFechaMySQL = () => obtenerFechaHoraMexico().fechaHora;

// Login (Soportando solo CLIENTE y ADMINISTRADOR)
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' }
});

const handleLogin = (req, res) => {
  const username = String((req.body && req.body.username) || '');
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });

  db.query('SELECT * FROM usuarios WHERE username = ? AND estatus = "ACTIVO" LIMIT 1', [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas o usuario inactivo.' });
    const usuario = results[0];

    // Compatibilidad: si la contraseña aún está en texto plano, se valida y se migra a bcrypt automáticamente.
    let valida = false;
    if (esHashBcrypt(usuario.password)) {
      valida = bcrypt.compareSync(password, usuario.password);
    } else {
      const a = Buffer.from(String(usuario.password || ''));
      const b = Buffer.from(password);
      valida = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (valida) {
        db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashPassword(password), usuario.id], (errMig) => {
          if (errMig) console.error('No se pudo migrar la contraseña a bcrypt:', errMig.message);
        });
      }
    }
    if (!valida) return res.status(401).json({ error: 'Credenciales incorrectas o usuario inactivo.' });

    const nivelUpper = (usuario.nivel || '').toUpperCase();
    const rolNormalizado = nivelUpper.includes('ADMIN') ? 'support' : 'client';
    emitirSesion(res, {
      id: usuario.id,
      username: usuario.username,
      nivelNormalizado: nivelUpper.includes('ADMIN') ? 'ADMINISTRADOR' : 'CLIENTE',
      nombreCompleto: `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim()
    });

    res.json({
      success: true,
      user: {
        id: usuario.id,
        name: `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim(),
        role: rolNormalizado,
        username: usuario.username,
        nivel: nivelUpper.includes('ADMIN') ? 'ADMINISTRADOR' : 'CLIENTE',
        gruposAsignados: usuario.gruposAsignados,
        campana: usuario.campana || 'General',
        nombre: usuario.nombre || '',
        paterno: usuario.paterno || '',
        materno: usuario.materno || ''
      }
    });
  });
};
app.post(['/api/login', '/login'], limitadorLogin, handleLogin);

app.post(['/api/logout', '/logout'], (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ success: true });
});

// A partir de aquí TODA la API requiere sesión. Las rutas de escritura sensibles piden además rol ADMINISTRADOR.
const rutasAdminEscritura = [
  { metodo: 'POST', ruta: /^\/(api\/)?tickets\/masivo\/?$/ },
  { metodo: 'POST', ruta: /^\/(api\/)?tickets\/[^/]+\/copiar\/?$/ },
  { metodo: 'DELETE', ruta: /^\/(api\/)?tickets\/[^/]+\/?$/ },
  { metodo: 'POST', ruta: /^\/(api\/)?usuarios\/?$/ },
  { metodo: 'PUT', ruta: /^\/(api\/)?usuarios\/[^/]+\/?$/ },
  { metodo: 'DELETE', ruta: /^\/(api\/)?usuarios\/[^/]+\/?$/ },
  { metodo: 'POST', ruta: /^\/(api\/)?grupos\/?$/ },
  { metodo: 'DELETE', ruta: /^\/(api\/)?grupos\/[^/]+\/?$/ },
  { metodo: 'POST', ruta: /^\/(api\/)?categorias\/sincronizar\/?$/ },
  { metodo: 'PUT', ruta: /^\/(CTI\/)?(api\/)?buzon\/[^/]+\/?$/ },
  { metodo: 'DELETE', ruta: /^\/(CTI\/)?(api\/)?buzon\/[^/]+\/?$/ },
  { metodo: 'GET', ruta: /^\/(api\/)?tickets\/[^/]+\/historial\/?$/ }
];
app.use((req, res, next) => {
  const esApi = req.path.startsWith('/api/') || req.path.startsWith('/CTI/api/') ||
    /^\/(tickets|usuarios|grupos|categorias|subcategorias|elementos|campanas|centinela|chat|encuestas|kpis|buzon)(\/|$)/.test(req.path);
  if (!esApi || req.path === '/api/login' || req.path === '/login' || req.path === '/api/logout' || req.path === '/logout' || req.path === '/api/me' || req.path === '/me' || req.path === '/api/health') return next();
  const requiereAdmin = rutasAdminEscritura.some(r => r.metodo === req.method && r.ruta.test(req.path));
  return (requiereAdmin ? requireAdmin : requireAuth)(req, res, next);
});

// Estado de salud para monitoreo (UptimeRobot, Uptime Kuma, Easypanel…). Sin sesión y sin datos sensibles:
// solo dice si el portal y sus bases de datos responden. Devuelve 503 si la BD principal falla.
const limitadorSalud = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const probarBD = (pool) => new Promise((resolve) => {
  const limite = setTimeout(() => resolve(false), 3000);
  pool.query('SELECT 1', (err) => { clearTimeout(limite); resolve(!err); });
});
app.get('/api/health', limitadorSalud, async (req, res) => {
  const [principal, centinela] = await Promise.all([probarBD(db), probarBD(dbCentinela)]);
  const estado = principal ? (centinela ? 'ok' : 'degradado') : 'caido';
  res.status(principal ? 200 : 503).json({
    estado,
    baseDatos: principal ? 'ok' : 'error',
    centinela: centinela ? 'ok' : 'error',
    tiempoActivoSegundos: Math.round(process.uptime())
  });
});

// Sesión actual (permite restaurar la sesión al recargar la página)
// Sin sesión responde 200 con user:null (así el navegador no registra un error 401 al abrir el login)
app.get(['/api/me', '/me'], (req, res) => {
  const s = leerSesion(req.cookies && req.cookies[COOKIE_NAME]);
  if (!s) return res.json({ user: null });
  db.query('SELECT * FROM usuarios WHERE id = ? AND estatus = "ACTIVO" LIMIT 1', [s.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.json({ user: null });
    const u = results[0];
    const esAdmin = (u.nivel || '').toUpperCase().includes('ADMIN');
    res.json({ user: {
      id: u.id, username: u.username, name: `${u.nombre || ''} ${u.paterno || ''}`.trim(),
      role: esAdmin ? 'support' : 'client', nivel: esAdmin ? 'ADMINISTRADOR' : 'CLIENTE',
      campana: u.campana || 'General', nombre: u.nombre || '', paterno: u.paterno || '', materno: u.materno || '',
      gruposAsignados: parseJsonSeguro(u.gruposAsignados)
    } });
  });
});

// Tickets (CRUD)
app.get(['/api/tickets', '/tickets'], (req, res) => {
  const formatear = (results) => results.map(t => ({ ...t, notas: parseJsonSeguro(t.notas) }));

  // Carga reciente: /api/tickets?reciente=90 devuelve TODOS los tickets activos más los cerrados en los últimos
  // N días (1–3650). La cabecera X-Total-Count trae el total de la tabla para avisar que hay historial sin cargar.
  if (req.query.reciente !== undefined) {
    const dias = Math.min(Math.max(parseInt(req.query.reciente, 10) || 90, 1), 3650);
    const momentoCierre = (columnasTabla.tickets && columnasTabla.tickets.has('fecha_cierre'))
      ? 'COALESCE(fecha_cierre, updated_at, created_at)' : 'COALESCE(updated_at, created_at)';
    return db.query('SELECT COUNT(*) AS total FROM tickets', (errCount, cnt) => {
      if (errCount) return res.status(500).json({ error: errCount.message });
      db.query(`SELECT * FROM tickets WHERE LOWER(estatus) NOT LIKE '%cerrado%' OR ${momentoCierre} >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY id DESC`, [dias], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.set('X-Total-Count', String(cnt[0].total));
        res.json(formatear(results));
      });
    });
  }

  // Paginación opcional: /api/tickets?limit=50&page=1&estatus=activos|cerrados&q=texto
  // Sin "limit" se devuelve la lista completa (compatibilidad con el portal actual).
  if (req.query.limit !== undefined) {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const condiciones = [];
    const params = [];
    if (req.query.estatus === 'cerrados') condiciones.push("LOWER(estatus) LIKE '%cerrado%'");
    if (req.query.estatus === 'activos') condiciones.push("LOWER(estatus) NOT LIKE '%cerrado%'");
    const q = String(req.query.q || '').trim();
    if (q) {
      condiciones.push('(folio LIKE ? OR asunto LIKE ? OR creador LIKE ? OR equipo LIKE ? OR tecnico LIKE ? OR categoria LIKE ?)');
      for (let i = 0; i < 6; i++) params.push(`%${q}%`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    return db.query(`SELECT COUNT(*) AS total FROM tickets ${where}`, params, (errCount, cnt) => {
      if (errCount) return res.status(500).json({ error: errCount.message });
      db.query(`SELECT * FROM tickets ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.set('X-Total-Count', String(cnt[0].total));
        res.json(formatear(results));
      });
    });
  }

  db.query('SELECT * FROM tickets ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(formatear(results));
  });
});

app.get(['/api/tickets/contar-hoy', '/tickets/contar-hoy'], (req, res) => {
  const { fechaSolo, prefijoFolio } = obtenerFechaHoraMexico();
  const query = "SELECT COUNT(*) as total FROM tickets WHERE DATE(fecha) = ?";
  db.query(query, [fechaSolo], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ totalHoy: results[0].total, fechaHoy: fechaSolo, prefijoFolio });
  });
});

const continuarInsercionTicket = (ticketData, res, actor = 'Sistema') => {
  const { fechaSolo, fechaHora, horaCorta } = obtenerFechaHoraMexico();
  const anioMesActual = fechaSolo.slice(0, 7);
  const catUpper = (ticketData.categoria || '').toUpperCase();
  const esDispositivo = catUpper.includes('DISPOSITIVO') || catUpper.includes('HARDWARE');

  const guardarTicketYPrimerMensaje = (folioPrevio = null) => {
    const flujo = obtenerFlujoPreguntas(ticketData, folioPrevio);
    const primerMensaje = flujo[0];

    for (let key in ticketData) {
      if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
        ticketData[key] = JSON.stringify(ticketData[key]);
      }
    }
    ticketData.fecha = fechaSolo;
    ticketData.created_at = fechaHora;

    db.query('INSERT INTO tickets SET ?', filtrarColumnas('tickets', ticketData), (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [ticketData.folio, 'Sistema', primerMensaje, horaCorta], () => {
        io.emit('ticketActualizado', { folio: ticketData.folio });
        registrarAuditoria(ticketData.folio, actor, 'CREADO', [{ campo: 'asunto', anterior: null, nuevo: ticketData.asunto || ticketData.subcategoria || '' }]);
        res.json({ message: 'Ticket creado exitosamente', id: result.insertId, folio: ticketData.folio, fecha: fechaSolo, folioPrevio });
      });
    });
  };

  if (esDispositivo && ticketData.equipo && ticketData.equipo !== 'Ninguno' && ticketData.subcategoria) {
    const queryPrevio = `
      SELECT folio FROM tickets 
      WHERE equipo = ? 
      AND subcategoria = ? 
      AND fecha LIKE ? 
      ORDER BY id ASC LIMIT 1
    `;
    db.query(queryPrevio, [ticketData.equipo, ticketData.subcategoria, `${anioMesActual}%`], (errPrev, resPrev) => {
      const folioAnterior = (!errPrev && resPrev && resPrev.length > 0) ? resPrev[0].folio : null;
      guardarTicketYPrimerMensaje(folioAnterior);
    });
  } else {
    guardarTicketYPrimerMensaje(null);
  }
};

app.post(['/api/tickets', '/tickets'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.archivos;
  delete ticketData.yaGuardadoEnBD;

  const { fechaSolo, fechaHora, horaCorta, prefijoFolio } = obtenerFechaHoraMexico();

  // Contamos cuántos tickets hay hoy en la BD para garantizar formato DDMMYYNN sin duplicados
  db.query('SELECT folio FROM tickets WHERE DATE(fecha) = ? OR folio LIKE ?', [fechaSolo, `${prefijoFolio}%`], (errCount, rowsHoy) => {
    if (errCount) return res.status(500).json({ error: errCount.message });

    let maxConsecutivo = rowsHoy.length;
    rowsHoy.forEach(r => {
      const fStr = String(r.folio || '');
      if (fStr.startsWith(prefijoFolio) && fStr.length >= 8) {
        const num = parseInt(fStr.slice(6), 10);
        if (!isNaN(num) && num > maxConsecutivo) {
          maxConsecutivo = num;
        }
      }
    });

    const siguienteConsecutivo = String(maxConsecutivo + 1).padStart(2, '0');
    const folioOficial = `${prefijoFolio}${siguienteConsecutivo}`; // Ej: 16102601

    // Forzamos siempre el formato DDMMYYNN generado por el servidor
    ticketData.folio = folioOficial;

    if (ticketData.tipo_solicitud === 'CENTINELA' && ticketData.equipo && ticketData.subcategoria) {
      const anioMesActual = fechaSolo.slice(0, 7);

      const queryMesActual = `
        SELECT * FROM tickets 
        WHERE equipo = ? 
        AND subcategoria = ? 
        AND fecha LIKE ?
        ORDER BY id ASC LIMIT 1
      `;

      db.query(queryMesActual, [ticketData.equipo, ticketData.subcategoria, `${anioMesActual}%`], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al verificar mes: ' + err.message });
        
        const esSubsecuente = results.length > 0;
        const folioAnterior = esSubsecuente ? results[0].folio : null;

        for (let key in ticketData) {
          if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
            ticketData[key] = JSON.stringify(ticketData[key]);
          }
        }
        ticketData.fecha = fechaSolo;
        ticketData.created_at = fechaHora;

        db.query('INSERT INTO tickets SET ?', filtrarColumnas('tickets', ticketData), (err, result) => {
          if (err) return res.status(500).json({ error: err.message });

          const nuevoFolio = ticketData.folio;
          const textoMensaje = obtenerMensajeCentinela(nuevoFolio, esSubsecuente, folioAnterior);

          if (esSubsecuente) {
            const horaMexActual = obtenerFechaMySQL();
            db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600', updated_at = ?, fecha_cierre = ? WHERE folio = ?", [horaMexActual, horaMexActual, nuevoFolio], (errCierre) => {
              // Si la columna fecha_cierre aún no existe (migración pendiente), se cierra igual sin ella
              if (errCierre) db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600', updated_at = ? WHERE folio = ?", [horaMexActual, nuevoFolio]);
            });
            registrarAuditoria(nuevoFolio, 'Sistema', 'CIERRE_AUTOMATICO', [{ campo: 'estatus', anterior: 'Abierto', nuevo: 'Cerrado (reporte subsecuente del mes)' }]);
          }

          db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [nuevoFolio, 'Sistema', textoMensaje, horaCorta], (errChat) => {
            if (errChat) console.error("Error al registrar mensaje en chat:", errChat);
            io.emit('ticketActualizado', { folio: nuevoFolio });
            registrarAuditoria(nuevoFolio, nombreActor(req), 'CREADO', [{ campo: 'asunto', anterior: null, nuevo: ticketData.asunto || ticketData.subcategoria || '' }]);
            res.json({ message: 'Ticket creado exitosamente', id: result.insertId, folio: nuevoFolio, esSubsecuente, fecha: fechaSolo });
          });
        });
      });
    } else {
      continuarInsercionTicket(ticketData, res, nombreActor(req));
    }
  });
});

app.put(['/api/tickets/:folio', '/tickets/:folio'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.folio;
  delete ticketData.archivos;
  delete ticketData.yaGuardadoEnBD;
  delete ticketData.fecha_cierre; // la fecha de cierre la decide el servidor, nunca el cliente
  for (let key in ticketData) {
    if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
      ticketData[key] = JSON.stringify(ticketData[key]);
    }
  }
  ticketData.updated_at = obtenerFechaMySQL();
  const actor = nombreActor(req);

  // Se lee el ticket antes de actualizarlo para poder registrar qué campos cambiaron
  db.query('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [req.params.folio], (errPrev, prev) => {
    const anterior = (!errPrev && prev && prev.length > 0) ? prev[0] : null;

    // El SLA se mide hasta el momento del cierre. Solo se fija al pasar a Cerrado y se limpia al reabrir;
    // editar un ticket ya cerrado (notas, técnico…) no mueve esa fecha.
    if (ticketData.estatus !== undefined) {
      const seraCerrado = String(ticketData.estatus).toLowerCase().includes('cerrado');
      const yaCerrado = anterior && String(anterior.estatus || '').toLowerCase().includes('cerrado');
      if (!seraCerrado) ticketData.fecha_cierre = null;
      else if (!yaCerrado) ticketData.fecha_cierre = ticketData.updated_at;
      else if (!anterior.fecha_cierre) ticketData.fecha_cierre = anterior.updated_at; // ticket cerrado antes de existir esta columna
    }

    db.query('UPDATE tickets SET ? WHERE folio = ?', [filtrarColumnas('tickets', ticketData), req.params.folio], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });

      if (anterior) {
        const cambios = CAMPOS_AUDITADOS
          .filter(c => ticketData[c] !== undefined && String(ticketData[c] ?? '') !== String(anterior[c] ?? ''))
          .map(c => ({ campo: c, anterior: anterior[c], nuevo: ticketData[c] }));
        if (ticketData.notas !== undefined && String(ticketData.notas ?? '') !== String(anterior.notas ?? '')) {
          cambios.push({ campo: 'notas', anterior: null, nuevo: 'Notas actualizadas' });
        }
        const accion = cambios.some(c => c.campo === 'estatus') ? 'CAMBIO_ESTATUS'
          : cambios.some(c => c.campo === 'tecnico') ? 'ASIGNACION' : 'EDICION';
        registrarAuditoria(req.params.folio, actor, accion, cambios);
      }

      io.emit('ticketActualizado', { folio: req.params.folio });
      res.json({ message: 'Ticket actualizado correctamente' });
    });
  });
});

// ---------------------------------------------------------------------------
// Acciones sobre varios tickets (solo ADMINISTRADOR, ver reglas globales)
// ---------------------------------------------------------------------------
const consulta = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const colorDeEstatus = (estatus) => {
  const e = String(estatus || '').toUpperCase();
  if (e === 'CERRADO') return 'bg-red-500';
  if (e === 'EN PROCESO') return 'bg-orange-500';
  return 'bg-green-500';
};

// Siguiente folio DDMMYYNN (mismo formato que al crear un ticket)
const generarFolio = async () => {
  const { fechaSolo, prefijoFolio } = obtenerFechaHoraMexico();
  const filas = await consulta('SELECT folio FROM tickets WHERE DATE(fecha) = ? OR folio LIKE ?', [fechaSolo, `${prefijoFolio}%`]);
  let maximo = filas.length;
  filas.forEach(r => {
    const f = String(r.folio || '');
    if (f.startsWith(prefijoFolio) && f.length >= 8) {
      const n = parseInt(f.slice(6), 10);
      if (!isNaN(n) && n > maximo) maximo = n;
    }
  });
  return `${prefijoFolio}${String(maximo + 1).padStart(2, '0')}`;
};

const MAX_FOLIOS_MASIVO = 200;

// Asigna grupo, técnico y/o estatus a varios folios a la vez. Cada cambio queda en la auditoría.
app.post(['/api/tickets/masivo', '/tickets/masivo'], async (req, res) => {
  const folios = Array.isArray(req.body && req.body.folios)
    ? [...new Set(req.body.folios.map(f => String(f).trim()).filter(Boolean))] : [];
  if (folios.length === 0) return res.status(400).json({ error: 'Selecciona al menos un folio.' });
  if (folios.length > MAX_FOLIOS_MASIVO) return res.status(400).json({ error: `Máximo ${MAX_FOLIOS_MASIVO} folios por operación.` });

  const cambios = {};
  ['grupo', 'tecnico', 'estatus'].forEach(campo => {
    const valor = req.body[campo];
    if (typeof valor === 'string' && valor.trim() !== '') cambios[campo] = valor.trim().slice(0, 150);
  });
  if (Object.keys(cambios).length === 0) return res.status(400).json({ error: 'Indica qué cambiar: grupo, técnico o estatus.' });
  if (cambios.estatus) cambios.colorEstatus = colorDeEstatus(cambios.estatus);

  const actor = nombreActor(req);
  const actualizados = [];
  const noEncontrados = [];
  try {
    for (const folio of folios) {
      const previo = await consulta('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [folio]);
      if (previo.length === 0) { noEncontrados.push(folio); continue; }
      const datos = { ...cambios, updated_at: obtenerFechaMySQL() };
      if (cambios.estatus) {
        const seraCerrado = cambios.estatus.toLowerCase().includes('cerrado');
        const yaCerrado = String(previo[0].estatus || '').toLowerCase().includes('cerrado');
        if (!seraCerrado) datos.fecha_cierre = null;
        else if (!yaCerrado) datos.fecha_cierre = datos.updated_at;
        else if (!previo[0].fecha_cierre) datos.fecha_cierre = previo[0].updated_at;
      }
      await consulta('UPDATE tickets SET ? WHERE folio = ?', [filtrarColumnas('tickets', datos), folio]);
      const detalle = CAMPOS_AUDITADOS
        .filter(c => cambios[c] !== undefined && String(cambios[c]) !== String(previo[0][c] ?? ''))
        .map(c => ({ campo: c, anterior: previo[0][c], nuevo: cambios[c] }));
      if (detalle.length > 0) registrarAuditoria(folio, actor, 'EDICION_MASIVA', detalle);
      actualizados.push(folio);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message, actualizados });
  }
  actualizados.forEach(folio => io.emit('ticketActualizado', { folio }));
  res.json({ message: 'Folios actualizados', actualizados, noEncontrados });
});

// Crea copias de un ticket (mismo asunto, categoría, grupo, etc.) como solicitudes nuevas y abiertas.
app.post(['/api/tickets/:folio/copiar', '/tickets/:folio/copiar'], async (req, res) => {
  const copias = Math.min(Math.max(parseInt(req.body && req.body.copias, 10) || 1, 1), 10);
  const actor = nombreActor(req);
  try {
    const origen = await consulta('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [req.params.folio]);
    if (origen.length === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    const { fechaSolo, fechaHora } = obtenerFechaHoraMexico();
    const nuevos = [];
    for (let i = 0; i < copias; i++) {
      const folio = await generarFolio();
      const datos = { ...origen[0] };
      ['id', 'notas', 'resolucion', 'updated_at', 'fecha_cierre'].forEach(k => delete datos[k]);
      Object.assign(datos, {
        folio, fecha: fechaSolo, created_at: fechaHora,
        estatus: 'Abierto', colorEstatus: 'bg-green-500', tecnico: 'Sin Asignar'
      });
      await consulta('INSERT INTO tickets SET ?', filtrarColumnas('tickets', datos));
      registrarAuditoria(folio, actor, 'CREADO', [{ campo: 'asunto', anterior: null, nuevo: `Copia del folio ${req.params.folio}` }]);
      nuevos.push(folio);
    }
    nuevos.forEach(folio => io.emit('ticketActualizado', { folio }));
    res.json({ message: 'Copias creadas', folios: nuevos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Archivos adjuntos de los tickets. Se guardan en disco (UPLOADS_DIR, ¡debe ser un volumen permanente!)
// y en la BD solo queda el registro. El archivo llega como binario crudo, con el nombre en una cabecera.
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'));
const ADJUNTO_MAX_BYTES = (parseInt(process.env.ADJUNTO_MAX_MB, 10) || 10) * 1024 * 1024;
const ADJUNTOS_POR_TICKET = 5;
const EXTENSIONES_ADJUNTO = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv', '.log': 'text/plain',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('No se pudo crear la carpeta de adjuntos:', e.message); }

db.query(`
  CREATE TABLE IF NOT EXISTS ticket_adjuntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(80) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    tamano INT NOT NULL,
    subido_por VARCHAR(150) DEFAULT '',
    created_at DATETIME,
    INDEX idx_adjuntos_folio (folio)
  )
`, (err) => { if (err) console.error('Error al crear/verificar tabla ticket_adjuntos:', err.message); });

const rawAdjunto = express.raw({ type: () => true, limit: ADJUNTO_MAX_BYTES });

app.post(['/api/tickets/:folio/adjuntos', '/tickets/:folio/adjuntos'], (req, res, next) => {
  rawAdjunto(req, res, (err) => {
    if (err) return res.status(err.status === 413 ? 413 : 400).json({ error: err.status === 413 ? `El archivo supera el máximo de ${ADJUNTO_MAX_BYTES / 1024 / 1024} MB.` : 'No se pudo leer el archivo.' });
    next();
  });
}, async (req, res) => {
  try {
    const folio = req.params.folio;
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });
    let nombre = '';
    try { nombre = decodeURIComponent(String(req.headers['x-nombre-archivo'] || '')); } catch (e) { /* nombre inválido */ }
    nombre = path.basename(nombre).replace(/[\x00-\x1f]/g, '').slice(0, 200);
    const extension = path.extname(nombre).toLowerCase();
    if (!nombre || !EXTENSIONES_ADJUNTO[extension]) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Usa imágenes, PDF, Office, TXT, CSV o ZIP.' });
    }
    const ticket = await consulta('SELECT folio FROM tickets WHERE folio = ? LIMIT 1', [folio]);
    if (ticket.length === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    const [{ total }] = await consulta('SELECT COUNT(*) AS total FROM ticket_adjuntos WHERE folio = ?', [folio]);
    if (total >= ADJUNTOS_POR_TICKET) return res.status(400).json({ error: `Máximo ${ADJUNTOS_POR_TICKET} archivos por ticket.` });

    const nombreArchivo = crypto.randomBytes(16).toString('hex') + extension;
    await fs.promises.writeFile(path.join(UPLOADS_DIR, nombreArchivo), buffer);
    const resultado = await consulta(
      'INSERT INTO ticket_adjuntos (folio, nombre_original, nombre_archivo, tipo, tamano, subido_por, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [folio, nombre, nombreArchivo, EXTENSIONES_ADJUNTO[extension], buffer.length, nombreActor(req), obtenerFechaMySQL()]
    );
    registrarAuditoria(folio, nombreActor(req), 'ADJUNTO', [{ campo: 'adjunto', anterior: null, nuevo: nombre }]);
    io.emit('ticketActualizado', { folio });
    res.json({ id: resultado.insertId, nombre, tamano: buffer.length });
  } catch (err) {
    console.error('Error al guardar adjunto:', err.message);
    res.status(500).json({ error: 'No se pudo guardar el archivo.' });
  }
});

app.get(['/api/tickets/:folio/adjuntos', '/tickets/:folio/adjuntos'], async (req, res) => {
  try {
    const filas = await consulta('SELECT id, nombre_original AS nombre, tipo, tamano, subido_por AS subidoPor, created_at AS fecha FROM ticket_adjuntos WHERE folio = ? ORDER BY id', [req.params.folio]);
    res.json(filas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Descarga siempre como archivo (attachment) y sin que el navegador adivine el tipo: un HTML subido no se ejecuta.
app.get(['/api/adjuntos/:id', '/adjuntos/:id'], async (req, res) => {
  try {
    const filas = await consulta('SELECT * FROM ticket_adjuntos WHERE id = ? LIMIT 1', [parseInt(req.params.id, 10) || 0]);
    if (filas.length === 0) return res.status(404).json({ error: 'Archivo no encontrado.' });
    const a = filas[0];
    const ruta = path.join(UPLOADS_DIR, path.basename(a.nombre_archivo));
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'El archivo ya no está en el servidor.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Type', a.tipo);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.nombre_original)}`);
    fs.createReadStream(ruta).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete(['/api/adjuntos/:id', '/adjuntos/:id'], async (req, res) => {
  if (req.sesion.nivel !== 'ADMINISTRADOR') return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
  try {
    const filas = await consulta('SELECT * FROM ticket_adjuntos WHERE id = ? LIMIT 1', [parseInt(req.params.id, 10) || 0]);
    if (filas.length === 0) return res.status(404).json({ error: 'Archivo no encontrado.' });
    await consulta('DELETE FROM ticket_adjuntos WHERE id = ?', [filas[0].id]);
    fs.promises.unlink(path.join(UPLOADS_DIR, path.basename(filas[0].nombre_archivo))).catch(() => {});
    registrarAuditoria(filas[0].folio, nombreActor(req), 'ADJUNTO_ELIMINADO', [{ campo: 'adjunto', anterior: filas[0].nombre_original, nuevo: null }]);
    io.emit('ticketActualizado', { folio: filas[0].folio });
    res.json({ message: 'Archivo eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Elimina un ticket. Antes se deja en la auditoría quién lo hizo y un resumen de lo que contenía.
app.delete(['/api/tickets/:folio', '/tickets/:folio'], async (req, res) => {
  try {
    const previo = await consulta('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [req.params.folio]);
    if (previo.length === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    const t = previo[0];
    const resumen = [t.asunto, t.categoria, t.grupo, t.estatus, t.creador].filter(Boolean).join(' | ');
    registrarAuditoria(req.params.folio, nombreActor(req), 'ELIMINADO', [{ campo: 'ticket', anterior: resumen, nuevo: null }]);
    // Los archivos adjuntos se borran junto con el ticket, para no dejar archivos huérfanos en el disco
    const adjuntos = await consulta('SELECT nombre_archivo FROM ticket_adjuntos WHERE folio = ?', [req.params.folio]);
    await consulta('DELETE FROM ticket_adjuntos WHERE folio = ?', [req.params.folio]);
    adjuntos.forEach(a => fs.promises.unlink(path.join(UPLOADS_DIR, path.basename(a.nombre_archivo))).catch(() => {}));
    await consulta('DELETE FROM tickets WHERE folio = ?', [req.params.folio]);
    io.emit('ticketActualizado', { folio: req.params.folio });
    res.json({ message: 'Ticket eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial de cambios de un ticket (solo ADMINISTRADOR, ver reglas globales)
app.get(['/api/tickets/:folio/historial', '/tickets/:folio/historial'], (req, res) => {
  db.query('SELECT id, folio, usuario, accion, campo, valor_anterior, valor_nuevo, fecha FROM auditoria_tickets WHERE folio = ? ORDER BY id ASC',
    [req.params.folio], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
});

app.get(['/api/centinela/datos', '/centinela/datos'], (req, res) => {
  dbCentinela.query('SELECT idcamp, `desc` AS nombre FROM Camp', (err, campanasRes) => {
    if (err) return res.status(500).json({ error: 'Error al consultar Camp: ' + err.message });
    dbCentinela.query('SELECT idIPs, ip, Nodo AS equipo, camp AS idcamp FROM IPs WHERE Nodo IS NOT NULL AND Nodo != ""', (err, ipsRes) => {
      if (err) return res.status(500).json({ error: 'Error al consultar IPs: ' + err.message });
      res.json({ campanas: campanasRes, equipos: ipsRes });
    });
  });
});

app.get(['/api/campanas', '/campanas'], (req, res) => {
  dbCentinela.query('SELECT `desc` AS nombre FROM Camp', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(c => c.nombre));
  });
});

app.get(['/api/chat/:folio', '/chat/:folio'], (req, res) => {
  db.query('SELECT * FROM mensajes_chat WHERE folio = ? ORDER BY id ASC', [req.params.folio], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener mensajes' });
    res.json(results);
  });
});

app.post(['/api/chat', '/chat'], (req, res) => {
  const { folio, remitente, texto, hora } = req.body;
  const { fechaSolo, horaCorta } = obtenerFechaHoraMexico();
  const horaActual = hora || horaCorta;
  const anioMesActual = fechaSolo.slice(0, 7);

  db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [folio, remitente, texto, horaActual], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al guardar mensaje' });

    io.emit('nuevoMensajeChat', { folio });

    if (!remitente || remitente.toUpperCase() === 'SISTEMA') {
      return res.json({ success: true, id: result.insertId });
    }

    db.query('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [folio], (errTicket, ticketsRes) => {
      if (errTicket || !ticketsRes || ticketsRes.length === 0) {
        return res.json({ success: true, id: result.insertId });
      }

      const ticket = ticketsRes[0];

      db.query('SELECT COUNT(*) AS totalSistema FROM mensajes_chat WHERE folio = ? AND remitente = "Sistema"', [folio], (errCount, countRes) => {
        if (errCount || !countRes) {
          return res.json({ success: true, id: result.insertId });
        }

        const mensajesDelSistema = countRes[0].totalSistema;

        const queryPrevio = `
          SELECT folio FROM tickets 
          WHERE equipo = ? 
          AND subcategoria = ? 
          AND fecha LIKE ? 
          AND id < ? 
          ORDER BY id ASC LIMIT 1
        `;

        db.query(queryPrevio, [ticket.equipo, ticket.subcategoria, `${anioMesActual}%`, ticket.id], (errPrev, resPrev) => {
          const folioAnteriorMes = (!errPrev && resPrev && resPrev.length > 0) ? resPrev[0].folio : null;

          const evaluacion = evaluarSiguienteRespuestaChat(ticket, remitente, texto, mensajesDelSistema, folioAnteriorMes);

          if (evaluacion && evaluacion.textoRespuesta) {
            if (evaluacion.cerrarTicket) {
              const horaMexActual = obtenerFechaMySQL();
              db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600', updated_at = ?, fecha_cierre = ? WHERE folio = ?", [horaMexActual, horaMexActual, folio], (errCierre) => {
                if (errCierre) db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600', updated_at = ? WHERE folio = ?", [horaMexActual, folio]);
              });
              registrarAuditoria(folio, 'Sistema', 'CIERRE_AUTOMATICO', [{ campo: 'estatus', anterior: ticket.estatus, nuevo: 'Cerrado (flujo de chat)' }]);
            }
            db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [folio, 'Sistema', evaluacion.textoRespuesta, horaActual], () => {
              io.emit('nuevoMensajeChat', { folio });
              io.emit('ticketActualizado', { folio });
              return res.json({ success: true, id: result.insertId, cerradoAutomatico: evaluacion.cerrarTicket });
            });
          } else {
            return res.json({ success: true, id: result.insertId });
          }
        });
      });
    });
  });
});

app.get(['/api/usuarios', '/usuarios'], (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const usuariosFormateados = results.map(u => {
      let grupos = u.gruposAsignados;
      if (typeof grupos === 'string') {
        try { grupos = JSON.parse(grupos); } catch (e) { grupos = []; }
      }
      return { ...sanitizarUsuario(u), gruposAsignados: grupos || [] };
    });
    res.json(usuariosFormateados);
  });
});

// Alta de usuario (solo ADMINISTRADOR, ver middleware global)
app.post(['/api/usuarios', '/usuarios'], (req, res) => {
  const { nombre, paterno, materno, campana, username, password, estatus, nivel, gruposAsignados } = req.body;
  if (!username || !String(username).trim() || !password || !String(password).trim()) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }
  const gruposStr = Array.isArray(gruposAsignados) ? JSON.stringify(gruposAsignados) : (gruposAsignados || '[]');
  db.query(
    'INSERT INTO usuarios (nombre, paterno, materno, campana, username, password, estatus, nivel, gruposAsignados) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, paterno, materno, campana, String(username).trim(), hashPassword(String(password).trim()), estatus || 'ACTIVO', nivel || 'CLIENTE', gruposStr],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Usuario creado', id: result.insertId });
    }
  );
});

app.put(['/api/usuarios/:id', '/usuarios/:id'], (req, res) => {
  const { id } = req.params;
  const { nombre, paterno, materno, campana, username, estatus, nivel, gruposAsignados, password } = req.body;
  const gruposStr = Array.isArray(gruposAsignados) ? JSON.stringify(gruposAsignados) : (gruposAsignados || '[]');
  // La contraseña solo se cambia si se envía una nueva (en blanco = conservar la actual)
  const cambiarPass = typeof password === 'string' && password.trim() !== '';
  const campos = 'nombre = ?, paterno = ?, materno = ?, campana = ?, username = ?, estatus = ?, nivel = ?, gruposAsignados = ?' + (cambiarPass ? ', password = ?' : '');
  const valores = [nombre, paterno, materno, campana, username, estatus, nivel, gruposStr];
  if (cambiarPass) valores.push(hashPassword(password.trim()));
  valores.push(id);
  db.query(`UPDATE usuarios SET ${campos} WHERE id = ?`, valores, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el usuario.' });
    res.json({ message: 'Usuario actualizado correctamente' });
  });
});

app.delete(['/api/usuarios/:id', '/usuarios/:id'], (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el usuario.' });
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});

app.get(['/api/grupos', '/grupos'], (req, res) => {
  db.query('SELECT nombre FROM grupos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(g => g.nombre));
  });
});

app.post(['/api/grupos', '/grupos'], (req, res) => {
  db.query('INSERT INTO grupos (nombre) VALUES (?)', [req.body.nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo creado', id: result.insertId });
  });
});

app.delete(['/api/grupos/:nombre', '/grupos/:nombre'], (req, res) => {
  db.query('DELETE FROM grupos WHERE nombre = ?', [req.params.nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo eliminado' });
  });
});

app.get(['/api/categorias', '/categorias'], (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const categoriasFormateadas = results.map(cat => {
      let subcats = [];
      if (typeof cat.subcategorias === 'string') {
        try { subcats = JSON.parse(cat.subcategorias || '[]'); } catch (e) { subcats = []; }
      } else if (Array.isArray(cat.subcategorias)) {
        subcats = cat.subcategorias;
      }

      subcats = subcats.map(sub => {
        if (typeof sub === 'object' && sub !== null) {
          const fechaSub = sub.fecAlta || sub.fec_alta || cat.fec_alta || '13/10/2026';
          return { ...sub, fecAlta: fechaSub, fec_alta: fechaSub, elementos: Array.isArray(sub.elementos) ? sub.elementos : [] };
        }
        return sub;
      });

      const fechaCat = cat.fec_alta || cat.fecAlta || '13/10/2026';
      return {
        ...cat,
        fecAlta: fechaCat,
        fec_alta: fechaCat,
        subcategorias: subcats
      };
    });

    res.json(categoriasFormateadas);
  });
});

app.post(['/api/categorias/sincronizar', '/categorias/sincronizar'], (req, res) => {
  const categorias = req.body;
  if (!Array.isArray(categorias)) {
    return res.status(400).json({ error: 'Formato inválido, se esperaba un arreglo' });
  }

  db.query('DELETE FROM categorias', (errDel) => {
    if (errDel) {
      console.error('Error al limpiar categorías:', errDel);
      return res.status(500).json({ error: errDel.message });
    }

    if (categorias.length === 0) {
      return res.json({ success: true, message: 'Todas las categorías fueron eliminadas' });
    }

    const values = categorias.map(cat => {
      const fecha = cat.fecAlta || cat.fec_alta || new Date().toLocaleDateString('es-MX');
      const subcatsStr = JSON.stringify(cat.subcategorias || []);
      return [
        cat.id || null,
        cat.nombre,
        cat.sla || 24,
        cat.estatus || 'ACTIVO',
        fecha,
        cat.usuario || 'ADMINISTRADOR',
        subcatsStr
      ];
    });

    const sql = 'INSERT INTO categorias (id, nombre, sla, estatus, fec_alta, usuario, subcategorias) VALUES ?';
    db.query(sql, [values], (errIns) => {
      if (errIns) {
        console.error('Error al guardar categorías en MySQL:', errIns);
        return res.status(500).json({ error: errIns.message });
      }
      res.json({ success: true, message: 'Categorías y subcategorías guardadas en MySQL correctamente' });
    });
  });
});

app.get(['/api/subcategorias', '/subcategorias'], (req, res) => {
  db.query('SELECT * FROM subcategorias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get(['/api/elementos', '/elementos'], (req, res) => {
  db.query('SELECT * FROM elementos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post(['/api/encuestas', '/encuestas'], (req, res) => {
  const data = { ...req.body };
  if (data.fecha) delete data.fecha;
  if (data.fecha_respuesta) delete data.fecha_respuesta;
  delete data.promedio;
  for (let key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      data[key] = JSON.stringify(data[key]);
    }
  }
  data.fecha_respuesta = obtenerFechaMySQL();
  const guardarEnBD = (datosFinales) => {
    db.query('INSERT INTO encuestas SET ?', filtrarColumnas('encuestas', datosFinales), (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Encuesta guardada con éxito', id: result.insertId });
    });
  };
  if (!data.ticket_id && data.folio) {
    db.query('SELECT id FROM tickets WHERE folio = ?', [data.folio], (err, results) => {
      if (!err && results.length > 0) data.ticket_id = results[0].id;
      guardarEnBD(data);
    });
  } else {
    guardarEnBD(data);
  }
});

app.get(['/api/encuestas/reporte', '/encuestas/reporte'], (req, res) => {
  db.query('SELECT * FROM encuestas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const encuestasFormateadas = results.map(e => ({ ...e, respuestas: parseJsonSeguro(e.respuestas) }));
    let suma = 0;
    encuestasFormateadas.forEach(r => suma += (Number(r.calificacion) || 0));
    res.json({ estadisticas: { promedio: encuestasFormateadas.length > 0 ? (suma / encuestasFormateadas.length).toFixed(1) : 0, total: encuestasFormateadas.length }, historial: encuestasFormateadas });
  });
});

app.get(['/api/kpis/tiempos', '/kpis/tiempos'], (req, res) => {
  const conCierre = columnasTabla.tickets && columnasTabla.tickets.has('fecha_cierre');
  db.query(`SELECT id, folio, estatus, created_at, updated_at${conCierre ? ', fecha_cierre' : ''} FROM tickets`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(t => ({ id: t.id, folio: t.folio, minutos_resolucion: Math.round(((t.estatus === 'Cerrado' ? new Date(t.fecha_cierre || t.updated_at) : new Date()) - new Date(t.created_at)) / (1000 * 60)) || 5 })));
  });
});

// ============================================================================
// MÓDULO: BUZÓN DE SUGERENCIAS Y REPORTE DE ERRORES (FEEDBACK DEL PORTAL)
// ============================================================================
app.get(['/api/buzon', '/buzon', '/CTI/api/buzon'], (req, res) => {
  db.query('SELECT * FROM buzon_sugerencias ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post(['/api/buzon', '/buzon', '/CTI/api/buzon'], (req, res) => {
  const { usuario, username, campana, tipo, mensaje } = req.body;
  if (!mensaje || !String(mensaje).trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }
  const fechaHora = obtenerFechaMySQL();
  const sql = `
    INSERT INTO buzon_sugerencias (usuario, username, campana, tipo, mensaje, estatus, fecha_creacion) 
    VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)
  `;
  db.query(sql, [
    usuario || 'Anónimo', 
    username || '', 
    campana || 'General', 
    tipo || 'SUGERENCIA', 
    String(mensaje).trim(), 
    fechaHora
  ], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('nuevoFeedbackBuzon', { id: result.insertId, usuario, tipo });
    res.json({ success: true, id: result.insertId, fecha_creacion: fechaHora });
  });
});

app.put(['/api/buzon/:id', '/buzon/:id', '/CTI/api/buzon/:id'], (req, res) => {
  const { estatus, respuesta_admin } = req.body;
  db.query(
    'UPDATE buzon_sugerencias SET estatus = ?, respuesta_admin = ? WHERE id = ?',
    [estatus || 'REVISADO', respuesta_admin || '', req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('actualizacionBuzon');
      db.query('SELECT username, tipo FROM buzon_sugerencias WHERE id = ? LIMIT 1', [req.params.id], (errSel, filas) => {
        if (!errSel && filas && filas.length > 0 && filas[0].username) {
          io.emit('buzonRespondido', { username: filas[0].username, tipo: filas[0].tipo, estatus: estatus || 'REVISADO', conRespuesta: !!respuesta_admin });
        }
      });
      res.json({ success: true, message: 'Registro del buzón actualizado' });
    }
  );
});

app.delete(['/api/buzon/:id', '/buzon/:id', '/CTI/api/buzon/:id'], (req, res) => {
  db.query('DELETE FROM buzon_sugerencias WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Registro eliminado' });
  });
});

// Manejo de estáticos y rutas bajo el subdirectorio /CTI
app.use('/CTI', express.static(path.join(__dirname, 'dist')));

app.get(/^\/CTI\/?.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Redirigir la raíz y la ruta antigua hacia /CTI/
app.get(['/', '/SAV_tiV2', '/SAV_tiV2/'], (req, res) => {
  res.redirect('/CTI/');
});

const PORT = process.env.PORT || 80;
server.listen(PORT, () => console.log(`Servidor en tiempo real corriendo en el puerto ${PORT}`));
