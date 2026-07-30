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

  // Crear la tabla de tickets automáticamente la primera vez si no existe
  const sqlTabla = `
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
      archivoUrl TEXT
    );
  `;
  db.query(sqlTabla, (err) => {
    if (err) console.error('Error al crear la tabla:', err);
    else console.log('Tabla "tickets" verificada o creada correctamente');
  });
});

// --- API ROUTES ---

// 1. Obtener todos los tickets
app.get('/api/tickets', (req, res) => {
  db.query('SELECT * FROM tickets ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 2. Crear un nuevo ticket
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

// --- CONFIGURACIÓN DE PRODUCCIÓN (REACT) ---
// Sirve la carpeta 'dist' generada por Vite
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
