const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la conexión a la Base de Datos MySQL (usando las credenciales de Easypanel)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sav_db-soporte',
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'db6f98fa1380ced73c0d',
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

// --- ENDPOINT DE LOGIN ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM usuarios WHERE username = ? AND password = ? AND estatus = "ACTIVO"';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error en el login:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos, o usuario inactivo.' });
    }

    const usuario = results[0];
    
    // Se devuelven los campos de nombre y apellido separados y juntos para evitar 'undefined' en la UI
    res.json({
      success: true,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        paterno: usuario.paterno,
        materno: usuario.materno,
        username: usuario.username,
        role: usuario.nivel === 'ADMINISTRADOR' ? 'admin' : 'client',
        nivel: usuario.nivel,
        gruposAsignados: usuario.gruposAsignados
      }
    });
  });
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

// Endpoint para actualizar un ticket existente (con todos los campos de la tabla)
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

// --- CONFIGURACIÓN PARA SERVIR EL FRONTEND Y EL LOGIN ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Puerto asignado por el entorno o por defecto
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
