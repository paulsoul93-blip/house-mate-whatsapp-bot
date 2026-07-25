Write-Host "=== Testowanie Bota WhatsApp House Mate App ===" -ForegroundColor Cyan
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "✅ Wszystkie testy i kompilacja przeszły pomyślnie!" -ForegroundColor Green
