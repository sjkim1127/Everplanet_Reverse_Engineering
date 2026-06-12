# EverPlanet GameClient - Suspended Launch Script
# 게임을 일시정지 상태로 실행하여 CheatEngine 패치 적용 시간 확보

param(
    [string]$GamePath = (Join-Path (Split-Path $PSScriptRoot -Parent) "EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe"),
    [string]$Arguments = "-loginserveraddr:127.0.0.1:3431"
)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class ProcessHelper {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint ResumeThread(IntPtr hThread);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    public const uint CREATE_SUSPENDED = 0x00000004;

    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }
}
"@

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  EverPlanet Suspended Launch Tool" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if game exists
if (-not (Test-Path $GamePath)) {
    Write-Host "[ERROR] Game not found: $GamePath" -ForegroundColor Red
    exit 1
}

$workDir = Split-Path $GamePath -Parent
$cmdLine = "`"$GamePath`" $Arguments"

Write-Host "[1/4] Creating suspended process..." -ForegroundColor Yellow
Write-Host "      Path: $GamePath" -ForegroundColor Gray
Write-Host "      Args: $Arguments" -ForegroundColor Gray
Write-Host "      WorkDir: $workDir" -ForegroundColor Gray
Write-Host ""

$si = New-Object ProcessHelper+STARTUPINFO
$si.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($si)
$pi = New-Object ProcessHelper+PROCESS_INFORMATION

# CreateProcess requires application name OR command line, not both in certain cases
$result = [ProcessHelper]::CreateProcess(
    $GamePath,
    $Arguments,
    [IntPtr]::Zero,
    [IntPtr]::Zero,
    $false,
    [ProcessHelper]::CREATE_SUSPENDED,
    [IntPtr]::Zero,
    $workDir,
    [ref]$si,
    [ref]$pi
)

if (-not $result) {
    $errorCode = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Host "[ERROR] Failed to create process. Error code: $errorCode" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Process created (SUSPENDED)" -ForegroundColor Green
Write-Host "      PID: $($pi.dwProcessId)" -ForegroundColor Cyan
Write-Host ""

Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  NOW ATTACH CHEATENGINE!" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host "  1. Open CheatEngine" -ForegroundColor White
Write-Host "  2. Load: GameClient_Extended.CT" -ForegroundColor White
Write-Host "  3. Attach to PID: $($pi.dwProcessId)" -ForegroundColor Cyan
Write-Host "  4. Enable ALL 3 patches:" -ForegroundColor White
Write-Host "     - [CORE] 1. ServerChk pass" -ForegroundColor Gray
Write-Host "     - [CORE] 2. LaunchArg pass" -ForegroundColor Gray  
Write-Host "     - [CORE] 3. Terminate" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "[3/4] Press ENTER after applying CheatEngine patches..." -ForegroundColor Magenta
Read-Host

Write-Host "[4/4] Resuming process..." -ForegroundColor Yellow
$resumeResult = [ProcessHelper]::ResumeThread($pi.hThread)

if ($resumeResult -eq 0xFFFFFFFF) {
    Write-Host "[ERROR] Failed to resume thread" -ForegroundColor Red
} else {
    Write-Host "[SUCCESS] Process resumed! Game should start now." -ForegroundColor Green
}

# Cleanup handles
[ProcessHelper]::CloseHandle($pi.hThread) | Out-Null
[ProcessHelper]::CloseHandle($pi.hProcess) | Out-Null

Write-Host ""
Write-Host "Done! Watch the game window." -ForegroundColor Cyan
