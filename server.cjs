const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. CONEXIÓN PRINCIPAL (Tickets - sav)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sav_db-soporte',
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'db6f98fa1380ced73c0d',
  database: process.env.DB_NAME || 'sav',
  port: process.env.DB_PORT || 3306
});

// 2. CONEXIÓN DEDICADA CENTINELA (Equipos - root)
const dbCentinela = mysql.createConnection({
  host: '192.168.1.2',
  user: 'root',
  password: 'C01nts#BD2024!',
  database: 'centinela',
  port: 3306
});

db.connect((err) => { if (err) console.error('Error BD Tickets:', err); else console.log('Conectado a BD Tickets'); });
dbCentinela.connect((err) => { if (err) console.error('Error BD Centinela:', err); else console.log('Conectado a BD Centinela'); });

const obtenerFechaMySQL = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// LOGIN (Usa db)
const handleLogin = (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE username = ? AND password = ? AND estatus = "ACTIVO"', [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    const usuario = results[0];
    res.json({ success: true, user: { id: usuario.id, name: `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim(), role: usuario.nivel === 'ADMINISTRADOR' ? 'support' : 'client', username: usuario.username, nivel: usuario.nivel, gruposAsignados: usuario.gruposAsignados } });
  });
};
app.post(['/api/login', '/login'], handleLogin);

// TICKETS (Usa db)
app.get(['/api/tickets', '/tickets'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(t => ({ ...t, notas: typeof t.notas === 'string' ? JSON.parse(t.notas || '[]') : [] })));
  });
});

app.post(['/api/tickets', '/tickets'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.archivos;
  for (let key in ticketData) if (typeof ticketData[key] === 'object' && ticketData[key] !== null) ticketData[key] = JSON.stringify(ticketData[key]);
  ticketData.created_at = obtenerFechaMySQL();
  db.query('INSERT INTO tickets SET ?', ticketData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket creado', id: result.insertId });
  });
});

app.put(['/api/tickets/:folio', '/tickets/:folio'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.folio;
  delete ticketData.archivos;
  for (let key in ticketData) if (typeof ticketData[key] === 'object' && ticketData[key] !== null) ticketData[key] = JSON.stringify(ticketData[key]);
  ticketData.updated_at = obtenerFechaMySQL();
  db.query('UPDATE tickets SET ? WHERE folio = ?', [ticketData, req.params.folio], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket actualizado' });
  });
});

// ==========================================
// RUTA CENTINELA (Usa dbCentinela - Conexión dedicada)
// ==========================================
app.get(['/api/centinela/datos', '/centinela/datos'], (req, res) => {
  dbCentinela.query('SELECT idcamp, `desc` AS nombre FROM Camp', (err, campanasRes) => {
    if (err) return res.status(500).json({ error: 'Error Camp: ' + err.message });
    dbCentinela.query('SELECT idIPs, ip, Nodo AS equipo, camp AS idcamp FROM IPs WHERE Nodo IS NOT NULL AND Nodo != ""', (err, ipsRes) => {
      if (err) return res.status(500).json({ error: 'Error IPs: ' + err.message });
      res.json({ campanas: campanasRes, equipos: ipsRes });
    });
  });
});

// CHATS, USUARIOS, GRUPOS (Usa db)
app.get(['/api/chat/:folio', '/chat/:folio'], (req, res) => {
  db.query('SELECT * FROM mensajes_chat WHERE folio = ? ORDER BY id ASC', [req.params.folio], (err, results) => {
    res.json(results);
  });
});

app.post(['/api/chat', '/chat'], (req, res) => {
  const { folio, remitente, texto, hora } = req.body;
  db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [folio, remitente, texto, hora], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al guardar' });
    res.json({ success: true });
  });
});

app.get(['/api/usuarios', '/usuarios'], (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    res.json(results.map(u => ({ ...u, gruposAsignados: typeof u.gruposAsignados === 'string' ? JSON.parse(u.gruposAsignados || '[]') : [] })));
  });
});

app.get(['/api/grupos', '/grupos'], (req, res) => {
  db.query('SELECT nombre FROM grupos', (err, results) => res.json(results.map(g => g.nombre)));
});

app.get(['/api/categorias', '/categorias'], (req, res) => {
  db.query('SELECT * FROM categorias', (err, results) => {
    res.json(results.map(cat => ({ ...cat, subcategorias: typeof cat.subcategorias === 'string' ? JSON.parse(cat.subcategorias || '[]') : [] })));
  });
});

// ENCUESTAS Y KPIs (Usa db)
app.post(['/api/encuestas', '/encuestas'], (req, res) => {
  const data = { ...req.body };
  delete data.fecha; delete data.fecha_respuesta; delete data.promedio;
  for (let key in data) if (typeof data[key] === 'object' && data[key] !== null) data[key] = JSON.stringify(data[key]);
  data.fecha_respuesta = obtenerFechaMySQL();
  db.query('INSERT INTO encuestas SET ?', data, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Encuesta guardada' });
  });
});

app.get(['/api/encuestas/reporte', '/encuestas/reporte'], (req, res) => {
  db.query('SELECT * FROM encuestas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ historial: results.map(e => ({ ...e, respuestas: typeof e.respuestas === 'string' ? JSON.parse(e.respuestas || '[]') : [] })) });
  });
});

app.get(['/api/kpis/tiempos', '/kpis/tiempos'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    res.json(results.map(t => ({ folio: t.folio, minutos_resolucion: 5 })));
  });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
