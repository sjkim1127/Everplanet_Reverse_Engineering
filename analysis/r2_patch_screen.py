#!/usr/bin/env python3
"""
Radare2 analysis script: Find "Patch..." screen logic and port 3432/3431 connection code.
This script uses r2pipe to analyze EverPlanet.exe statically.
"""

import sys
import json

import os
os.environ["PATH"] = r"E:\Everplanet_Reverse_Engineering\vendor\radare2-6.1.6-w64\bin;" + os.environ.get("PATH", "")

try:
    import r2pipe
except ImportError:
    print("r2pipe not found. Install with: pip install r2pipe")
    sys.exit(1)

EXE_PATH = r"E:\Everplanet_Reverse_Engineering\EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe"

print("[*] Opening binary (may take a moment)...")
r2 = r2pipe.open(EXE_PATH, flags=["-2"])  # -2 = quiet stderr

print("[*] Loading analysis (aaa)...")
r2.cmd("aaa")

print("\n=== [1] Searching for 'Patch' string ===")
strings = r2.cmd("/ Patch")
print(strings)

print("\n=== [2] Searching for port number 3432 (0xD68 hex) ===")
# 3432 decimal = 0x0D68, in little-endian: 68 0D
port_search = r2.cmd("/ 3432")
print(port_search)

print("\n=== [3] Searching for port 3432 as bytes (little-endian word: 68 0D) ===")
byte_search = r2.cmd("/x 680D")
print(byte_search)

print("\n=== [4] Searching for 'patchserver' or 'patch_server' ===")
patch_server = r2.cmd("/i patchserver")
print(patch_server)

print("\n=== [5] Searching for 'update' string ===")
update_str = r2.cmd("/i update")
print(update_str[:3000])  # limit output

print("\n=== [6] Searching for '패치' or Korean patch-related ===")
kor_patch = r2.cmd("/i \xed\x8c\xa8\xec\xb9\x98")
print(kor_patch[:2000])

print("\n=== [7] Find all strings containing 'atch' (for Patch/patch) ===")
all_strings = r2.cmd("iz~atch")
print(all_strings[:3000])

print("\n=== [8] Searching for 'loginserver' in strings ===")
login_str = r2.cmd("iz~login")
print(login_str[:3000])

print("\n=== [9] Find all strings with 'server' ===")
server_str = r2.cmd("iz~server")
print(server_str[:3000])

print("\n=== [10] Search for 3431 decimal port as bytes (little-endian: 67 0D) ===")
port3431 = r2.cmd("/x 670D")
print(port3431)

print("\n[*] Done!")
r2.quit()
