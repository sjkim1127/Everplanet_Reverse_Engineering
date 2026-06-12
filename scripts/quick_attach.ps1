# Quick Attach - 게임 시작 직후 Frida attach
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$gamePath = Join-Path $ProjectRoot "EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe"
$scriptPath = Join-Path $ProjectRoot "frida\hook_force_login.js"

Write-Host "[*] Starting game..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $gamePath -ArgumentList "-loginserveraddr:127.0.0.1:3431 -login" -WorkingDirectory (Split-Path $gamePath) -PassThru

Write-Host "[*] Waiting for process to initialize..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

Write-Host "[*] Attaching Frida to PID: $($proc.Id)" -ForegroundColor Green
frida -p $proc.Id -l $scriptPath

Write-Host "[*] Done" -ForegroundColor Green
