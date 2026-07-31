const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la conexión a la Base de Datos MySQL (usando variables de entorno de Easypanel)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sav',
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conectado exitosamente a la base de datos MySQL.');
});

// Endpoint para obtener todos los tickets
app.get('/api/tickets', (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Endpoint para crear un ticket
app.post('/api/tickets', (req, res) => {
  const nuevoTicket = req.body;
  const query = 'INSERT INTO tickets SET ?';
  db.query(query, nuevoTicket, (err, result) => {
    if (err) {
      console.error('Error al crear ticket:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Ticket creado exitosamente', id: result.insertId });
  });
});

// Endpoint para actualizar un ticket existente (con todos los campos de tu tabla)
app.put('/api/tickets/:folio', express.json(), (req, res) => {
  const { folio } = req.params;
  const {
    estatus,
    colorEstatus,
    tecnico,
    creador,
    asunto,
    descripcion,
    campana,
    equipo,
    nivel,
    modo,
    grupo,
    categoria,
    subcategoria,
    elemento,
    resolucion,
    archivoNombre,
    archivoUrl
  } = req.body;

  const query = `
    UPDATE tickets 
    SET estatus = ?, colorEstatus = ?, tecnico = ?, creador = ?, asunto = ?, descripcion = ?, campana = ?, equipo = ?, nivel = ?, modo = ?, grupo = ?, categoria = ?, subcategoria = ?, elemento = ?, resolucion = ?, archivoNombre = ?, archivoUrl = ?
    WHERE folio = ?
  `;

  db.query(
    query,
    [
      estatus, colorEstatus, tecnico, creador, asunto, descripcion, 
      campana, equipo, nivel, modo, grupo, categoria, subcategoria, 
      elemento, resolucion, archivoNombre, archivoUrl, folio
    ],
    (err, result) => {
      if (err) {
        console.error('Error detallado al actualizar el ticket en la BD:', err);
        return res.status(500).json({ error: 'No se pudo guardar el cambio en la base de datos.', details: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'No se encontró el ticket con ese folio.' });
      }

      res.json({ message: 'Ticket actualizado correctamente' });
    }
  );
});

// Rutas adicionales de la aplicación
app.get('/api/usuarios', (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/grupos', (req, res) => {
  db.query('SELECT nombre FROM grupos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(g => g.nombre));
  });
});

// Easypanel inyecta el puerto automáticamente mediante process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de API corriendo en el puerto ${PORT}`);
});
