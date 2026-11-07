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

// Quita los emojis SOLO para mostrar un texto (no cambia lo que se guarda ni lo que se envía).
// Conserva los saltos de línea y colapsa los espacios que dejan los emojis.
export const sinEmojis = (texto = '') =>
  String(texto ?? '')
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]+[ \t]?/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

// Los nombres de personas llegan en mayúsculas ("CHRISTOPHER OSORIO"); textos como "Asistente TI" se dejan igual.
export const nombreSiEstaEnMayusculas = (texto = '') => {
  const t = String(texto ?? '');
  return t !== '' && t === t.toUpperCase() ? nombrePresentable(t) : t;
};
