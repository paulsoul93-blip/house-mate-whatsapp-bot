$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath ".env")) {
    throw "The .env file is missing. Run scripts/install.ps1 first."
}

$host.UI.RawUI.WindowTitle = "House Mate WhatsApp Bot"

Write-Host "Starting House Mate WhatsApp Bot..." -ForegroundColor Cyan
Write-Host "For first-time setup, scan the QR code in WhatsApp > Settings > Linked devices." -ForegroundColor Yellow

& npm.cmd start

if ($LASTEXITCODE -ne 0) {
    throw "The bot exited with code $LASTEXITCODE."
}
