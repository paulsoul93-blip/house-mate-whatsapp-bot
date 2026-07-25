#!/usr/bin/env bash
set -e
echo "=== Testowanie Bota WhatsApp House Mate App ==="
npm run test
npm run build
echo "✅ Wszystkie testy i kompilacja przeszły pomyślnie!"
