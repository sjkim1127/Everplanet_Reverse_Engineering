@echo off
chcp 65001 >nul
title EverPlanet Local Server Launcher

echo ============================================
echo   EverPlanet Local Server Launcher
echo   (로컬 서버 연결 + CheatEngine 패치 필요)
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

:: Check if server is running on port 3432
netstat -an | findstr ":3432" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [1/3] Starting server...
    start "EverPlanet Server" cmd /k "cd /d C:\Reversecore_Workspace\droopl\everplanet-server && node server.js"
    echo      Waiting for server to start...
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Server already running on port 3432
)

:: Verify server is up
netstat -an | findstr ":3432" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [ERROR] Server failed to start!
    pause
    exit /b 1
)

echo [2/3] Server is ready.
echo.
echo ============================================
echo   IMPORTANT: CheatEngine 패치 필요!
echo.
echo   1. CheatEngine을 열고 GameClient_Extended.CT 로드
echo   2. GameClient.exe 프로세스에 연결
echo   3. 3개 패치 활성화:
echo      - [CORE] 1. ServerChk pass
echo      - [CORE] 2. LaunchArg pass  
echo      - [CORE] 3. Terminate
echo.
echo   패치 후 게임에서 월드 선택이 가능해야 합니다.
echo ============================================
echo.

echo [3/3] Starting GameClient.exe with local server...
cd /d C:\Reversecore_Workspace\EverPlanet

:: 로컬 서버 주소로 실행 (-loginserveraddr: 옵션 사용)
:: 포맷: -loginserveraddr:IP:PORT
:: 3431 = 메인 게임 서버, 3432 = 백업 또는 채널 서버
start "" "GameClient.exe" -loginserveraddr:127.0.0.1:3431

echo.
echo ============================================
echo   GameClient.exe 시작됨
echo   서버: 127.0.0.1:3431
echo.
echo   CheatEngine 패치를 적용하세요!
echo   CT 파일 위치: C:\Reversecore_Workspace\cheatengine\GameClient_Extended.CT
echo ============================================
echo.
pause
