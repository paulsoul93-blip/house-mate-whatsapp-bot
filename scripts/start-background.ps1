$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $projectRoot "data"
$logDirectory = Join-Path $dataDirectory "logs"
$logFile = Join-Path $logDirectory ("bot-{0}.log" -f (Get-Date -Format "yyyy-MM-dd-HHmmss"))
$environmentFile = Join-Path $projectRoot ".env"
$entryPoint = Join-Path $projectRoot "dist\index.js"

Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Configuration file not found: $environmentFile."
}

if (-not (Test-Path -LiteralPath $entryPoint)) {
    throw "Compiled entry point not found: $entryPoint. Run npm.cmd run build."
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

try {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:3000/status" -TimeoutSec 3
    if ($status.botName -eq "House Mate WhatsApp Bot") {
        Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format o)] Bot is already running."
        exit 0
    }
} catch {
    Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format o)] Starting bot process."
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& node.exe $entryPoint 2>&1 | ForEach-Object {
    Add-Content -LiteralPath $logFile -Value ([string]$_) -Encoding UTF8
}
$nodeExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

Add-Content -LiteralPath $logFile -Value "[$(Get-Date -Format o)] Bot process exited with code $nodeExitCode."
exit $nodeExitCode
