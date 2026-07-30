const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a MySQL usando las variables de entorno de Easypanel
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a MySQL:', err);
    return;
  }
  console.log('Conectado exitosamente a la Base de Datos MySQL');

  // 1. Tabla de Tickets
  db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      folio VARCHAR(50) NOT NULL,
      estatus VARCHAR(50) DEFAULT 'Abierto',
      colorEstatus VARCHAR(50),
      tecnico VARCHAR(150),
      creador VARCHAR(150),
      asunto VARCHAR(255),
      descripcion TEXT,
      campana VARCHAR(150),
      equipo TEXT,
      nivel VARCHAR(50),
      modo VARCHAR(50),
      fecha VARCHAR(50),
      grupo VARCHAR(150),
      categoria VARCHAR(150),
      subcategoria VARCHAR(150),
      elemento VARCHAR(150),
      resolucion TEXT,
      archivoNombre VARCHAR(255),
      archivoUrl TEXT,
      encuesta_respondida TINYINT DEFAULT 0
    );
  `, (err) => { if (err) console.error('Error tabla tickets:', err); });

  // 2. Recreación limpia de la tabla de usuarios e inserción de cuentas por defecto
  db.query(`DROP TABLE IF EXISTS usuarios`, (err) => {
    if (!err) {
      db.query(`
        CREATE TABLE usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(150) NOT NULL,
          paterno VARCHAR(150),
          materno VARCHAR(150),
          campana VARCHAR(150),
          username VARCHAR(150) UNIQUE NOT NULL,
          password VARCHAR(255),
          nivel VARCHAR(100) DEFAULT 'CLIENTE',
          estatus VARCHAR(50) DEFAULT 'ACTIVO',
          gruposAsignados TEXT
        );
      `, (err) => {
        if (!err) {
          const defaultUsers = [
            ['CHRISTOPHER', 'OSORIO', 'VARELA', 'TI', 'christopher', '1234', 'ADMINISTRADOR', 'ACTIVO', JSON.stringify(['TI'])],
            ['VALERIA', 'GOMEZ', 'RUIZ', '*111', 'valeria', '1234', 'CLIENTE', 'ACTIVO', JSON.stringify([])]
          ];
          const query = `INSERT INTO usuarios (nombre, paterno, materno, campana, username, password, nivel, estatus, gruposAsignados) VALUES ?`;
          db.query(query, [defaultUsers], (err) => {
            if (err) console.error('Error al insertar usuarios por defecto:', err);
            else console.log('Tabla de usuarios recreada e inicializada correctamente.');
          });
        }
      });
    }
  });

  // 3. Tablas de Catálogos y Grupos
  db.query(`CREATE TABLE IF NOT EXISTS grupos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(150) NOT NULL);`, (err) => {});
  db.query(`CREATE TABLE IF NOT EXISTS categorias (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(150) NOT NULL, estatus VARCHAR(50) DEFAULT 'ACTIVO');`, (err) => {});
  db.query(`CREATE TABLE IF NOT EXISTS subcategorias (id INT AUTO_INCREMENT PRIMARY KEY, categoria VARCHAR(150) NOT NULL, nombre VARCHAR(150) NOT NULL, estatus VARCHAR(50) DEFAULT 'ACTIVO');`, (err) => {});
  db.query(`CREATE TABLE IF NOT EXISTS elementos (id INT AUTO_INCREMENT PRIMARY KEY, subcategoria VARCHAR(150) NOT NULL, nombre VARCHAR(150) NOT NULL);`, (err) => {});
  db.query(`CREATE TABLE IF NOT EXISTS campanas (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(150) NOT NULL);`, (err) => {});
});

// --- API ROUTES: LOGIN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?) AND password = ?`;
  
  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }
    const usuarioEncontrado = results[0];
    if (usuarioEncontrado.estatus !== 'ACTIVO') {
      return res.status(403).json({ message: 'Este usuario se encuentra inactivo (Baja).' });
    }
    const formattedUser = {
      ...usuarioEncontrado,
      gruposAsignados: usuarioEncontrado.gruposAsignados ? JSON.parse(usuarioEncontrado.gruposAsignados) : []
    };
    res.json(formattedUser);
  });
});

// --- API ROUTES: TICKETS ---
app.get('/api/tickets', (req, res) => {
  db.query('SELECT * FROM tickets ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/tickets', (req, res) => {
  const t = req.body;
  const query = `
    INSERT INTO tickets 
    (folio, estatus, colorEstatus, tecnico, creador, asunto, descripcion, campana, equipo, nivel, modo, fecha, grupo, categoria, subcategoria, elemento, resolucion) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    t.folio, t.estatus, t.colorEstatus, t.tecnico, t.creador,
    t.asunto, t.descripcion, t.campana, t.equipo,
    t.nivel, t.modo, t.fecha, t.grupo,
    t.categoria, t.subcategoria, t.elemento, t.resolucion || ''
  ];
  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Ticket guardado con éxito', id: result.insertId });
  });
});

app.put('/api/tickets/:folio', (req, res) => {
  const { folio } = req.params;
  const t = req.body;
  const query = `
    UPDATE tickets SET 
      estatus = ?, colorEstatus = ?, tecnico = ?, asunto = ?, 
      descripcion = ?, campana = ?, equipo = ?, nivel = ?, 
      modo = ?, grupo = ?, categoria = ?, subcategoria = ?, 
      elemento = ?, resolucion = ?
    WHERE folio = ?
  `;
  const values = [
    t.estatus, t.colorEstatus, t.tecnico, t.asunto,
    t.descripcion, t.campana, t.equipo, t.nivel,
    t.modo, t.grupo, t.categoria, t.subcategoria,
    t.elemento, t.resolucion || '', folio
  ];
  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket actualizado correctamente' });
  });
});

// --- API ROUTES: USUARIOS ---
app.get('/api/usuarios', (req, res) => {
  db.query('SELECT * FROM usuarios ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = results.map(u => ({
      ...u,
      gruposAsignados: u.gruposAsignados ? JSON.parse(u.gruposAsignados) : []
    }));
    res.json(formatted);
  });
});

app.post('/api/usuarios', (req, res) => {
  const u = req.body;
  const gruposStr = JSON.stringify(u.gruposAsignados || []);
  const query = `
    INSERT INTO usuarios (nombre, paterno, materno, campana, username, password, nivel, estatus, gruposAsignados) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [u.nombre, u.paterno, u.materno, u.campana, u.username, u.password, u.nivel, u.estatus, gruposStr];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Usuario guardado', id: result.insertId });
  });
});

app.put('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const gruposStr = JSON.stringify(u.gruposAsignados || []);
  const query = `
    UPDATE usuarios SET 
      nombre = ?, paterno = ?, materno = ?, campana = ?, 
      username = ?, password = ?, nivel = ?, estatus = ?, gruposAsignados = ?
    WHERE id = ?
  `;
  const values = [u.nombre, u.paterno, u.materno, u.campana, u.username, u.password, u.nivel, u.estatus, gruposStr, id];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Usuario actualizado correctamente' });
  });
});

app.delete('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});

// --- CONFIGURACIÓN DE PRODUCCIÓN (REACT) ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
