$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipFile = "backup_house_mate_$timestamp.zip"

Write-Host "=== Tworzenie kopii zapasowej danych bota ($zipFile) ===" -ForegroundColor Cyan
if (Test-Path "data") {
    Compress-Archive -Path "data" -DestinationPath $zipFile -Force
    Write-Host "✅ Kopia zapasowa zapisana w $zipFile" -ForegroundColor Green
} else {
    Write-Host "⚠️ Katalog data/ nie istnieje jeszcze." -ForegroundColor Yellow
}
