#!/usr/bin/env bash
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

VM_IP="${ORACLE_VM_IP:-$1}"
VM_USER="${ORACLE_VM_USER:-ubuntu}"
SSH_KEY="${ORACLE_SSH_KEY_PATH:-$2}"

echo "=== Wdrożenie Bota WhatsApp na Oracle Cloud VM ==="

if [ -z "$VM_IP" ]; then
  echo "❌ BŁĄD: Ustaw ORACLE_VM_IP w pliku .env lub podaj jako pierwszy argument."
  echo "Przykładowe wywołanie: ./scripts/deploy_oracle.sh 130.61.X.X ~/.ssh/oracle_key.key"
  exit 1
fi

SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="ssh -i $SSH_KEY"
fi

REMOTE_DIR="house-mate-whatsapp-bot"

echo "➡️ Łączenie z $VM_USER@$VM_IP..."
$SSH_CMD "$VM_USER@$VM_IP" "mkdir -p $REMOTE_DIR"

echo "➡️ Przesyłanie plików projektu..."
rsync -avz -e "$SSH_CMD" --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude 'data' ./ "$VM_USER@$VM_IP:$REMOTE_DIR/"

echo "➡️ Uruchamianie bota w kontenerze Docker na Oracle VM..."
$SSH_CMD "$VM_USER@$VM_IP" "cd $REMOTE_DIR && docker compose up -d --build"

echo "✅ Wdrożenie na Oracle Cloud VM zakończone sukcesem!"
