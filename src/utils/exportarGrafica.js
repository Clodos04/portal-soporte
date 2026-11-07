// Descarga una gráfica (SVG de Recharts) como imagen PNG, con título y fondo del tema actual.
// Las gráficas usan variables CSS (var(--color-...)); al convertir a imagen hay que resolverlas a colores reales.

export async function exportarGraficaComoPng(contenedor, titulo = 'grafica') {
  const svg = contenedor?.querySelector('svg.recharts-surface') || contenedor?.querySelector('svg');
  if (!svg) throw new Error('No hay una gráfica para exportar.');

  const caja = svg.getBoundingClientRect();
  const estilo = getComputedStyle(contenedor);
  const resolver = (texto) => texto.replace(/var\((--[\w-]+)\)/g, (_, nombre) => estilo.getPropertyValue(nombre).trim() || '#8a8f98');

  const clon = svg.cloneNode(true);
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clon.setAttribute('width', String(caja.width));
  clon.setAttribute('height', String(caja.height));
  clon.setAttribute('style', `font-family: ${resolver('Inter, system-ui, sans-serif')}`);
  const svgTexto = resolver(new XMLSerializer().serializeToString(clon));

  const escala = 2; // el doble de resolución para que se vea nítida al pegarla en una presentación
  const margenSuperior = 44;
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(caja.width * escala);
  lienzo.height = Math.round((caja.height + margenSuperior) * escala);
  const ctx = lienzo.getContext('2d');
  ctx.scale(escala, escala);

  ctx.fillStyle = resolver('var(--color-slate-800)');
  ctx.fillRect(0, 0, caja.width, caja.height + margenSuperior);
  ctx.fillStyle = resolver('var(--color-slate-50)');
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillText(titulo, 16, 28);

  const url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const imagen = await new Promise((resolverImagen, rechazar) => {
      const img = new Image();
      img.onload = () => resolverImagen(img);
      img.onerror = () => rechazar(new Error('No se pudo generar la imagen.'));
      img.src = url;
    });
    ctx.drawImage(imagen, 0, margenSuperior, caja.width, caja.height);
  } finally {
    URL.revokeObjectURL(url);
  }

  const blob = await new Promise(r => lienzo.toBlob(r, 'image/png'));
  if (!blob) throw new Error('No se pudo guardar la imagen.');
  const enlace = document.createElement('a');
  const sello = new Date().toISOString().slice(0, 10);
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '_')}_${sello}.png`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}
