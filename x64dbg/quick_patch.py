# EverPlanet Quick Patch Script
# One-liner to apply all patches immediately
# Usage: exec(open(r"C:\Reversecore_Workspace\x64dbg\quick_patch.py").read())

import x64dbg
import x64dbg.Memory as Memory
import x64dbg.Debug as Debug
import x64dbg.Misc as Misc

print("[*] Applying EverPlanet patches...")

# 패치할 주소와 헥스값 리스트
patches = [
    (0x7565AE, "E9D0000000"),        # ServerChk_Skip
    (0x756682, "E937020000"),        # ServerChk_Retry  
    (0x75629F, "EB"),                # LaunchArg_Skip
    (0x755481, "B801000000C21400"),  # Terminate_Hook
    (0x7551F0, "B801000000C3"),      # HackShield_1
    (0x755280, "B801000000C20400"),  # HackShield_2
    (0x7549D0, "31C0C3"),            # Mutex_Skip
    (0x75057B, "EB"),                # Window_Mode
    (0x6514A6, "33D290"),            # CRC_Check
]

# 1. 패치 실행 (Memory.Write 사용)
count = 0
for addr, hex_str in patches:
    # 헥스 문자열을 바이트로 변환
    data = bytes.fromhex(hex_str)
    
    # 메모리에 덮어쓰기
    if Memory.Write(addr, data):
        print(f"[+] Patched: 0x{addr:X}")
        count += 1
    else:
        print(f"[-] Failed: 0x{addr:X} (Check address or permission)")

print(f"[*] Total {count} patches applied.")

# 2. 브레이크포인트 설정 (함수 이름으로 주소 찾아서 걸기)
bp_list = ["ws2_32.recv", "ws2_32.send", "ws2_32.connect"]

print("[*] Setting breakpoints...")
for name in bp_list:
    addr = Misc.ResolveLabel(name)
    if addr != 0:
        Debug.SetBreakpoint(addr)
        print(f"[+] BP Set: {name} (0x{addr:X})")
    else:
        print(f"[-] Cannot find symbol: {name}")

print("[!] Ready! Press F9 to run.")
