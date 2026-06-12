@echo off
chcp 65001 >nul
title EverPlanet - Simple Launch

echo ============================================
echo   EverPlanet Simple Launch
echo ============================================
echo.

cd /d "%~dp0..\EverPlanet"

echo [1] 서버가 실행 중인지 확인하세요!
echo.
echo [2] CheatEngine을 먼저 열고 준비하세요:
echo     - GameClient_Extended.CT 로드
echo.
echo [3] 게임 실행 후 빠르게 CheatEngine에서:
echo     - GameClient.exe 프로세스 연결
echo     - 3개 패치 활성화
echo.
echo ============================================
echo.

pause

echo 게임 시작 중...
start "" "GameClient.exe" -loginserveraddr:127.0.0.1:3431

echo.
echo CheatEngine 패치를 빠르게 적용하세요!
pause
