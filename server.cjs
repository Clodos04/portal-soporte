const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

// Importamos las respuestas automáticas y lógica de Centinela / Chat
const {
  obtenerMensajeCentinela,
  obtenerFlujoPreguntas,
  evaluarSiguienteRespuestaChat
} = require('./respuestasChat.cjs');

const app = express();
app.use(express.json());
app.use(cors());

// ESTO HACE QUE LA CARPETA PUBLIC SEA ACCESIBLE PÚBLICAMENTE (Soluciona el audio 404)
app.use(express.static(path.join(__dirname, 'public')));

// 1. Conexión principal para Tickets y lógica general (sav)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sav_db-soporte',
  user: process.env.DB_USER || 'mysql',
  password: process.env.DB_PASSWORD || 'db6f98fa1380ced73c0d',
  database: process.env.DB_NAME || 'sav',
  port: process.env.DB_PORT || 3306
});

// 2. Conexión dedicada para Centinela
const dbCentinela = mysql.createConnection({
  host: '192.168.240.103',
  user: 'root',
  password: 'C01nts#BD2025!',
  database: 'Centinela',
  port: 3306
});

db.connect((err) => { 
  if (err) console.error('Error BD Tickets:', err); 
  else console.log('Conectado a BD Tickets (sav)'); 
});

dbCentinela.connect((err) => { 
  if (err) console.error('Error BD Centinela:', err); 
  else console.log('Conectado a Servidor Centinela (Base de datos: Centinela)'); 
});

// ============================================================================
// FUNCIONES DE FECHA Y HORA EXACTA DE MÉXICO
// ============================================================================
const obtenerFechaHoraMexico = () => {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  return {
    fechaSolo: `${yyyy}-${mm}-${dd}`,
    fechaHora: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    horaCorta: `${hh}:${min}`
  };
};

const obtenerFechaMySQL = () => obtenerFechaHoraMexico().fechaHora;

// Login
const handleLogin = (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE username = ? AND password = ? AND estatus = "ACTIVO"', [username, password], (err, results) => {
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
app.post(['/api/login', '/login'], handleLogin);

// Tickets (CRUD)
app.get(['/api/tickets', '/tickets'], (req, res) => {
  db.query('SELECT * FROM tickets ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(t => ({
      ...t,
      notas: typeof t.notas === 'string' ? JSON.parse(t.notas || '[]') : (t.notas || [])
    })));
  });
});

app.get(['/api/tickets/contar-hoy', '/tickets/contar-hoy'], (req, res) => {
  const hoyMexico = obtenerFechaHoraMexico().fechaSolo;
  const query = "SELECT COUNT(*) as total FROM tickets WHERE DATE(fecha) = ?";
  db.query(query, [hoyMexico], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ totalHoy: results[0].total, fechaHoy: hoyMexico });
  });
});

const continuarInsercionTicket = (ticketData, res) => {
  const { fechaSolo, fechaHora, horaCorta } = obtenerFechaHoraMexico();
  const anioMesActual = fechaSolo.slice(0, 7);
  const catUpper = (ticketData.categoria || '').toUpperCase();
  const esDispositivo = catUpper.includes('DISPOSITIVO') || catUpper.includes('HARDWARE');

  const guardarTicketYPrimerMensaje = (folioPrevio = null) => {
    const flujo = obtenerFlujoPreguntas(ticketData, folioPrevio);
    const primerMensaje = flujo[0];

    for (let key in ticketData) {
      if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
        ticketData[key] = JSON.stringify(ticketData[key]);
      }
    }
    ticketData.fecha = fechaSolo;
    ticketData.created_at = fechaHora;

    db.query('INSERT INTO tickets SET ?', ticketData, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [ticketData.folio, 'Sistema', primerMensaje, horaCorta], () => {
        res.json({ message: 'Ticket creado exitosamente', id: result.insertId, fecha: fechaSolo, folioPrevio });
      });
    });
  };

  if (esDispositivo && ticketData.equipo && ticketData.equipo !== 'Ninguno' && ticketData.subcategoria) {
    const queryPrevio = `
      SELECT folio FROM tickets 
      WHERE equipo = ? 
      AND subcategoria = ? 
      AND fecha LIKE ? 
      ORDER BY id ASC LIMIT 1
    `;
    db.query(queryPrevio, [ticketData.equipo, ticketData.subcategoria, `${anioMesActual}%`], (errPrev, resPrev) => {
      const folioAnterior = (!errPrev && resPrev && resPrev.length > 0) ? resPrev[0].folio : null;
      guardarTicketYPrimerMensaje(folioAnterior);
    });
  } else {
    guardarTicketYPrimerMensaje(null);
  }
};

app.post(['/api/tickets', '/tickets'], (req, res) => {
  const ticketData = { ...req.body };
  delete ticketData.archivos;

  db.query('SELECT id FROM tickets WHERE folio = ?', [ticketData.folio], (errCheck, existing) => {
    if (errCheck) return res.status(500).json({ error: errCheck.message });
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Este ticket ya fue registrado previamente.' });
    }

    if (ticketData.tipo_solicitud === 'CENTINELA' && ticketData.equipo && ticketData.subcategoria) {
      const { fechaSolo, fechaHora, horaCorta } = obtenerFechaHoraMexico();
      const anioMesActual = fechaSolo.slice(0, 7);

      const queryMesActual = `
        SELECT * FROM tickets 
        WHERE equipo = ? 
        AND subcategoria = ? 
        AND fecha LIKE ?
        ORDER BY id ASC LIMIT 1
      `;

      db.query(queryMesActual, [ticketData.equipo, ticketData.subcategoria, `${anioMesActual}%`], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al verificar mes: ' + err.message });
        
        const esSubsecuente = results.length > 0;
        const folioAnterior = esSubsecuente ? results[0].folio : null;

        for (let key in ticketData) {
          if (typeof ticketData[key] === 'object' && ticketData[key] !== null) {
            ticketData[key] = JSON.stringify(ticketData[key]);
          }
        }
        ticketData.fecha = fechaSolo;
        ticketData.created_at = fechaHora;

        db.query('INSERT INTO tickets SET ?', ticketData, (err, result) => {
          if (err) return res.status(500).json({ error: err.message });

          const nuevoFolio = ticketData.folio;
          const textoMensaje = obtenerMensajeCentinela(nuevoFolio, esSubsecuente, folioAnterior);

          if (esSubsecuente) {
            db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600' WHERE folio = ?", [nuevoFolio]);
          }

          db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [nuevoFolio, 'Sistema', textoMensaje, horaCorta], (errChat) => {
            if (errChat) console.error("Error al registrar mensaje en chat:", errChat);
            res.json({ message: 'Ticket creado exitosamente', id: result.insertId, esSubsecuente, fecha: fechaSolo });
          });
        });
      });
    } else {
      continuarInsercionTicket(ticketData, res);
    }
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
  ticketData.updated_at = obtenerFechaMySQL();
  db.query('UPDATE tickets SET ? WHERE folio = ?', [ticketData, req.params.folio], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el ticket.' });
    res.json({ message: 'Ticket actualizado correctamente' });
  });
});

app.get(['/api/centinela/datos', '/centinela/datos'], (req, res) => {
  dbCentinela.query('SELECT idcamp, `desc` AS nombre FROM Camp', (err, campanasRes) => {
    if (err) return res.status(500).json({ error: 'Error al consultar Camp: ' + err.message });
    dbCentinela.query('SELECT idIPs, ip, Nodo AS equipo, camp AS idcamp FROM IPs WHERE Nodo IS NOT NULL AND Nodo != ""', (err, ipsRes) => {
      if (err) return res.status(500).json({ error: 'Error al consultar IPs: ' + err.message });
      res.json({ campanas: campanasRes, equipos: ipsRes });
    });
  });
});

app.get(['/api/campanas', '/campanas'], (req, res) => {
  dbCentinela.query('SELECT `desc` AS nombre FROM Camp', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(c => c.nombre));
  });
});

app.get(['/api/chat/:folio', '/chat/:folio'], (req, res) => {
  db.query('SELECT * FROM mensajes_chat WHERE folio = ? ORDER BY id ASC', [req.params.folio], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener mensajes' });
    res.json(results);
  });
});

app.post(['/api/chat', '/chat'], (req, res) => {
  const { folio, remitente, texto, hora } = req.body;
  const { fechaSolo, horaCorta } = obtenerFechaHoraMexico();
  const horaActual = hora || horaCorta;
  const anioMesActual = fechaSolo.slice(0, 7);

  db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [folio, remitente, texto, horaActual], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al guardar mensaje' });

    if (!remitente || remitente.toUpperCase() === 'SISTEMA') {
      return res.json({ success: true, id: result.insertId });
    }

    db.query('SELECT * FROM tickets WHERE folio = ? LIMIT 1', [folio], (errTicket, ticketsRes) => {
      if (errTicket || !ticketsRes || ticketsRes.length === 0) {
        return res.json({ success: true, id: result.insertId });
      }

      const ticket = ticketsRes[0];

      db.query('SELECT COUNT(*) AS totalSistema FROM mensajes_chat WHERE folio = ? AND remitente = "Sistema"', [folio], (errCount, countRes) => {
        if (errCount || !countRes) {
          return res.json({ success: true, id: result.insertId });
        }

        const mensajesDelSistema = countRes[0].totalSistema;

        const queryPrevio = `
          SELECT folio FROM tickets 
          WHERE equipo = ? 
          AND subcategoria = ? 
          AND fecha LIKE ? 
          AND id < ? 
          ORDER BY id ASC LIMIT 1
        `;

        db.query(queryPrevio, [ticket.equipo, ticket.subcategoria, `${anioMesActual}%`, ticket.id], (errPrev, resPrev) => {
          const folioAnteriorMes = (!errPrev && resPrev && resPrev.length > 0) ? resPrev[0].folio : null;

          const evaluacion = evaluarSiguienteRespuestaChat(ticket, remitente, texto, mensajesDelSistema, folioAnteriorMes);

          if (evaluacion && evaluacion.textoRespuesta) {
            if (evaluacion.cerrarTicket) {
              db.query("UPDATE tickets SET estatus = 'Cerrado', colorEstatus = 'bg-red-600' WHERE folio = ?", [folio]);
            }
            db.query('INSERT INTO mensajes_chat (folio, remitente, texto, hora) VALUES (?, ?, ?, ?)', [folio, 'Sistema', evaluacion.textoRespuesta, horaActual], () => {
              return res.json({ success: true, id: result.insertId, cerradoAutomatico: evaluacion.cerrarTicket });
            });
          } else {
            return res.json({ success: true, id: result.insertId });
          }
        });
      });
    });
  });
});

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

app.put(['/api/usuarios/:id', '/usuarios/:id'], (req, res) => {
  const { id } = req.params;
  const { nombre, paterno, materno, campana, username, estatus, nivel, gruposAsignados } = req.body;
  const gruposStr = Array.isArray(gruposAsignados) ? JSON.stringify(gruposAsignados) : (gruposAsignados || '[]');
  db.query('UPDATE usuarios SET nombre = ?, paterno = ?, materno = ?, campana = ?, username = ?, estatus = ?, nivel = ?, gruposAsignados = ? WHERE id = ?', 
    [nombre, paterno, materno, campana, username, estatus, nivel, gruposStr, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el usuario.' });
    res.json({ message: 'Usuario actualizado correctamente' });
  });
});

app.delete(['/api/usuarios/:id', '/usuarios/:id'], (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM usuarios WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'No se encontró el usuario.' });
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});

app.get(['/api/grupos', '/grupos'], (req, res) => {
  db.query('SELECT nombre FROM grupos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(g => g.nombre));
  });
});

app.post(['/api/grupos', '/grupos'], (req, res) => {
  db.query('INSERT INTO grupos (nombre) VALUES (?)', [req.body.nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo creado', id: result.insertId });
  });
});

app.delete(['/api/grupos/:nombre', '/grupos/:nombre'], (req, res) => {
  db.query('DELETE FROM grupos WHERE nombre = ?', [req.params.nombre], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Grupo eliminado' });
  });
});

app.get(['/api/categorias', '/categorias'], (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const categoriasFormateadas = results.map(cat => {
      let subcats = [];
      if (typeof cat.subcategorias === 'string') {
        try { subcats = JSON.parse(cat.subcategorias || '[]'); } catch (e) { subcats = []; }
      } else if (Array.isArray(cat.subcategorias)) {
        subcats = cat.subcategorias;
      }

      subcats = subcats.map(sub => {
        if (typeof sub === 'object' && sub !== null) {
          const fechaSub = sub.fecAlta || sub.fec_alta || cat.fec_alta || '13/10/2026';
          return { ...sub, fecAlta: fechaSub, fec_alta: fechaSub, elementos: Array.isArray(sub.elementos) ? sub.elementos : [] };
        }
        return sub;
      });

      const fechaCat = cat.fec_alta || cat.fecAlta || '13/10/2026';
      return {
        ...cat,
        fecAlta: fechaCat,
        fec_alta: fechaCat,
        subcategorias: subcats
      };
    });

    res.json(categoriasFormateadas);
  });
});

app.post(['/api/categorias/sincronizar', '/categorias/sincronizar'], (req, res) => {
  const categorias = req.body;
  if (!Array.isArray(categorias)) {
    return res.status(400).json({ error: 'Formato inválido, se esperaba un arreglo' });
  }

  db.query('DELETE FROM categorias', (errDel) => {
    if (errDel) {
      console.error('Error al limpiar categorías:', errDel);
      return res.status(500).json({ error: errDel.message });
    }

    if (categorias.length === 0) {
      return res.json({ success: true, message: 'Todas las categorías fueron eliminadas' });
    }

    const values = categorias.map(cat => {
      const fecha = cat.fecAlta || cat.fec_alta || new Date().toLocaleDateString('es-MX');
      const subcatsStr = JSON.stringify(cat.subcategorias || []);
      return [
        cat.id || null,
        cat.nombre,
        cat.sla || 24,
        cat.estatus || 'ACTIVO',
        fecha,
        cat.usuario || 'ADMINISTRADOR',
        subcatsStr
      ];
    });

    const sql = 'INSERT INTO categorias (id, nombre, sla, estatus, fec_alta, usuario, subcategorias) VALUES ?';
    db.query(sql, [values], (errIns) => {
      if (errIns) {
        console.error('Error al guardar categorías en MySQL:', errIns);
        return res.status(500).json({ error: errIns.message });
      }
      res.json({ success: true, message: 'Categorías y subcategorías guardadas en MySQL correctamente' });
    });
  });
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

app.post(['/api/encuestas', '/encuestas'], (req, res) => {
  const data = { ...req.body };
  if (data.fecha) delete data.fecha;
  if (data.fecha_respuesta) delete data.fecha_respuesta;
  delete data.promedio;
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
      if (!err && results.length > 0) data.ticket_id = results[0].id;
      guardarEnBD(data);
    });
  } else {
    guardarEnBD(data);
  }
});

app.get(['/api/encuestas/reporte', '/encuestas/reporte'], (req, res) => {
  db.query('SELECT * FROM encuestas', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const encuestasFormateadas = results.map(e => ({ ...e, respuestas: typeof e.respuestas === 'string' ? JSON.parse(e.respuestas || '[]') : (e.respuestas || []) }));
    let suma = 0;
    encuestasFormateadas.forEach(r => suma += (Number(r.calificacion) || 0));
    res.json({ estadisticas: { promedio: encuestasFormateadas.length > 0 ? (suma / encuestasFormateadas.length).toFixed(1) : 0, total: encuestasFormateadas.length }, historial: encuestasFormateadas });
  });
});

app.get(['/api/kpis/tiempos', '/kpis/tiempos'], (req, res) => {
  db.query('SELECT * FROM tickets', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(t => ({ id: t.id, folio: t.folio, minutos_resolucion: Math.round(((t.estatus === 'Cerrado' ? new Date(t.updated_at) : new Date()) - new Date(t.created_at)) / (1000 * 60)) || 5 })));
  });
});

// Manejo correcto de estáticos y rutas bajo el subdirectorio /SAV_tiV2
app.use('/SAV_tiV2', express.static(path.join(__dirname, 'dist')));

app.get(/^\/SAV_tiV2\/?.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/SAV_tiV2/');
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
