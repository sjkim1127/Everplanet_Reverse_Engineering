@echo off
:: EverPlanet hosts removal
:: Requires Administrator privileges!

echo ============================================
echo   EverPlanet Hosts Removal
echo ============================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Please run as Administrator!
    pause
    exit /b 1
)

set HOSTS=%SystemRoot%\System32\drivers\etc\hosts

echo [1/1] Removing EverPlanet entries...
findstr /V /C:"211.39.129.201" /C:"211.39.129.202" /C:"EverPlanet Private Server" "%HOSTS%" > "%HOSTS%.tmp"
move /Y "%HOSTS%.tmp" "%HOSTS%" >nul

echo [+] Removal complete!
pause
