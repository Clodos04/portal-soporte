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
        name: `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim(),
        role: usuario.nivel === 'ADMINISTRADOR' ? 'support' : 'client',
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

// =========================================================================
// TICKETS (Ahora guardan notas de forma permanente)
// =========================================================================
app.get(['/api/tickets', '/tickets'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Desempaquetamos las notas para que React no falle al intentar leerlas
    const ticketsFormateados = results.map(t => {
      let notas = t.notas;
      if (typeof notas === 'string') {
        try { notas = JSON.parse(notas); } catch (e) { notas = []; }
      }
      return {
        ...t,
        notas: notas || []
      };
    });
    
    res.json(ticketsFormateados);
  });
});

app.post(['/api/tickets', '/tickets'], (req, res) => {
  const ticketData = { ...req.body };
  
  // Aún eliminamos "archivos" a menos que también le crees una columna en MySQL
  delete ticketData.archivos;
  
  // Convertimos arreglos (como las notas) a texto JSON para poder guardarlo en MySQL
  for (let key in ticketData) {
    if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
      ticketData[key] = JSON.stringify(ticketData[key]);
    }
  }

  db.query('INSERT INTO tickets SET ?', ticketData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket creado exitosamente', id: result.insertId });
  });
});

app.put(['/api/tickets/:folio', '/tickets/:folio'], (req, res) => {
  const ticketData = { ...req.body };
  
  delete ticketData.folio;
  delete ticketData.archivos; // Aún ignoramos archivos para evitar Error 500

  // Empaquetamos notas y otros arreglos
  for (let key in ticketData) {
    if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
      ticketData[key] = JSON.stringify(ticketData[key]);
    }
  }

  db.query('UPDATE tickets SET ? WHERE folio = ?', [ticketData, req.params.folio], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    res.json({ message: 'Ticket actualizado correctamente' });
  });
});

// Usuarios
app.get(['/api/usuarios', '/usuarios'], (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const usuariosFormateados = results.map(u => {
      let grupos = u.gruposAsignados;
      if (typeof grupos === 'string') {
        try { grupos = JSON.parse(grupos); } catch (e) { grupos = []; }
      }
      return { ...u, gruposAsignados: grupos || [] };
    });
    
    res.json(usuariosFormateados);
  });
});

// Grupos
app.get(['/api/grupos', '/grupos'], (req, res) => {
  db.query('SELECT nombre FROM grupos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(g => g.nombre));
  });
});

app.post(['/api/grupos', '/grupos'], (req, res) => {
  const { nombre } = req.body;
  db.query('INSERT INTO grupos (nombre) VALUES (?)', [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo creado', id: result.insertId });
  });
});

app.delete(['/api/grupos/:nombre', '/grupos/:nombre'], (req, res) => {
  const { nombre } = req.params;
  db.query('DELETE FROM grupos WHERE nombre = ?', [nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo eliminado' });
  });
});

// Campañas
app.get(['/api/campanas', '/campanas'], (req, res) => {
  db.query('SELECT * FROM campanas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(c => c.nombre || c.campana || c.descripcion || Object.values(c)[1] || c.id || ""));
  });
});

// Categorías
app.get(['/api/categorias', '/categorias'], (req, res) => {
  db.query('SELECT * FROM categorias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const categoriasFormateadas = results.map(cat => {
      let subcats = cat.subcategorias;
      if (typeof subcats === 'string') {
        try { subcats = JSON.parse(subcats); } catch (e) { subcats = []; }
      }
      return {
        ...cat,
        subcategorias: subcats || [] 
      };
    });
    
    res.json(categoriasFormateadas);
  });
});

app.post(['/api/categorias/sincronizar', '/categorias/sincronizar'], (req, res) => {
  res.json({ success: true, message: 'Sincronizado' });
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
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
