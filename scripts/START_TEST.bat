@echo off
chcp 65001 >nul
title EverPlanet Server + Client Launcher

echo ============================================
echo   EverPlanet 테스트 런처
echo   서버와 클라이언트를 함께 실행합니다
echo ============================================
echo.

:: 1. 서버 확인/시작
netstat -an | findstr ":3431" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [1/3] 서버 시작 중...
    start "EverPlanet Server" cmd /k "cd /d "%~dp0..\droopl\everplanet-server" && node server.js"
    echo      서버 시작 대기 (3초)...
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] 서버가 이미 실행 중입니다 (포트 3431)
)

:: 2. 서버 상태 확인
netstat -an | findstr ":3431" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [ERROR] 서버가 시작되지 않았습니다!
    echo         Node.js가 설치되어 있는지 확인하세요.
    pause
    exit /b 1
)

echo [2/3] 서버 준비 완료
echo       - 게임 서버: 127.0.0.1:3431, 3432
echo       - 인증 서버: 127.0.0.1:47611
echo.

:: 3. 클라이언트 시작
echo [3/3] GameClient.exe 시작 중...
cd /d "%~dp0..\EverPlanet"
start "" "GameClient.exe" -loginserveraddr:127.0.0.1:3431

echo.
echo ============================================
echo   클라이언트가 시작되었습니다
echo.
echo   *** 중요: CheatEngine 패치를 적용하세요! ***
echo.
echo   1. CheatEngine을 엽니다
echo   2. 파일 열기: %~dp0..\cheatengine\GameClient_Extended.CT
echo   3. GameClient.exe 프로세스에 연결
echo   4. 다음 패치들을 활성화:
echo      [v] [CORE] ServerChk pass
echo      [v] [CORE] LaunchArg pass
echo      [v] [CORE] Terminate (Serverchk)
echo.
echo   5. 서버 콘솔에서 연결 로그를 확인하세요:
echo      "Client connected: 127.0.0.1:xxxxx"
echo.
echo   패치 적용 후 로비 화면에서 월드 목록이
echo   표시되어야 합니다.
echo ============================================
echo.
echo 아무 키나 누르면 종료합니다...
pause >nul
