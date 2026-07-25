Write-Host "=== Restart Bota ===" -ForegroundColor Cyan
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    docker compose restart
} else {
    Stop-Process -Name "node" -ErrorAction SilentlyContinue
    Start-Process npm -ArgumentList "run start" -NoNewWindow
}
Write-Host "✅ Restart ukończony!" -ForegroundColor Green
