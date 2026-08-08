#!/usr/bin/env bash
set -euo pipefail

VM_IP="${ORACLE_VM_IP:-${1:-}}"
VM_USER="${ORACLE_VM_USER:-ubuntu}"
SSH_KEY="${ORACLE_SSH_KEY_PATH:-${2:-}}"
REMOTE_DIR="${ORACLE_REMOTE_DIR:-house-mate-whatsapp-bot}"

if [[ -z "$VM_IP" ]]; then
  echo "Set ORACLE_VM_IP in .env or pass the VM IP as the first argument."
  exit 1
fi

if [[ -z "$SSH_KEY" || ! -f "$SSH_KEY" ]]; then
  echo "Set ORACLE_SSH_KEY_PATH to the private SSH key or pass it as the second argument."
  exit 1
fi

SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
RSYNC_SSH="ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
REMOTE="$VM_USER@$VM_IP"

echo "Checking SSH access to $REMOTE."
"${SSH[@]}" "$REMOTE" "command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sudo sh)"

echo "Creating remote project directory."
"${SSH[@]}" "$REMOTE" "mkdir -p '$REMOTE_DIR'"

echo "Uploading production source without local session data."
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'data' \
  --exclude '*.log' \
  -e "$RSYNC_SSH" ./ "$REMOTE:$REMOTE_DIR/"

echo "Uploading environment configuration over SSH."
scp -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new .env "$REMOTE:$REMOTE_DIR/.env"

echo "Starting the persistent Docker service."
"${SSH[@]}" "$REMOTE" "cd '$REMOTE_DIR' && sed -i 's/^HTTP_HOST=.*/HTTP_HOST=\"0.0.0.0\"/' .env && mkdir -p data && sudo docker compose up -d --build"

echo "Checking the remote service."
"${SSH[@]}" "$REMOTE" "cd '$REMOTE_DIR' && sudo docker compose ps && sudo docker compose exec -T house-mate-bot node -e \"fetch('http://127.0.0.1:3000/health').then(r => { if (!r.ok) process.exit(1); console.log('health: ok'); }).catch(() => process.exit(1))\""

echo "Deployment completed. The first QR scan must be done through an SSH tunnel:"
echo "ssh -i \"$SSH_KEY\" -L 3000:127.0.0.1:3000 $REMOTE"
echo "Then open http://127.0.0.1:3000/qr and scan the dedicated bot account."
