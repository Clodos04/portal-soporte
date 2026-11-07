// Los nombres de personas se guardan en mayúsculas en la base de datos ("CHRISTOPHER OSORIO").
// Solo se cambia cómo se MUESTRAN; los datos y las comparaciones siguen usando el valor original.
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

export const nombrePresentable = (nombre = '') => {
  const texto = String(nombre ?? '').trim();
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(/\s+/)
    .map((palabra, i) => (i > 0 && PARTICULAS.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(' ');
};
