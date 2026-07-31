const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a la Base de Datos (Easypanel)
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
// 1. ENDPOINTS DE LA API (Soportan con y sin /api/)
// =========================================================================

// Login
const handleLogin = (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM usuarios WHERE username = ? AND password = ? AND estatus = "ACTIVO"';
  
  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas o usuario inactivo.' });

    const usuario = results[0];
    
    res.json({
      success: true,
      user: {
        id: usuario.id,
        // Estas dos propiedades coinciden EXACTAMENTE con tu Header.jsx
        name: `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim(),
        role: usuario.nivel === 'ADMINISTRADOR' ? 'support' : 'client',
        
        // Mantenemos el resto por si otras vistas lo llegan a ocupar
        username: usuario.username,
        nivel: usuario.nivel,
        gruposAsignados: usuario.gruposAsignados,
        nombre: usuario.nombre || '',
        paterno: usuario.paterno || '',
        materno: usuario.materno || ''
      }
    });
  });
};
app.post('/api/login', handleLogin);
app.post('/login', handleLogin);

// Tickets
app.get(['/api/tickets', '/tickets'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post(['/api/tickets', '/tickets'], (req, res) => {
  db.query('INSERT INTO tickets SET ?', req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket creado exitosamente', id: result.insertId });
  });
});

// Endpoint para actualizar tickets dinámicamente
app.put(['/api/tickets/:folio', '/tickets/:folio'], (req, res) => {
  db.query('UPDATE tickets SET ? WHERE folio = ?', [req.body, req.params.folio], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    res.json({ message: 'Ticket actualizado correctamente' });
  });
});

// Usuarios
app.get(['/api/usuarios', '/usuarios'], (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Grupos
app.get(['/api/grupos', '/grupos'], (req, res) => {
  db.query('SELECT * FROM grupos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Campañas
app.get(['/api/campanas', '/campanas'], (req, res) => {
  db.query('SELECT * FROM campanas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Categorías
app.get(['/api/categorias', '/categorias'], (req, res) => {
  db.query('SELECT * FROM categorias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Subcategorías
app.get(['/api/subcategorias', '/subcategorias'], (req, res) => {
  db.query('SELECT * FROM subcategorias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Elementos
app.get(['/api/elementos', '/elementos'], (req, res) => {
  db.query('SELECT * FROM elementos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// =========================================================================
// 2. CONFIGURACIÓN DEL FRONTEND
// =========================================================================
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
