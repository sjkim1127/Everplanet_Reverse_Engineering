@echo off
chcp 65001 >nul
echo ============================================
echo   EverPlanet MINIMAL Patch Launcher
echo   (patchnote.md patches only)
echo ============================================
echo.

REM Kill existing processes
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im EverPlanet_KR_v1842_U_DEVM.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start server
echo [1/3] Starting server...
start "EverPlanet Server" cmd /c "cd /d "%~dp0..\droopl\everplanet-server" && node server.js"
timeout /t 2 /nobreak >nul

REM Start game and attach Frida
echo [2/3] Starting game...
echo [3/3] Attaching Frida (MINIMAL)...
powershell -ExecutionPolicy Bypass -File "%~dp0quick_attach_minimal.ps1"

pause
