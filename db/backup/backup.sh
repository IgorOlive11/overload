#!/bin/sh
# Um backup: pg_dump do schema overload como overload_dono (dono de tudo nele, sem ser superusuário),
# envio para o S3 e remoção dos arquivos com mais de BACKUP_DIAS dias. As funções e o schema são recriados por db/papeis.sql.
set -eu
export RCLONE_CONFIG_DESTINO_TYPE=s3
export RCLONE_CONFIG_DESTINO_PROVIDER=Other
export RCLONE_CONFIG_DESTINO_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_DESTINO_ACCESS_KEY_ID="$BACKUP_S3_CHAVE"
export RCLONE_CONFIG_DESTINO_SECRET_ACCESS_KEY="$BACKUP_S3_SEGREDO"
export RCLONE_CONFIG_DESTINO_FORCE_PATH_STYLE=true
balde="${BACKUP_S3_BALDE:-overload-backups}"
arquivo="/tmp/overload-$(date -u +%Y%m%dT%H%M%SZ).dump"

PGPASSWORD="$SENHA_OVERLOAD_DONO" pg_dump -h banco -U overload_dono -d overload -n overload -Fc -f "$arquivo"
# Um dump vazio ou que não abre não vale como backup.
pg_restore -l "$arquivo" > /dev/null
tamanho=$(wc -c < "$arquivo")
rclone mkdir "destino:$balde"
rclone copy "$arquivo" "destino:$balde/"
rclone delete --min-age "${BACKUP_DIAS:-30}d" "destino:$balde/"
rm -f "$arquivo"
echo "backup ok: $(basename "$arquivo") ($tamanho bytes) em $balde"
