#!/usr/bin/env bash
set -e

echo "=== Instalacja Bota WhatsApp House Mate App ==="

if [ ! -f .env ]; then
  echo "[Info] Tworzenie pliku .env z .env.example..."
  cp .env.example .env
fi

echo "[Info] Instalowanie zależności Node.js..."
npm install

echo "[Info] Kompilacja kodu TypeScript..."
npm run build

echo "✅ Instalacja zakończona pomyślnie!"
