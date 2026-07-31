const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la Base de Datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sav_db-soporte',
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'db6f98fa1380ced73c0d',
  database: process.env.DB_NAME || 'sav',
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la Base de Datos:', err);
    return;
  }
  console.log('Conectado exitosamente a la Base de Datos MySQL');
  inicializarBaseDeDatos();
});

// Importar usuarios iniciales
const { usuariosIniciales } = require('./usuariosIniciales.cjs');

function inicializarBaseDeDatos() {
  const createTablesQueries = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100),
      paterno VARCHAR(100),
      materno VARCHAR(100),
      username VARCHAR(150) UNIQUE,
      password VARCHAR(255),
      nivel VARCHAR(50),
      campana VARCHAR(50),
      estatus VARCHAR(50),
      gruposAsignados TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS campanas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS grupos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS categorias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100),
      sla INT DEFAULT 24
    )`,
    `CREATE TABLE IF NOT EXISTS categorias_tree (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS subcategorias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS elementos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      folio VARCHAR(50),
      asunto VARCHAR(255),
      descripcion TEXT,
      categoria VARCHAR(100),
      subcategoria VARCHAR(100),
      elemento VARCHAR(100),
      campana VARCHAR(50),
      grupo VARCHAR(100),
      tecnico VARCHAR(150),
      creador VARCHAR(150),
      estatus VARCHAR(50) DEFAULT 'Abierto',
      prioridad VARCHAR(50),
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_asignacion DATETIME NULL,
      fecha_cierre DATETIME NULL,
      encuesta_respondida TINYINT DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS encuestas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      cliente_username VARCHAR(150) NOT NULL,
      calificacion INT NOT NULL,
      comentarios TEXT,
      fecha_respuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`
  ];

  createTablesQueries.forEach((query) => {
    db.query(query, (err) => {
      if (err) console.error('Error creando tabla:', err);
    });
  });

  // Insertar usuarios iniciales si la tabla está vacía
  setTimeout(() => {
    db.query(`SELECT COUNT(*) as count FROM usuarios`, (err, results) => {
      if (!err && results[0].count === 0 && usuariosIniciales) {
        usuariosIniciales.forEach(user => {
          const gruposStr = JSON.stringify(user.gruposAsignados || []);
          db.query(
            `INSERT INTO usuarios (nombre, paterno, materno, username, password, nivel, campana, estatus, gruposAsignados) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user.nombre, user.paterno, user.materno, user.username, user.password, user.nivel, user.campana, user.estatus, gruposStr],
            (insertErr) => {
              if (insertErr) console.error('Error insertando usuario inicial:', insertErr);
            }
          );
        });
        console.log('Usuarios iniciales cargados.');
      } else {
        console.log('Usuarios ya existentes o cargados.');
      }
    });
  }, 1000);
}

// --- ENDPOINTS DE AUTENTICACIÓN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query(`SELECT * FROM usuarios WHERE username = ? AND password = ?`, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }
    const usuario = results[0];
    try {
      usuario.gruposAsignados = JSON.parse(usuario.gruposAsignados || '[]');
    } catch (e) {
      usuario.gruposAsignados = [];
    }
    res.json(usuario);
  });
});

// --- ENDPOINTS DE USUARIOS ---
app.get('/api/usuarios', (req, res) => {
  db.query(`SELECT * FROM usuarios`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const usuarios = results.map(u => ({
      ...u,
      gruposAsignados: JSON.parse(u.gruposAsignados || '[]')
    }));
    res.json(usuarios);
  });
});

app.post('/api/usuarios', (req, res) => {
  const { nombre, paterno, materno, username, password, nivel, campana, estatus, gruposAsignados } = req.body;
  const gruposStr = JSON.stringify(gruposAsignados || []);
  db.query(
    `INSERT INTO usuarios (nombre, paterno, materno, username, password, nivel, campana, estatus, gruposAsignados) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, paterno, materno, username, password, nivel, campana, estatus, gruposStr],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Usuario creado con éxito', id: result.insertId });
    }
  );
});

// --- ENDPOINTS DE TICKETS ---
app.get('/api/tickets', (req, res) => {
  db.query(`SELECT * FROM tickets ORDER BY id DESC`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/tickets', (req, res) => {
  const { folio, asunto, descripcion, categoria, subcategoria, elemento, campana, grupo, creador, prioridad } = req.body;
  db.query(
    `INSERT INTO tickets (folio, asunto, descripcion, categoria, subcategoria, elemento, campana, grupo, creador, estatus, prioridad, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Abierto', ?, NOW())`,
    [folio, asunto, descripcion, categoria, subcategoria, elemento, campana, grupo, creador, prioridad || 'Media'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Ticket creado con éxito', id: result.insertId });
    }
  );
});

app.put('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  const { tecnico, estatus, grupo } = req.body;

  db.query(`SELECT estatus, tecnico, fecha_asignacion FROM tickets WHERE id = ?`, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ message: 'Ticket no encontrado' });

    const ticketActual = rows[0];
    let queryUpdate = `UPDATE tickets SET `;
    let params = [];
    let updates = [];

    if (tecnico !== undefined) {
      updates.push(`tecnico = ?`);
      params.push(tecnico);
      if (!ticketActual.fecha_asignacion) {
        updates.push(`fecha_asignacion = NOW()`);
      }
    }

    if (grupo !== undefined) {
      updates.push(`grupo = ?`);
      params.push(grupo);
    }

    if (estatus !== undefined) {
      updates.push(`estatus = ?`);
      params.push(estatus);
      if (estatus === 'Cerrado' && ticketActual.estatus !== 'Cerrado') {
        updates.push(`fecha_cierre = NOW()`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar.' });
    }

    queryUpdate += updates.join(', ') + ` WHERE id = ?`;
    params.push(id);

    db.query(queryUpdate, params, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Ticket actualizado correctamente' });
    });
  });
});

// --- MÓDULO DE ENCUESTAS Y KPS / SLA ---

// 1. Registrar encuesta (Valida 1 sola vez por ticket y máximo 7 días desde el cierre)
app.post('/api/encuestas', (req, res) => {
  const { ticket_id, cliente_username, calificacion, comentarios } = req.body;

  db.query(`SELECT estatus, fecha_cierre FROM tickets WHERE id = ?`, [ticket_id], (err, ticketResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (ticketResults.length === 0) return res.status(404).json({ message: 'Ticket no encontrado.' });

    const ticket = ticketResults[0];
    if (ticket.estatus !== 'Cerrado') {
      return res.status(400).json({ message: 'Solo se pueden responder encuestas de tickets cerrados.' });
    }

    db.query(`SELECT id FROM encuestas WHERE ticket_id = ?`, [ticket_id], (err, encuestaExistente) => {
      if (err) return res.status(500).json({ error: err.message });
      if (encuestaExistente.length > 0) {
        return res.status(400).json({ message: 'Esta solicitud ya cuenta con una encuesta registrada.' });
      }

      db.query(`SELECT DATEDIFF(NOW(), ?) <= 7 as dentro_de_tiempo`, [ticket.fecha_cierre || new Date()], (err, timeCheck) => {
        if (!err && timeCheck && timeCheck[0] && timeCheck[0].dentro_de_tiempo === 0) {
          return res.status(400).json({ message: 'El plazo de 7 días para responder esta encuesta ha expirado.' });
        }

        db.query(
          `INSERT INTO encuestas (ticket_id, cliente_username, calificacion, comentarios) VALUES (?, ?, ?, ?)`,
          [ticket_id, cliente_username, calificacion, comentarios || ''],
          (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(`UPDATE tickets SET encuesta_respondida = 1 WHERE id = ?`, [ticket_id]);

            res.status(201).json({ message: 'Encuesta guardada exitosamente', id: result.insertId });
          }
        );
      });
    });
  });
});

// 2. Historial de encuestas e indicadores generales (Para Admin y Técnico Supervisor)
app.get('/api/encuestas/reporte', (req, res) => {
  const query = `
    SELECT e.*, t.folio, t.asunto, t.categoria, t.tecnico, t.creador 
    FROM encuestas e
    JOIN tickets t ON e.ticket_id = t.id
    ORDER BY e.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(`SELECT AVG(calificacion) as promedio, COUNT(*) as total FROM encuestas`, (err, stats) => {
      res.json({
        estadisticas: stats[0] || { promedio: 0, total: 0 },
        historial: results
      });
    });
  });
});

// 3. KPIs de Tiempos de Resolución y SLAs (Para Admin y Técnico Supervisor)
app.get('/api/kpis/tiempos', (req, res) => {
  const query = `
    SELECT t.id, t.folio, t.categoria, t.tecnico, t.fecha_asignacion, t.fecha_cierre,
    TIMESTAMPDIFF(MINUTE, t.fecha_asignacion, t.fecha_cierre) as minutos_resolucion
    FROM tickets t
    WHERE t.estatus = 'Cerrado' AND t.fecha_asignacion IS NOT NULL AND t.fecha_cierre IS NOT NULL
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
