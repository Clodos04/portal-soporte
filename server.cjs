const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

// Importamos absolutamente todos los datos desde la carpeta data
const { categoriasIniciales } = require('./data/categoriasData.js');
const { listaCampanas } = require('./data/campanasData.js');
const { usuariosIniciales } = require('./data/usuariosData.js');
const { equiposPorCampana } = require('./data/equiposData.js');

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

  // 2. Tabla de Usuarios (Cargados desde usuariosData.js si está vacía)
  db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
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
      db.query('SELECT COUNT(*) as count FROM usuarios', (err, results) => {
        if (!err && results[0].count === 0) {
          const defaultUsers = usuariosIniciales.map(u => [
            u.nombre, u.paterno, u.materno, u.campana, u.username, u.password, u.nivel, u.estatus, JSON.stringify(u.gruposAsignados || [])
          ]);
          db.query(`INSERT INTO usuarios (nombre, paterno, materno, campana, username, password, nivel, estatus, gruposAsignados) VALUES ?`, [defaultUsers], (err) => {
            if (!err) console.log('Usuarios iniciales cargados.');
          });
        }
      });
    }
  });

  // 3. Tabla de Grupos
  db.query(`
    CREATE TABLE IF NOT EXISTS grupos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) UNIQUE NOT NULL
    );
  `, (err) => {
    if (!err) {
      db.query('SELECT COUNT(*) as count FROM grupos', (err, results) => {
        if (!err && results[0].count === 0) {
          const defaultGrupos = [
            ['TI'], ['TELEFONIA, COMUNICACIONES Y REDES'], ['DESARROLLO DE SOFTWARE'],
            ['CONTROL ESTADISTICO'], ['SOPORTE TECNICO'], ['BASES E INFORMES'],
            ['CLAVES'], ['FOLIOS BIT'], ['MANTENIMIENTO'], ['CENTINELA']
          ];
          db.query('INSERT IGNORE INTO grupos (nombre) VALUES ?', [defaultGrupos], (err) => {});
        }
      });
    }
  });

  // 4. Tabla de Campañas (Cargadas desde campanasData.js)
  db.query(`
    CREATE TABLE IF NOT EXISTS campanas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) UNIQUE NOT NULL
    );
  `, (err) => {
    if (!err) {
      db.query('SELECT COUNT(*) as count FROM campanas', (err, results) => {
        if (!err && results[0].count === 0) {
          const defaultCampanas = listaCampanas.map(c => [c]);
          db.query('INSERT IGNORE INTO campanas (nombre) VALUES ?', [defaultCampanas], (err) => {
            if (!err) console.log('Campañas cargadas.');
          });
        }
      });
    }
  });

  // 5. Tabla de Categorías (Cargadas desde categoriasData.js)
  db.query(`
    CREATE TABLE IF NOT EXISTS categorias_tree (
      id INT PRIMARY KEY,
      data JSON NOT NULL
    );
  `, (err) => {
    if (!err) {
      db.query('SELECT COUNT(*) as count FROM categorias_tree', (err, results) => {
        if (!err && results[0].count === 0) {
          categoriasIniciales.forEach(cat => {
            db.query('INSERT INTO categorias_tree (id, data) VALUES (?, ?)', [cat.id, JSON.stringify(cat)], (err) => {});
          });
          console.log('Categorías cargadas.');
        }
      });
    }
  });
});

// --- API ROUTES: LOGIN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query(`SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?) AND password = ?`, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    
    const usuarioEncontrado = results[0];
    if (usuarioEncontrado.estatus !== 'ACTIVO') return res.status(403).json({ message: 'Este usuario se encuentra inactivo.' });
    
    res.json({
      ...usuarioEncontrado,
      gruposAsignados: usuarioEncontrado.gruposAsignados ? JSON.parse(usuarioEncontrado.gruposAsignados) : []
    });
  });
});

// --- API ROUTES: TICKETS ---
app.get('/api/tickets', (req, res) => {
  db.query('SELECT * FROM tickets ORDER BY id DESC', (err, results) => res.json(results));
});
app.post('/api/tickets', (req, res) => {
  const t = req.body;
  const query = `INSERT INTO tickets (folio, estatus, colorEstatus, tecnico, creador, asunto, descripcion, campana, equipo, nivel, modo, fecha, grupo, categoria, subcategoria, elemento, resolucion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(query, [t.folio, t.estatus, t.colorEstatus, t.tecnico, t.creador, t.asunto, t.descripcion, t.campana, t.equipo, t.nivel, t.modo, t.fecha, t.grupo, t.categoria, t.subcategoria, t.elemento, t.resolucion || ''], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});

// --- API ROUTES: EQUIPOS ---
app.get('/api/equipos', (req, res) => {
  res.json(equiposPorCampana);
});

// --- API ROUTES: USUARIOS ---
app.get('/api/usuarios', (req, res) => {
  db.query('SELECT * FROM usuarios ORDER BY id DESC', (err, results) => {
    res.json(results.map(u => ({ ...u, gruposAsignados: u.gruposAsignados ? JSON.parse(u.gruposAsignados) : [] })));
  });
});
app.post('/api/usuarios', (req, res) => {
  const u = req.body;
  db.query(`INSERT INTO usuarios (nombre, paterno, materno, campana, username, password, nivel, estatus, gruposAsignados) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [u.nombre, u.paterno, u.materno, u.campana, u.username, u.password, u.nivel, u.estatus, JSON.stringify(u.gruposAsignados || [])], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});
app.put('/api/usuarios/:id', (req, res) => {
  const u = req.body;
  db.query(`UPDATE usuarios SET nombre = ?, paterno = ?, materno = ?, campana = ?, username = ?, password = ?, nivel = ?, estatus = ?, gruposAsignados = ? WHERE id = ?`, [u.nombre, u.paterno, u.materno, u.campana, u.username, u.password, u.nivel, u.estatus, JSON.stringify(u.gruposAsignados || []), req.params.id], (err) => {
    res.json({ message: 'Actualizado' });
  });
});
app.delete('/api/usuarios/:id', (req, res) => {
  db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id], (err) => res.json({ message: 'Eliminado' }));
});

// --- API ROUTES: GRUPOS ---
app.get('/api/grupos', (req, res) => {
  db.query('SELECT nombre FROM grupos ORDER BY id ASC', (err, results) => res.json(results.map(g => g.nombre)));
});
app.post('/api/grupos', (req, res) => {
  db.query('INSERT IGNORE INTO grupos (nombre) VALUES (?)', [req.body.nombre], (err) => res.json({ message: 'Guardado' }));
});
app.delete('/api/grupos/:nombre', (req, res) => {
  db.query('DELETE FROM grupos WHERE nombre = ?', [req.params.nombre], (err) => res.json({ message: 'Eliminado' }));
});

// --- API ROUTES: CAMPAÑAS ---
app.get('/api/campanas', (req, res) => {
  db.query('SELECT nombre FROM campanas ORDER BY id ASC', (err, results) => res.json(results.map(c => c.nombre)));
});
app.post('/api/campanas', (req, res) => {
  db.query('INSERT IGNORE INTO campanas (nombre) VALUES (?)', [req.body.nombre], (err) => res.json({ message: 'Guardado' }));
});
app.delete('/api/campanas/:nombre', (req, res) => {
  db.query('DELETE FROM campanas WHERE nombre = ?', [req.params.nombre], (err) => res.json({ message: 'Eliminado' }));
});

// --- API ROUTES: CATEGORÍAS (ÁRBOL COMPLETO) ---
app.get('/api/categorias', (req, res) => {
  db.query('SELECT data FROM categorias_tree ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
  });
});
app.post('/api/categorias/sincronizar', (req, res) => {
  const categoriasArray = req.body;
  db.query('DELETE FROM categorias_tree', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!categoriasArray || categoriasArray.length === 0) return res.json({ message: 'Sincronizado' });

    let count = 0;
    categoriasArray.forEach(cat => {
      db.query('INSERT INTO categorias_tree (id, data) VALUES (?, ?)', [cat.id, JSON.stringify(cat)], (err) => {
        count++;
        if (count === categoriasArray.length) {
          res.json({ message: 'Árbol sincronizado' });
        }
      });
    });
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
