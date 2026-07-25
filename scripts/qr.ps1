Write-Host "=== WhatsApp QR Code Status ===" -ForegroundColor Cyan
Write-Host "Otwórz w przeglądarce: http://localhost:3000/qr" -ForegroundColor Yellow
Start-Process "http://localhost:3000/qr"
