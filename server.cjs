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

  // 2. Tabla de Usuarios
  db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      correo VARCHAR(150),
      rol VARCHAR(50) DEFAULT 'client',
      grupo VARCHAR(150),
      estatus VARCHAR(50) DEFAULT 'ACTIVO'
    );
  `, (err) => { if (err) console.error('Error tabla usuarios:', err); });

  // 3. Tabla de Grupos
  db.query(`
    CREATE TABLE IF NOT EXISTS grupos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL
    );
  `, (err) => { if (err) console.error('Error tabla grupos:', err); });

  // 4. Tabla de Categorías
  db.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      estatus VARCHAR(50) DEFAULT 'ACTIVO'
    );
  `, (err) => { if (err) console.error('Error tabla categorias:', err); });

  // 5. Tabla de Subcategorías
  db.query(`
    CREATE TABLE IF NOT EXISTS subcategorias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      categoria VARCHAR(150) NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      estatus VARCHAR(50) DEFAULT 'ACTIVO'
    );
  `, (err) => { if (err) console.error('Error tabla subcategorias:', err); });

  // 6. Tabla de Elementos
  db.query(`
    CREATE TABLE IF NOT EXISTS elementos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subcategoria VARCHAR(150) NOT NULL,
      nombre VARCHAR(150) NOT NULL
    );
  `, (err) => { if (err) console.error('Error tabla elementos:', err); });

  // 7. Tabla de Campañas
  db.query(`
    CREATE TABLE IF NOT EXISTS campanas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL
    );
  `, (err) => { if (err) console.error('Error tabla campanas:', err); });

  console.log('Todas las tablas de la base de datos fueron verificadas o creadas.');
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
    res.json(results);
  });
});

app.post('/api/usuarios', (req, res) => {
  const u = req.body;
  db.query('INSERT INTO usuarios (nombre, correo, rol, grupo, estatus) VALUES (?, ?, ?, ?, ?)', 
    [u.nombre, u.correo, u.rol || 'client', u.grupo || '', u.estatus || 'ACTIVO'], 
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Usuario guardado', id: result.insertId });
    }
  );
});

// --- API ROUTES: GRUPOS ---
app.get('/api/grupos', (req, res) => {
  db.query('SELECT * FROM grupos ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/grupos', (req, res) => {
  const { nombre } = req.body;
  db.query('INSERT INTO grupos (nombre) VALUES (?)', [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Grupo guardado', id: result.insertId });
  });
});

// --- API ROUTES: CATEGORÍAS ---
app.get('/api/categorias', (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/categorias', (req, res) => {
  const { nombre, estatus } = req.body;
  db.query('INSERT INTO categorias (nombre, estatus) VALUES (?, ?)', [nombre, estatus || 'ACTIVO'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Categoría guardada', id: result.insertId });
  });
});

// --- API ROUTES: SUBCATEGORÍAS ---
app.get('/api/subcategorias', (req, res) => {
  db.query('SELECT * FROM subcategorias ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/subcategorias', (req, res) => {
  const { categoria, nombre, estatus } = req.body;
  db.query('INSERT INTO subcategorias (categoria, nombre, estatus) VALUES (?, ?, ?)', [categoria, nombre, estatus || 'ACTIVO'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Subcategoría guardada', id: result.insertId });
  });
});

// --- API ROUTES: ELEMENTOS ---
app.get('/api/elementos', (req, res) => {
  db.query('SELECT * FROM elementos ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/elementos', (req, res) => {
  const { subcategoria, nombre } = req.body;
  db.query('INSERT INTO elementos (subcategoria, nombre) VALUES (?, ?)', [subcategoria, nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Elemento guardado', id: result.insertId });
  });
});

// --- API ROUTES: CAMPAÑAS ---
app.get('/api/campanas', (req, res) => {
  db.query('SELECT * FROM campanas ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/campanas', (req, res) => {
  const { nombre } = req.body;
  db.query('INSERT INTO campanas (nombre) VALUES (?)', [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Campaña guardada', id: result.insertId });
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
