$ErrorActionPreference = "Stop"

$taskName = "HouseMateWhatsAppBot"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backgroundScript = Join-Path $PSScriptRoot "start-background.ps1"
$powerShellExecutable = (Get-Command "powershell.exe" -ErrorAction Stop).Source
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path -LiteralPath $backgroundScript)) {
    throw "Background startup script not found: $backgroundScript."
}

$actionArguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$backgroundScript`""
$action = New-ScheduledTaskAction `
    -Execute $powerShellExecutable `
    -Argument $actionArguments `
    -WorkingDirectory $projectRoot
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$watchdogTrigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal `
    -UserId $currentUser `
    -LogonType Interactive `
    -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -MultipleInstances IgnoreNew

$task = New-ScheduledTask `
    -Action $action `
    -Trigger @($logonTrigger, $watchdogTrigger) `
    -Principal $principal `
    -Settings $settings `
    -Description "Starts House Mate WhatsApp Bot after the user signs in."

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host "Scheduled task '$taskName' was registered and started." -ForegroundColor Green
