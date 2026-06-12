@echo off
title EverPlanet Private Server Launcher

echo.
echo ============================================================
echo    EverPlanet Private Server Launcher
echo    Starting: Server + Game + Frida
echo ============================================================
echo.

REM Run the PowerShell launcher script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\START_SERVER.ps1"

pause
