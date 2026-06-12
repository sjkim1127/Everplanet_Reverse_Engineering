#!/usr/bin/env python3
"""
Radare2 targeted analysis: 
- isPatchFirst at 0x00934850
- loginServer at 0x00934b70  
- Port 3431/3432 references
- b54b35, b54b51, b54bd0 - port 3431 code
"""

import os
os.environ["PATH"] = r"E:\Everplanet_Reverse_Engineering\vendor\radare2-6.1.6-w64\bin;" + os.environ.get("PATH", "")

import r2pipe

EXE_PATH = r"E:\Everplanet_Reverse_Engineering\EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe"

print("[*] Opening binary...")
r2 = r2pipe.open(EXE_PATH, flags=["-2"])

print("[*] Quick analysis (aa only for speed)...")
r2.cmd("e anal.depth=1")
r2.cmd("aa")

# ─── isPatchFirst 문자열 참조 ───────────────────────────
print("\n=== isPatchFirst (0x00934850) xrefs ===")
# The string is at VA 0x00d34850 (0x0090ece8 offset → .rdata VA = 0xd00000 + 0x934850 = 0xd34850)
# isPatchFirst is at 0x00934850 (file offset) → VA 0x00d34850
r2.cmd("s 0x00d34850")
xrefs = r2.cmd("axt")
print(f"isPatchFirst xrefs:\n{xrefs}")

print("\n=== patchType (0x00d3486c) xrefs ===")
r2.cmd("s 0x00d3486c")
xrefs2 = r2.cmd("axt")
print(f"patchType xrefs:\n{xrefs2}")

print("\n=== loginServer (0x00d34b70) xrefs ===")
r2.cmd("s 0x00d34b70")
xrefs3 = r2.cmd("axt")
print(f"loginServer xrefs:\n{xrefs3}")

print("\n=== -loginserveraddr: (0x00d34b9c) xrefs ===")
r2.cmd("s 0x00d34b9c")
xrefs4 = r2.cmd("axt")
print(f"-loginserveraddr: xrefs:\n{xrefs4}")

# ─── Port 3431 locations ───────────────────────────────
print("\n=== Code at 0x00b54b35 (port 3431 area) ===")
r2.cmd("s 0x00b54b35")
code1 = r2.cmd("pd 30")
print(code1)

print("\n=== Code at 0x00b54b51 (port 3431 area) ===")
r2.cmd("s 0x00b54b51")
code2 = r2.cmd("pd 30")
print(code2)

print("\n=== Code at 0x00b54bd0 (port 3431 area) ===")
r2.cmd("s 0x00b54bd0")
code3 = r2.cmd("pd 30")
print(code3)

print("\n=== Code at 0x00c541f5 (port 3431 area) ===")
r2.cmd("s 0x00c541f5")
code4 = r2.cmd("pd 30")
print(code4)

print("\n=== Code at 0x00c5f455 (port 3431 area) ===")
r2.cmd("s 0x00c5f455")
code5 = r2.cmd("pd 30")
print(code5)

# ─── Port 3432 location 0x006c449b ─────────────────────
print("\n=== Code at 0x006c449b (port 3432 area) ===")
r2.cmd("s 0x006c449b")
code6 = r2.cmd("pd 40")
print(code6)

print("\n=== Function containing 0x006c449b ===")
r2.cmd("s 0x006c449b")
fn_info = r2.cmd("afi")
print(fn_info)

print("\n[*] Done!")
r2.quit()
