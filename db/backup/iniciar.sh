#!/bin/sh
# Agenda o backup no cron do container (padrão: 06:15 UTC, 03:15 em Brasília) e mantém o processo em primeiro plano.
set -eu
if [ -z "${BACKUP_S3_ENDPOINT:-}" ] || [ -z "${BACKUP_S3_CHAVE:-}" ] || [ -z "${BACKUP_S3_SEGREDO:-}" ]; then
  echo "backup desligado: defina BACKUP_S3_ENDPOINT, BACKUP_S3_CHAVE e BACKUP_S3_SEGREDO"
  exec sleep infinity
fi
echo "${BACKUP_CRON:-15 6 * * *} /usr/local/bin/backup.sh > /proc/1/fd/1 2>&1" > /etc/crontabs/root
echo "backup agendado: ${BACKUP_CRON:-15 6 * * *} (UTC), destino ${BACKUP_S3_ENDPOINT}"
exec crond -f -l 8
