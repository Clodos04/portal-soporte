# Respaldos y monitoreo de CTI

> Estas instrucciones **no se han probado contra el servidor real**: se escribieron sin acceso a él. Sigue los pasos de
> "Probar" antes de confiar en ellas.

## 1. Respaldo de la base de datos (MySQL `sav`)

Es lo más importante: si la base se pierde, se pierden tickets, usuarios, chats, encuestas y el buzón.

### Opción A — desde phpMyAdmin (manual, sin instalar nada)
1. Entra a phpMyAdmin (puerto 8085) → selecciona la base `sav`.
2. Pestaña **Exportar** → método **Rápido**, formato **SQL** → **Continuar**.
3. Guarda el archivo `.sql` **fuera del servidor** (tu PC, un recurso compartido de la empresa…).

Hazlo al menos una vez por semana si no automatizas.

### Opción B — automático con el script `scripts/respaldo-mysql.sh`
Necesita `mysqldump` y `gzip` donde se ejecute (en el contenedor de MySQL ya viene `mysqldump`).

```bash
DB_HOST=sav_db-soporte DB_USER=mysql DB_PASSWORD='tu_clave' DB_NAME=sav \
DESTINO_RESPALDOS=/ruta/de/respaldos DIAS_RETENCION=14 \
./scripts/respaldo-mysql.sh
```

Para programarlo cada noche:
- **Easypanel:** en el servicio de MySQL, sección de *Cron jobs* / tareas programadas, agrega un comando diario
  (por ejemplo `0 2 * * *`) que ejecute el script con las variables de entorno.
- **Linux con cron:** `0 2 * * * /ruta/portal-soporte/scripts/respaldo-mysql.sh >> /var/log/respaldo-cti.log 2>&1`

**Importante:** la carpeta de destino debe estar en un **volumen persistente** (si no, desaparece al reiniciar el
contenedor) y, de preferencia, **copiarse a otra máquina**. Un respaldo en el mismo disco no te protege si el disco falla.

### Probar (hazlo una vez)
1. Crea una base vacía de prueba (por ejemplo `sav_prueba`) en phpMyAdmin.
2. Restaura el respaldo en ella: `gunzip -c respaldo.sql.gz | mysql -h HOST -u USUARIO -p sav_prueba`
   (o **Importar** en phpMyAdmin con el `.sql`).
3. Revisa que estén las tablas `tickets`, `usuarios`, `mensajes_chat`, `auditoria_tickets`, `buzon_sugerencias`.
4. Borra `sav_prueba`.

Si no has hecho este paso, **no sabes si tu respaldo sirve**.

## 2. Monitoreo de disponibilidad

El portal expone `GET /api/health` (sin iniciar sesión, sin datos sensibles):

```json
{ "estado": "ok", "baseDatos": "ok", "centinela": "ok", "tiempoActivoSegundos": 8421 }
```

- `estado`: `ok` (todo bien), `degradado` (portal y BD principal bien, **Centinela no responde**) o `caido` (BD principal falla; la respuesta es HTTP **503**).
- Úsalo con cualquier monitor que revise una URL cada 1–5 minutos y te avise por correo o Telegram/WhatsApp:
  Uptime Kuma (se puede instalar en Easypanel), UptimeRobot, etc. URL: `http://192.168.240.106/api/health`
  - Alerta cuando el código HTTP **no sea 200** o el texto no contenga `"estado":"ok"`.
- Como el portal está en red local, el monitor debe poder alcanzar esa IP (Uptime Kuma instalado en la misma red lo logra;
  los servicios en internet como UptimeRobot **no** llegan a una IP 192.168.x.x).
- Límite: 60 consultas por minuto por IP.

## 3. Qué falta (decisiones tuyas)
- Dónde se guardarán las copias fuera del servidor.
- Quién recibe las alertas del monitor.
