#!/usr/bin/env bash
set -e
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_house_mate_${TIMESTAMP}.tar.gz"

echo "=== Tworzenie kopii zapasowej danych bota (${BACKUP_FILE}) ==="
if [ -d "data" ]; then
  tar -czvf "${BACKUP_FILE}" data/
  echo "✅ Kopia zapasowa zapisana w ${BACKUP_FILE}"
else
  echo "⚠️ Katalog data/ nie istnieje jeszcze."
fi
