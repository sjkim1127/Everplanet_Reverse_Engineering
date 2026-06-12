@echo off
chcp 65001 >nul
title EverPlanet - Debug Launcher

echo ============================================
echo   EverPlanet Debug Launcher
echo   (x64dbg/CheatEngine 연동용)
echo ============================================
echo.

cd /d "%~dp0..\EverPlanet"

echo [핵심] 이 방법을 사용하세요:
echo.
echo 1. CheatEngine을 "관리자 권한"으로 실행
echo.
echo 2. CheatEngine에서:
echo    File -^> Open Process -^> 맨 아래 "Create Process"
echo.
echo 3. 파일 선택:
echo    %~dp0..\EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe
echo.
echo 4. 실행 인자 입력:
echo    -loginserveraddr:127.0.0.1:3431
echo.
echo 5. "Create suspended" 체크박스 활성화!
echo.
echo 6. 프로세스가 생성되면:
echo    - GameClient_Extended.CT 로드
echo    - 3개 패치 활성화
echo    - Debug -^> Run (F9) 또는 Play 버튼
echo.
echo ============================================
echo.
echo CT 파일 위치:
echo %~dp0..\cheatengine\GameClient_Extended.CT
echo.
pause
