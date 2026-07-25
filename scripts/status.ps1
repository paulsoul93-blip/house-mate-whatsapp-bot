Write-Host "=== Status Bota WhatsApp House Mate App ===" -ForegroundColor Cyan
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/status" -TimeoutSec 5
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Bot nie odpowiada na serwerze HTTP localhost:3000" -ForegroundColor Red
}
