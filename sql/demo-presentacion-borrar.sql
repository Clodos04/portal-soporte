-- Quita TODOS los datos de prueba de la presentacion (los que dicen "PRUEBA DE PRESENTACION" en la descripcion).
-- No toca tickets reales. Primero se borran las tablas hijas y al final los tickets.
START TRANSACTION;
DELETE FROM encuestas WHERE folio IN (SELECT folio FROM (SELECT folio FROM tickets WHERE descripcion LIKE '%PRUEBA DE PRESENTACION%') AS t);
DELETE FROM mensajes_chat WHERE folio IN (SELECT folio FROM (SELECT folio FROM tickets WHERE descripcion LIKE '%PRUEBA DE PRESENTACION%') AS t);
DELETE FROM auditoria_tickets WHERE folio IN (SELECT folio FROM (SELECT folio FROM tickets WHERE descripcion LIKE '%PRUEBA DE PRESENTACION%') AS t);
DELETE FROM ticket_adjuntos WHERE folio IN (SELECT folio FROM (SELECT folio FROM tickets WHERE descripcion LIKE '%PRUEBA DE PRESENTACION%') AS t);
DELETE FROM tickets WHERE descripcion LIKE '%PRUEBA DE PRESENTACION%';
COMMIT;
SELECT COUNT(*) AS tickets_restantes FROM tickets;
