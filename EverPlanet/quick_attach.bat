@echo off
REM EverPlanet Quick Attach Script
REM 게임을 실행하고 즉시 Frida로 attach

cd /d "C:\Reversecore_Workspace\EverPlanet"

echo [*] Starting game...
start "" "EverPlanet_KR_v1842_U_DEVM.exe"

echo [*] Waiting 500ms for process to start...
ping 127.0.0.1 -n 1 -w 500 > nul

echo [*] Finding process and attaching Frida...
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq EverPlanet_KR_v1842_U_DEVM.exe" /NH') do (
    echo [*] Found PID: %%i
    frida -l "C:\Reversecore_Workspace\hook_force_login.js" -p %%i
    goto :done
)

echo [!] Process not found!
:done
pause
