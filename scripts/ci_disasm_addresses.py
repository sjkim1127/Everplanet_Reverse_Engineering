#!/usr/bin/env python3
"""Disassemble selected virtual addresses from the EverPlanet PE image for CI triage."""

from __future__ import annotations

import argparse
import pathlib

import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_32


def parse_int(value: str) -> int:
    return int(value, 0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("exe", type=pathlib.Path)
    parser.add_argument("addresses", nargs="+", type=parse_int)
    parser.add_argument("--before", type=int, default=48)
    parser.add_argument("--after", type=int, default=112)
    args = parser.parse_args()

    pe = pefile.PE(str(args.exe), fast_load=False)
    image_base = int(pe.OPTIONAL_HEADER.ImageBase)
    data = args.exe.read_bytes()
    md = Cs(CS_ARCH_X86, CS_MODE_32)
    md.detail = False

    print(f"PE={args.exe}")
    print(f"ImageBase=0x{image_base:08x}")
    print(f"EntryPoint=0x{image_base + int(pe.OPTIONAL_HEADER.AddressOfEntryPoint):08x}")
    print()

    for va in args.addresses:
        rva = va - image_base if va >= image_base else va
        try:
            file_off = pe.get_offset_from_rva(rva)
        except Exception as exc:
            print(f"=== VA 0x{va:08x} RVA 0x{rva:08x}: unmapped ({exc}) ===")
            continue

        section = None
        for candidate in pe.sections:
            start = int(candidate.VirtualAddress)
            size = max(int(candidate.Misc_VirtualSize), int(candidate.SizeOfRawData))
            if start <= rva < start + size:
                section = candidate
                break

        sec_name = section.Name.rstrip(b"\0").decode("ascii", "replace") if section else "<?>"
        start_rva = max(0, rva - args.before)
        try:
            start_off = pe.get_offset_from_rva(start_rva)
        except Exception:
            start_rva = rva
            start_off = file_off
        length = args.before + args.after
        blob = data[start_off : start_off + length]
        start_va = image_base + start_rva

        print(f"=== VA 0x{va:08x} RVA 0x{rva:08x} file+0x{file_off:x} section={sec_name} ===")
        for insn in md.disasm(blob, start_va):
            marker = ">>" if insn.address <= va < insn.address + insn.size else "  "
            raw = insn.bytes.hex(" ")
            print(f"{marker} 0x{insn.address:08x}  {raw:<28} {insn.mnemonic:<8} {insn.op_str}")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
