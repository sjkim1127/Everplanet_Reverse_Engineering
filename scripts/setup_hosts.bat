@echo off
:: EverPlanet Server Redirection Setup
:: Requires Administrator privileges!

echo ============================================
echo   EverPlanet Hosts File Setup
echo   (Administrator Required)
echo ============================================
echo.

:: Check admin rights
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Please run as Administrator!
    echo         Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

set HOSTS=%SystemRoot%\System32\drivers\etc\hosts

echo [1/2] Creating backup: hosts.backup
copy "%HOSTS%" "%HOSTS%.backup" >nul

echo [2/2] Adding EverPlanet server redirection...

:: Check if already added
findstr /C:"211.39.129.201" "%HOSTS%" >nul
if not errorlevel 1 (
    echo [!] Already configured.
) else (
    echo.>> "%HOSTS%"
    echo # EverPlanet Private Server>> "%HOSTS%"
    echo 127.0.0.1 211.39.129.201>> "%HOSTS%"
    echo 127.0.0.1 211.39.129.202>> "%HOSTS%"
    echo [+] Configuration complete!
)

echo.
echo ============================================
echo   Setup Complete!
echo   Now test with CheatEngine + Server Emulator.
echo ============================================
pause
