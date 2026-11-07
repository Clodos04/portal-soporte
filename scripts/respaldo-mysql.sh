#!/usr/bin/env bash
# Respaldo de la base de datos del portal (BD "sav") con mysqldump, comprimido y con limpieza de copias viejas.
#
# Variables (las mismas del portal; defínelas en el entorno donde lo ejecutes):
#   DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME      -> base a respaldar
#   DESTINO_RESPALDOS   carpeta donde guardar (por defecto ./respaldos)
#   DIAS_RETENCION      cuántos días conservar (por defecto 14)
#
# Uso:   ./scripts/respaldo-mysql.sh
# IMPORTANTE: prueba una restauración al menos una vez (ver docs/RESPALDOS-Y-MONITOREO.md). Un respaldo que
# nunca se ha restaurado no se sabe si sirve.

set -euo pipefail

: "${DB_HOST:?Falta DB_HOST}" "${DB_USER:?Falta DB_USER}" "${DB_PASSWORD:?Falta DB_PASSWORD}" "${DB_NAME:?Falta DB_NAME}"
DB_PORT="${DB_PORT:-3306}"
DESTINO="${DESTINO_RESPALDOS:-./respaldos}"
RETENCION="${DIAS_RETENCION:-14}"

mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"

# La contraseña se pasa por variable de entorno (no por la línea de comandos) para que no aparezca en `ps`.
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --routines --triggers --no-tablespaces \
  "$DB_NAME" | gzip > "$ARCHIVO"

# Verificación mínima: el archivo debe tener contenido
if [ ! -s "$ARCHIVO" ]; then
  echo "ERROR: el respaldo quedó vacío: $ARCHIVO" >&2
  rm -f "$ARCHIVO"
  exit 1
fi

# Borrar copias más viejas que la retención
find "$DESTINO" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"$RETENCION" -delete

echo "Respaldo creado: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
