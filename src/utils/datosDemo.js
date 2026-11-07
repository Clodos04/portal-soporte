// Tickets de ejemplo para ver cómo lucen las gráficas. SOLO se usa en desarrollo (npm run dev) abriendo
// la dirección con ?demo (ej. http://localhost:5173/CTI/?demo). En producción este archivo no se incluye.
// Los datos son inventados y no se guardan en ningún lado.

// Generador pseudoaleatorio con semilla: los datos son siempre los mismos
function crearAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, '0');
const aTexto = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const TECNICOS = ['CHRISTOPHER OSORIO', 'HECTOR FLORES', 'MELISSA ESTEVEZ', 'SANTIAGO BENITEZ', 'ARTURO CAJICA'];
const SOLICITANTES = ['VALERIA LIRA', 'MARIA RODRIGUEZ', 'JULISSA AHUATL', 'VANESSA XOLETL', 'BELEN CONCHAS'];
const CATEGORIAS = [
  { nombre: 'DISPOSITIVOS', peso: 0.55, subs: ['FALLA AUDIO', 'TECLADO', 'MOUSE', 'MONITOR', 'DIADEMA'], minutos: [15, 140] },
  { nombre: 'TOUCHPOINT', peso: 0.45, subs: ['ACCESO', 'LENTITUD', 'CAÍDA DEL SISTEMA'], minutos: [120, 1500] }
];
const GRUPOS = ['SOPORTE TECNICO', 'CENTINELA', 'DESARROLLO DE SOFTWARE'];
const CAMPANAS = ['264 region 3', '264 region 7', '111 Región 9', 'Muevete'];

export function generarTicketsDemo(cantidad = 140, ahora = new Date()) {
  const azar = crearAleatorio(20261107);
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const tickets = [];

  for (let i = 0; i < cantidad; i++) {
    // Más tickets recientes que antiguos, y casi todos en horario laboral y entre semana
    const diasAtras = Math.floor(Math.pow(azar(), 1.6) * 60);
    const base = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasAtras);
    if ((base.getDay() === 0 || base.getDay() === 6) && azar() < 0.8) base.setDate(base.getDate() - (base.getDay() === 0 ? 2 : 1));
    const hora = azar() < 0.85 ? 8 + Math.floor(azar() * 10) : Math.floor(azar() * 24);
    const creado = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hora, Math.floor(azar() * 60), Math.floor(azar() * 60));
    if (creado > ahora) creado.setTime(ahora.getTime() - 60000 * Math.floor(azar() * 120));

    const r = azar();
    const categoria = r < CATEGORIAS[0].peso ? CATEGORIAS[0] : CATEGORIAS[1];
    const [minimo, maximo] = categoria.minutos;
    const minutos = Math.round(minimo + (maximo - minimo) * Math.pow(azar(), 1.4));
    const cierre = new Date(creado.getTime() + minutos * 60000);

    const antiguedadDias = diasAtras;
    const probabilidadCerrado = antiguedadDias > 2 ? 0.93 : 0.4;
    let estatus = 'Cerrado';
    if (azar() > probabilidadCerrado || cierre > ahora) estatus = azar() < 0.55 ? 'Abierto' : 'En Proceso';
    const sinAsignar = estatus === 'Abierto' && azar() < 0.6;
    const hoy = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
    const diaCreado = aTexto(creado).slice(0, 10);

    tickets.push({
      id: i + 1,
      folio: `${pad(creado.getDate())}${pad(creado.getMonth() + 1)}${String(creado.getFullYear()).slice(-2)}${pad((i % 40) + 1)}`,
      asunto: `${elegir(categoria.subs)} - reporte de prueba ${i + 1}`,
      creador: elegir(SOLICITANTES),
      tecnico: sinAsignar ? 'Sin Asignar' : elegir(TECNICOS),
      grupo: azar() < 0.7 ? GRUPOS[0] : elegir(GRUPOS),
      categoria: categoria.nombre,
      subcategoria: elegir(categoria.subs),
      campana: elegir(CAMPANAS),
      equipo: `B-0${1 + Math.floor(azar() * 3)}-${String(100 + Math.floor(azar() * 150)).padStart(3, '0')}`,
      estatus,
      colorEstatus: estatus === 'Cerrado' ? 'bg-red-500' : estatus === 'En Proceso' ? 'bg-orange-500' : 'bg-green-500',
      fecha: diaCreado === hoy ? hoy : diaCreado,
      created_at: aTexto(creado),
      updated_at: estatus === 'Cerrado' ? aTexto(cierre) : aTexto(creado),
      notas: []
    });
  }
  return tickets.sort((a, b) => b.id - a.id);
}
