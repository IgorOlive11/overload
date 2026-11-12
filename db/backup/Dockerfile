# Backup diário do Postgres do Overload para um armazenamento S3 nas micros da Oracle.
# Contexto de build: db/backup.
FROM postgres:16-alpine
RUN apk add --no-cache rclone
COPY backup.sh /usr/local/bin/backup.sh
COPY iniciar.sh /usr/local/bin/iniciar.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/iniciar.sh
CMD ["/usr/local/bin/iniciar.sh"]
