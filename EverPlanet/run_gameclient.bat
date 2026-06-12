@echo off
chcp 65001 >nul
title EverPlanet GameClient Launcher (Auto Frida)

echo ============================================
echo   EverPlanet GameClient Launcher
echo   (Themida Packed Original + Auto Frida)
echo ============================================
echo.

:: Check if node is available
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH!
    echo Please install Node.js or add it to PATH.
    pause
    exit /b 1
)

:: Check if frida is available
where frida >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frida not found in PATH!
    echo Please install: pip install frida-tools
    pause
    exit /b 1
)

:: Check if server is running
netstat -an | findstr ":3432" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [1/4] Starting server...
    start "EverPlanet Server" cmd /k "cd /d C:\Reversecore_Workspace\droopl\everplanet-server && node server.js"
    echo      Waiting for server to start...
    timeout /t 3 /nobreak >nul
) else (
    echo [1/4] Server already running...
)

:: Check if GameClient.exe exists
if not exist "C:\Reversecore_Workspace\EverPlanet\GameClient.exe" (
    echo [ERROR] GameClient.exe not found!
    pause
    exit /b 1
)

:: Check if hook script exists
if not exist "C:\Reversecore_Workspace\hook_minimal.js" (
    echo [ERROR] hook_minimal.js not found!
    pause
    exit /b 1
)

:: Set log file
set LOGFILE=C:\Reversecore_Workspace\frida_log.txt
echo. > "%LOGFILE%"

echo [2/4] Starting GameClient.exe...
cd /d C:\Reversecore_Workspace\EverPlanet
start "" "GameClient.exe"
if errorlevel 1 (
    echo [ERROR] Failed to start GameClient.exe
    pause
    exit /b 1
)

echo [3/4] Waiting for Themida to unpack (10 seconds)...
echo      (Increase this if client crashes on attach)
timeout /t 10 /nobreak >nul

echo [4/4] Attaching Frida to GameClient.exe...
echo.

:: Find PID and attach Frida
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq GameClient.exe" /fo list ^| findstr "PID:"') do set PID=%%i

if "%PID%"=="" (
    echo [ERROR] GameClient.exe process not found!
    echo         The client may have crashed. Check if Themida protection is active.
    pause
    exit /b 1
)

echo      Found GameClient.exe with PID: %PID%
echo      Attaching Frida (logging to frida_log.txt)...
echo.
echo ============================================
echo   Frida Console (Press Ctrl+C to detach)
echo   Log file: %LOGFILE%
echo ============================================
echo.

:: Run Frida and save log to file
echo [Frida Output - also saved to %LOGFILE%]
echo.
frida -p %PID% -l "C:\Reversecore_Workspace\hook_minimal.js" > "%LOGFILE%" 2>&1
type "%LOGFILE%"

echo.
echo ============================================
echo   Frida session ended.
echo   Log saved to: %LOGFILE%
echo   Press any key to exit.
echo ============================================
pause >nul
