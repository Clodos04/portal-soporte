// Clasifica el texto de un estatus en: 'abierto' | 'proceso' | 'cerrado' | 'otro'
export const tipoEstatus = (estatus = '') => {
  const e = String(estatus).toLowerCase();
  if (e.includes('cerrado') || e.includes('resuelto')) return 'cerrado';
  if (e.includes('proceso')) return 'proceso';
  if (e.includes('abierto')) return 'abierto';
  return 'otro';
};
