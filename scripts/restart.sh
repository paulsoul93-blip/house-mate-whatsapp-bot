#!/usr/bin/env bash
echo "=== Restart Bota (Docker / Process) ==="
if command -v docker &> /dev/null && docker compose ps | grep -q house-mate-whatsapp-bot; then
  docker compose restart
else
  echo "[Info] Restartowanie usługi lokalnej npm..."
  pkill -f "node dist/index.js" || true
  nohup npm run start > bot.log 2>&1 &
fi
echo "✅ Restart ukończony!"
