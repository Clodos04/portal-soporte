// Exportación a CSV compatible con Excel (UTF-8 con BOM, separador coma, acentos correctos).

const escaparCelda = (valor) => {
  if (valor === null || valor === undefined) return '';
  let texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  // Evita que Excel interprete el texto como fórmula (inyección de fórmulas en CSV)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/**
 * columnas: [{ titulo: 'Folio', valor: (fila) => fila.folio }, ...]
 */
export const exportarCSV = (filas, columnas, nombreBase = 'reporte') => {
  const encabezado = columnas.map(c => escaparCelda(c.titulo)).join(',');
  const cuerpo = filas.map(f => columnas.map(c => escaparCelda(c.valor(f))).join(','));
  const contenido = '﻿' + [encabezado, ...cuerpo].join('\r\n');

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const sello = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  enlace.href = url;
  enlace.download = `${nombreBase}_${sello}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
};
