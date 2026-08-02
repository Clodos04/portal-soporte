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

// Función auxiliar para obtener la fecha en formato MySQL (YYYY-MM-DD HH:MM:SS)
const obtenerFechaMySQL = () => {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

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

// Tickets
app.get(['/api/tickets', '/tickets'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const ticketsFormateados = results.map(t => {
      let notas = t.notas;
      if (typeof notas === 'string') {
        try { notas = JSON.parse(notas); } catch (e) { notas = []; }
      }
      return { ...t, notas: notas || [] };
    });
    
    res.json(ticketsFormateados);
  });
});

app.post(['/api/tickets', '/tickets'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.archivos;
  
  // Serializamos arreglos u objetos que no sean fechas
  for (let key in ticketData) {
    if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
      ticketData[key] = JSON.stringify(ticketData[key]);
    }
  }

  // Asignamos la fecha limpia en formato de texto plano para MySQL
  ticketData.created_at = obtenerFechaMySQL();

  db.query('INSERT INTO tickets SET ?', ticketData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Ticket creado exitosamente', id: result.insertId });
  });
});

app.put(['/api/tickets/:folio', '/tickets/:folio'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.folio;
  delete ticketData.archivos;

  for (let key in ticketData) {
    if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
      ticketData[key] = JSON.stringify(ticketData[key]);
    }
  }

  // Asignamos la fecha de actualización limpia en texto plano
  ticketData.updated_at = obtenerFechaMySQL();

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
      return { ...cat, subcategorias: subcats || [] };
    });
    
    res.json(categoriasFormateadas);
  });
});

app.post(['/api/categorias/sincronizar', '/categorias/sincronizar'], (req, res) => {
  res.json({ success: true, message: 'Sincronizado' });
});

app.get(['/api/subcategorias', '/subcategorias'], (req, res) => {
  db.query('SELECT * FROM subcategorias', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get(['/api/elementos', '/elementos'], (req, res) => {
  db.query('SELECT * FROM elementos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Encuestas
app.post(['/api/encuestas', '/encuestas'], (req, res) => {
  const data = { ...req.body };
  
  if (data.fecha) delete data.fecha;
  if (data.fecha_respuesta) delete data.fecha_respuesta;

  for (let key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      data[key] = JSON.stringify(data[key]);
    }
  }

  data.fecha_respuesta = obtenerFechaMySQL();

  const guardarEnBD = (datosFinales) => {
    db.query('INSERT INTO encuestas SET ?', datosFinales, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Encuesta guardada con éxito', id: result.insertId });
    });
  };

  if (!data.ticket_id && data.folio) {
    db.query('SELECT id FROM tickets WHERE folio = ?', [data.folio], (err, results) => {
      if (!err && results.length > 0) {
        data.ticket_id = results[0].id;
      }
      guardarEnBD(data);
    });
  } else {
    guardarEnBD(data);
  }
});

app.get(['/api/encuestas/reporte', '/encuestas/reporte'], (req, res) => {
  db.query('SELECT * FROM encuestas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const encuestasFormateadas = results.map(e => {
      let resp = e.respuestas;
      if (typeof resp === 'string') {
        try { resp = JSON.parse(resp); } catch (err) { resp = []; }
      }
      return { ...e, respuestas: resp };
    });

    let suma = 0;
    encuestasFormateadas.forEach(r => suma += (Number(r.promedio) || Number(r.calificacion) || 0));
    const promedio = encuestasFormateadas.length > 0 ? (suma / encuestasFormateadas.length).toFixed(1) : 0;

    res.json({
      estadisticas: { promedio, total: encuestasFormateadas.length },
      historial: encuestasFormateadas
    });
  });
});

// Endpoint de KPIs de Tiempos
app.get(['/api/kpis/tiempos', '/kpis/tiempos'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const kpiTiemposCalculados = results.map(t => {
      const fechaCreacion = new Date(t.created_at || t.fecha || Date.now());
      const fechaCierre = (t.estatus === 'Cerrado' || t.estatus === 'CERRADO') ? new Date(t.updated_at || Date.now()) : new Date();
      
      let diffMinutos = Math.round((fechaCierre - fechaCreacion) / (1000 * 60));
      
      if (isNaN(diffMinutos) || diffMinutos < 0 || diffMinutos > 1440) {
        diffMinutos = 5; 
      }

      return {
        id: t.id,
        folio: t.folio,
        minutos_resolucion: diffMinutos
      };
    });

    res.json(kpiTiemposCalculados);
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
