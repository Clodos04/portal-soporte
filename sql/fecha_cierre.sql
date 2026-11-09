-- Fecha real de cierre del ticket. El SLA se mide hasta aquí, no hasta la última edición (updated_at).
-- Ejecutar una sola vez en la base `sav`, ANTES de reiniciar el servidor con esta versión.
ALTER TABLE tickets ADD COLUMN fecha_cierre DATETIME NULL;

-- Tickets ya cerrados: se toma su última modificación como mejor estimación del cierre.
-- (Los que se hayan editado después de cerrarse conservan esa fecha; no hay forma de recuperar la original.)
UPDATE tickets SET fecha_cierre = updated_at
WHERE LOWER(estatus) LIKE '%cerrado%' AND fecha_cierre IS NULL;
