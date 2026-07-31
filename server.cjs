const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a la Base de Datos
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

// =========================================================================
// 1. ENDPOINTS DE LA API (DEBEN IR ANTES DE SERVIR EL HTML)
// =========================================================================

// Login
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
    
    // Enviamos el objeto con las propiedades correctas que tu tabla tiene (nombre, paterno, etc.)
    res.json({
      success: true,
      user: {
        id: usuario.id,
        nombre: usuario.nombre || '',
        paterno: usuario.paterno || '',
        materno: usuario.materno || '',
        nombres: usuario.nombre || '',
        apellidos: usuario.paterno || '',
        username: usuario.username,
        role: usuario.nivel === 'ADMINISTRADOR' ? 'admin' : 'client',
        nivel: usuario.nivel,
        gruposAsignados: usuario.gruposAsignados
      }
    });
  });
});

// Tickets (Obtener y Crear)
app.get('/api/tickets', (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/tickets', (req, res) => {
  const nuevoTicket = req.body;
  db.query('INSERT INTO tickets SET ?', nuevoTicket, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket creado exitosamente', id: result.insertId });
  });
});

// Actualizar Ticket
app.put('/api/tickets/:folio', (req, res) => {
  const { folio } = req.params;
  const datosActualizados = req.body;

  db.query('UPDATE tickets SET ? WHERE folio = ?', [datosActualizados, folio], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    res.json({ message: 'Ticket actualizado correctamente' });
  });
});

// Usuarios y Grupos
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

// =========================================================================
// 2. CONFIGURACIÓN DEL FRONTEND (AL FINAL, PARA NO BLOQUEAR LA API)
// =========================================================================
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Puerto
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
