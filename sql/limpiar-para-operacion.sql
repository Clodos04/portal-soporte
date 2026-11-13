-- DEJA EL PORTAL LISTO PARA OPERAR DESDE CERO.
-- Borra: tickets, chats, auditoria, adjuntos (registros), encuestas, feedback de encuestas y buzon.
-- NO toca: usuarios, grupos, campanas ni categorias (con sus SLA).
-- Ejecutar SOLO despues de un respaldo (sudo /usr/local/sbin/respaldo-sav.sh). No se puede deshacer.
SELECT 'ANTES' AS momento,
  (SELECT COUNT(*) FROM tickets) AS tickets,
  (SELECT COUNT(*) FROM mensajes_chat) AS chats,
  (SELECT COUNT(*) FROM auditoria_tickets) AS auditoria,
  (SELECT COUNT(*) FROM ticket_adjuntos) AS adjuntos,
  (SELECT COUNT(*) FROM encuestas) AS encuestas,
  (SELECT COUNT(*) FROM buzon_sugerencias) AS buzon,
  (SELECT COUNT(*) FROM usuarios) AS usuarios;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE encuesta_feedback;
TRUNCATE TABLE encuestas;
TRUNCATE TABLE mensajes_chat;
TRUNCATE TABLE auditoria_tickets;
TRUNCATE TABLE ticket_adjuntos;
TRUNCATE TABLE buzon_sugerencias;
TRUNCATE TABLE tickets;
SET FOREIGN_KEY_CHECKS = 1;
SELECT 'DESPUES' AS momento,
  (SELECT COUNT(*) FROM tickets) AS tickets,
  (SELECT COUNT(*) FROM mensajes_chat) AS chats,
  (SELECT COUNT(*) FROM auditoria_tickets) AS auditoria,
  (SELECT COUNT(*) FROM ticket_adjuntos) AS adjuntos,
  (SELECT COUNT(*) FROM encuestas) AS encuestas,
  (SELECT COUNT(*) FROM buzon_sugerencias) AS buzon,
  (SELECT COUNT(*) FROM usuarios) AS usuarios;
