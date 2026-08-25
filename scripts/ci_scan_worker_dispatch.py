#!/usr/bin/env python3
"""Scan EverPlanet .text for x86 references to connection-worker object fields.

The state-2 helper writes obj+0x1c, obj+0x20, signals a worker event, then waits
on obj+0x28.  This scanner finds instructions touching those offsets and emits
nearby disassembly so the worker-side command consumer can be identified.
"""
from __future__ import annotations

import pathlib
import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_32
from capstone.x86 import X86_OP_MEM

EXE = pathlib.Path("EverPlanet/EverPlanet_KR_v1842_U_DEVM.exe")
OFFSETS = {0x1C, 0x20, 0x24, 0x28, 0x3C}

pe = pefile.PE(str(EXE), fast_load=False)
base = int(pe.OPTIONAL_HEADER.ImageBase)
data = EXE.read_bytes()
text = next(s for s in pe.sections if s.Name.rstrip(b"\0") == b".text")
rva = int(text.VirtualAddress)
off = int(text.PointerToRawData)
size = int(text.SizeOfRawData)
blob = data[off:off + size]

md = Cs(CS_ARCH_X86, CS_MODE_32)
md.detail = True
insns = list(md.disasm(blob, base + rva))

hits: list[tuple[int, int]] = []
for i, insn in enumerate(insns):
    matched = set()
    for op in insn.operands:
        if op.type == X86_OP_MEM and op.mem.base != 0 and op.mem.disp in OFFSETS:
            matched.add(op.mem.disp)
    if matched:
        for disp in sorted(matched):
            hits.append((i, disp))

print(f"image_base=0x{base:08x} text=0x{base+rva:08x} hits={len(hits)}")
for n, (i, disp) in enumerate(hits, 1):
    insn = insns[i]
    print(f"\n=== hit {n}: field +0x{disp:x} at 0x{insn.address:08x}: {insn.mnemonic} {insn.op_str} ===")
    lo = max(0, i - 10)
    hi = min(len(insns), i + 15)
    for j in range(lo, hi):
        x = insns[j]
        mark = ">>" if j == i else "  "
        print(f"{mark} 0x{x.address:08x}  {x.mnemonic:<8} {x.op_str}")
