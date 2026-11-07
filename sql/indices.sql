-- Índices recomendados para acelerar el portal. Ejecutar UNA vez en la BD `sav` (phpMyAdmin → pestaña SQL).
-- Si algún índice ya existe, MySQL avisará con "Duplicate key name": se puede ignorar ese mensaje.
CREATE INDEX idx_tickets_folio ON tickets (folio);
CREATE INDEX idx_tickets_estatus ON tickets (estatus);
CREATE INDEX idx_tickets_fecha ON tickets (fecha);
CREATE INDEX idx_tickets_equipo_sub ON tickets (equipo, subcategoria);
CREATE INDEX idx_chat_folio ON mensajes_chat (folio);
