@echo off
chcp 65001 >nul
title EverPlanet - Suspended Launch

echo ============================================
echo   EverPlanet Suspended Launch
echo   (CheatEngine 패치 적용용)
echo ============================================
echo.

cd /d "%~dp0.."

echo [INFO] 서버가 실행 중인지 확인하세요!
echo       서버 시작: cd droopl\everplanet-server ^&^& node server.js
echo.

powershell -ExecutionPolicy Bypass -File "tools\launch_suspended.ps1"

pause
