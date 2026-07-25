Write-Host "=== Instalacja Bota WhatsApp House Mate App ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "[Info] Tworzenie pliku .env z .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "[Info] Instalowanie zależności Node.js..." -ForegroundColor Yellow
npm install

Write-Host "[Info] Kompilacja kodu TypeScript..." -ForegroundColor Yellow
npm run build

Write-Host "✅ Instalacja zakończona pomyślnie!" -ForegroundColor Green
