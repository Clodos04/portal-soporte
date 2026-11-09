export const MAX_ADJUNTO_MB = 10;
export const TIPOS_ADJUNTO = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.log,.doc,.docx,.xls,.xlsx,.zip';

export const formatearTamano = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Valida en el navegador antes de enviar (el servidor vuelve a validar). Devuelve un mensaje de error o null.
export const validarAdjunto = (archivo) => {
  if (!archivo) return null;
  if (archivo.size > MAX_ADJUNTO_MB * 1048576) return `«${archivo.name}» pesa más de ${MAX_ADJUNTO_MB} MB.`;
  const ext = '.' + String(archivo.name).split('.').pop().toLowerCase();
  if (!TIPOS_ADJUNTO.split(',').includes(ext)) return `«${archivo.name}»: tipo de archivo no permitido.`;
  return null;
};

// Sube un archivo al ticket. Devuelve { ok, error }. Nunca lanza: el ticket ya existe aunque falle la subida.
export const subirAdjunto = async (folio, archivo) => {
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(folio)}/adjuntos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Nombre-Archivo': encodeURIComponent(archivo.name) },
      body: archivo
    });
    if (res.ok) return { ok: true };
    const datos = await res.json().catch(() => ({}));
    return { ok: false, error: datos.error || 'No se pudo subir el archivo.' };
  } catch (e) {
    return { ok: false, error: 'Sin conexión con el servidor al subir el archivo.' };
  }
};
