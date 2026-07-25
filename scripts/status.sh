#!/usr/bin/env bash
echo "=== Status Bota WhatsApp House Mate App ==="
curl -s http://localhost:3000/status || echo "❌ Bot nie odpowiada na serwerze HTTP localhost:3000"
