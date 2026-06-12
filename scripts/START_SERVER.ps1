# EverPlanet Private Server - One-Click Launcher

$ErrorActionPreference = "SilentlyContinue"

# Configuration
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ServerDir = Join-Path $ProjectRoot "droopl\everplanet-server"
$GameDir = Join-Path $ProjectRoot "EverPlanet"
$GameExe = "EverPlanet_KR_v1842_U_DEVM.exe"
$FridaScript = Join-Path $ProjectRoot "frida\hook_force_login.js"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   EverPlanet Private Server Launcher v1.0" -ForegroundColor Cyan
Write-Host "   One-Click Start: Server + Game + Frida" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing processes
Write-Host "[1/4] Cleaning up existing processes..." -ForegroundColor Green
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "EverPlanet*" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "      Done!" -ForegroundColor Yellow
Write-Host ""

# Step 2: Start Node.js server
Write-Host "[2/4] Starting Node.js server..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$ServerDir`" && node server.js" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "      Server started (PID: $($serverProcess.Id))" -ForegroundColor Yellow
Write-Host "      Ports: 3431, 3432, 47611" -ForegroundColor Yellow
Write-Host ""

# Step 3: Start game client
Write-Host "[3/4] Starting game client..." -ForegroundColor Green
$gameProcess = Start-Process -FilePath "$GameDir\$GameExe" -WorkingDirectory $GameDir -PassThru
Write-Host "      Game started (PID: $($gameProcess.Id))" -ForegroundColor Yellow
Write-Host ""

# Step 4: Wait and attach Frida
Write-Host "[4/4] Attaching Frida hook..." -ForegroundColor Green
Write-Host "      Waiting 500ms for game to initialize..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 500

# Verify game is still running
$gameProcess = Get-Process -Name "EverPlanet*" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($gameProcess) {
    Write-Host "      Found game process: $($gameProcess.ProcessName) (PID: $($gameProcess.Id))" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=================== FRIDA OUTPUT ===================" -ForegroundColor Cyan
    Write-Host ""
    
    # Attach Frida (this will block and show output)
    frida -p $gameProcess.Id -l $FridaScript
} else {
    Write-Host "      [ERROR] Game process not found!" -ForegroundColor Red
    Write-Host "      The game may have crashed or closed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if antivirus blocked the game" -ForegroundColor Yellow
    Write-Host "  2. Run as Administrator" -ForegroundColor Yellow
    Write-Host "  3. Check server console for errors" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host
