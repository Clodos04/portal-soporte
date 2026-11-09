// Detecta si al guardar el catálogo se cambió o agregó algún SLA (de categoría o de elemento).
// Debe coincidir con la comprobación del servidor (mapaSla en server.cjs).
const mapaSla = (categorias) => {
  const mapa = new Map();
  (Array.isArray(categorias) ? categorias : []).forEach((cat) => {
    if (!cat) return;
    mapa.set(`c${cat.id}`, String(cat.sla ?? 24));
    (Array.isArray(cat.subcategorias) ? cat.subcategorias : []).forEach((sub) => {
      if (!sub || typeof sub !== 'object') return;
      (Array.isArray(sub.elementos) ? sub.elementos : []).forEach((el) => {
        if (el && typeof el === 'object') mapa.set(`c${cat.id}|s${sub.id}|e${el.id}`, String(el.sla ?? ''));
      });
    });
  });
  return mapa;
};

export const slaCambio = (anteriores, nuevas) => {
  const antes = mapaSla(anteriores);
  return [...mapaSla(nuevas)].some(([clave, valor]) => antes.get(clave) !== valor);
};
