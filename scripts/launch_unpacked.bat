@echo off
chcp 65001 >nul
title EverPlanet - Unpacked Version

echo ============================================
echo   EverPlanet - Unpacked Version Launch
echo   (Themida 언패킹된 버전 사용)
echo ============================================
echo.

cd /d "%~dp0..\EverPlanet"

echo [1] 서버가 실행 중인지 확인하세요!
echo     서버 시작: cd droopl\everplanet-server ^& node server.js
echo.
echo [2] 언패킹된 실행파일을 사용합니다.
echo     파일: EverPlanet_KR_v1842_U_DEVM.exe
echo.
echo ============================================
pause

echo.
echo 언패킹된 게임 실행 중...
start "" "EverPlanet_KR_v1842_U_DEVM.exe" -loginserveraddr:127.0.0.1:3431

echo.
echo 게임이 시작되면 CheatEngine 패치를 적용하세요.
echo (언패킹된 버전은 패치 없이도 일부 동작할 수 있습니다)
echo.
pause
