@echo off
REM EverPlanet Frida Spawn Script (게임 폴더에서 실행)
cd /d "C:\Reversecore_Workspace\EverPlanet"
frida -l "C:\Reversecore_Workspace\hook_force_login.js" -f "EverPlanet_KR_v1842_U_DEVM.exe"
pause
