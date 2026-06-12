#!/usr/bin/env python3
"""
EverPlanet KR - PIN/CHI 파일 언패커
Based on Ghidra analysis of FUN_00AFF0B0 and FUN_00AEC930

파일 구조:
- 시그니처: "Ch layer spec 1.2" (0x3E 바이트, 유니코드)
- 암호화된 메타데이터: 0x80 바이트 (헤더 0x42~0xC2)
- 엔트리 데이터: 0x20 바이트씩

복호화 알고리즘:
- 테이블 기반 XOR (4개 256-entry 테이블)
- 키가 매 블록마다 증가
"""

import struct
import sys
import os

# 복호화 테이블 (GameClient.exe에서 추출 필요)
# 주소: 0x00CFE958, 0x00CFED58, 0x00CFF158, 0x00CFF558
# 각각 256 * 4 = 1024 바이트

# 언팩된 EXE 기준 오프셋 (EverPlanet_KR_v1842_U_DEVM.exe)
TABLE1_OFFSET = 0x8FE958  # 0xCFE958 - 0x400000 + section_raw_ptr (.rdata)
TABLE2_OFFSET = 0x8FED58  # 0xCFED58
TABLE3_OFFSET = 0x8FF158  # 0xCFF158
TABLE4_OFFSET = 0x8FF558  # 0xCFF558

# 기본 EXE 경로 (언팩된 버전)
DEFAULT_EXE = "EverPlanet_KR_v1842_U_DEVM.exe"

class PinUnpacker:
    def __init__(self, exe_path):
        """GameClient.exe에서 복호화 테이블 로드"""
        self.tables = [None, None, None, None]
        
        with open(exe_path, 'rb') as f:
            offsets = [TABLE1_OFFSET, TABLE2_OFFSET, TABLE3_OFFSET, TABLE4_OFFSET]
            for i, offset in enumerate(offsets):
                f.seek(offset)
                data = f.read(256 * 4)
                self.tables[i] = struct.unpack('<256I', data)
        
        print(f"[+] Loaded decryption tables from {exe_path}")
        print(f"    TABLE1[0] = 0x{self.tables[0][0]:08X}")
        print(f"    TABLE2[0] = 0x{self.tables[1][0]:08X}")
        print(f"    TABLE3[0] = 0x{self.tables[2][0]:08X}")
        print(f"    TABLE4[0] = 0x{self.tables[3][0]:08X}")

    def decrypt_block(self, input_data, key, size):
        """
        FUN_00AEC930 구현
        테이블 기반 XOR 복호화
        """
        output = bytearray(size)
        accumulator = 0
        
        # 4바이트 블록 단위 처리
        num_blocks = (size + 3) // 4
        
        for i in range(num_blocks):
            offset = i * 4
            if offset + 4 <= size:
                input_val = struct.unpack_from('<I', input_data, offset)[0]
            else:
                # 마지막 부분 블록
                remaining = size - offset
                input_val = 0
                for j in range(remaining):
                    input_val |= input_data[offset + j] << (j * 8)
            
            byte0 = key & 0xFF
            byte1 = (key >> 8) & 0xFF
            byte2 = (key >> 16) & 0xFF
            byte3 = (key >> 24) & 0xFF
            
            decrypted = (self.tables[0][byte0] ^ 
                        self.tables[1][byte1] ^ 
                        self.tables[2][byte2] ^ 
                        self.tables[3][byte3] ^
                        input_val ^ accumulator) & 0xFFFFFFFF
            
            # 출력에 기록
            if offset + 4 <= size:
                struct.pack_into('<I', output, offset, decrypted)
            else:
                remaining = size - offset
                for j in range(remaining):
                    output[offset + j] = (decrypted >> (j * 8)) & 0xFF
            
            accumulator = (accumulator + decrypted) & 0xFFFFFFFF
            key = (key + 1) & 0xFFFFFFFF
        
        return bytes(output)

    def unpack_pin(self, pin_path, file_key=0):
        """
        PIN 파일 언팩
        
        Args:
            pin_path: PIN 파일 경로
            file_key: 복호화 키 (aaa.pk에서 추출하거나 0으로 시도)
        """
        print(f"\n[*] Unpacking: {pin_path}")
        
        with open(pin_path, 'rb') as f:
            # 헤더 읽기 (0x100 바이트)
            header = f.read(0x100)
            
            if len(header) < 0x100:
                print(f"[-] File too small: {len(header)} bytes")
                return None
            
            # 시그니처 확인
            signature = header[:0x3E].decode('utf-16-le', errors='ignore').rstrip('\x00')
            print(f"    Signature: '{signature}'")
            
            if signature != "Ch layer spec 1.2":
                print(f"[-] Invalid signature!")
                return None
            
            # 패딩 확인
            pad1 = struct.unpack_from('<H', header, 0x3E)[0]
            pad2 = struct.unpack_from('<H', header, 0x40)[0]
            print(f"    Padding: 0x{pad1:04X}, 0x{pad2:04X}")
            
            if pad1 != 0 or pad2 != 0:
                print(f"[-] Invalid padding!")
                return None
            
            # 암호화된 메타데이터 (0x80 바이트 = 32 int)
            encrypted_meta = header[0x42:0xC2]
            
            # 복호화 시도 (키가 0이면 그대로 복사)
            if file_key == 0:
                meta_ints = struct.unpack('<32I', encrypted_meta)
                print(f"    [No decryption - key is 0]")
            else:
                decrypted_meta = self.decrypt_block(encrypted_meta, file_key, 0x80)
                meta_ints = struct.unpack('<32I', decrypted_meta)
            
            print(f"\n    Metadata:")
            print(f"      [0] Version check: 0x{meta_ints[0]:08X}")
            print(f"      [1] Magic number:  0x{meta_ints[1]:08X} (expected: 0x10002)")
            print(f"      [2] Entry count:   {meta_ints[2]}")
            print(f"      [3] XOR key:       0x{meta_ints[3]:08X}")
            
            # 매직 넘버 확인
            if meta_ints[1] != 0x10002:
                print(f"\n[-] Magic number mismatch! Trying with decryption...")
                # 다양한 키로 시도
                for test_key in [0x358F10BA, 0x12345678, 1, 0xFFFFFFFF]:
                    decrypted_meta = self.decrypt_block(encrypted_meta, test_key, 0x80)
                    meta_ints = struct.unpack('<32I', decrypted_meta)
                    if meta_ints[1] == 0x10002:
                        print(f"[+] Found working key: 0x{test_key:08X}")
                        file_key = test_key
                        break
                else:
                    print(f"[-] Could not find valid key")
                    # 원시 데이터 출력
                    print(f"\n    Raw metadata (first 64 bytes):")
                    for i in range(0, 64, 16):
                        hex_str = ' '.join(f'{b:02X}' for b in encrypted_meta[i:i+16])
                        print(f"      {i:04X}: {hex_str}")
                    return None
            
            # 엔트리 데이터 읽기
            entry_count = meta_ints[2]
            entry_data_size = entry_count * 0x20
            entry_data = f.read(entry_data_size)
            
            print(f"\n    Reading {entry_count} entries ({entry_data_size} bytes)...")
            
            # 엔트리 복호화
            xor_key = meta_ints[3] ^ file_key
            
            entries = []
            for i in range(entry_count):
                offset = i * 0x20
                if xor_key == 0:
                    entry = entry_data[offset:offset+0x20]
                else:
                    entry = self.decrypt_block(entry_data[offset:offset+0x20], xor_key + i, 0x20)
                entries.append(entry)
                
                # 엔트리 내용 출력
                print(f"\n    Entry {i}:")
                hex_str = ' '.join(f'{b:02X}' for b in entry)
                print(f"      Hex: {hex_str}")
                
                # 문자열로 해석 시도
                try:
                    text = entry.decode('utf-16-le', errors='ignore').rstrip('\x00')
                    if text and any(c.isprintable() for c in text):
                        print(f"      UTF-16: {text}")
                except:
                    pass
                
                try:
                    text = entry.decode('utf-8', errors='ignore').rstrip('\x00')
                    if text and any(c.isprintable() for c in text):
                        print(f"      UTF-8: {text}")
                except:
                    pass
            
            return {
                'signature': signature,
                'meta': meta_ints,
                'entries': entries,
                'file_key': file_key
            }


def main():
    if len(sys.argv) < 2:
        print("Usage: python pin_unpacker.py <pin_file> [exe_path]")
        print("  pin_file: Path to .pin or .chi file")
        print("  exe_path: Path to GameClient.exe (default: EverPlanet/GameClient.exe)")
        sys.exit(1)
    
    pin_path = sys.argv[1]
    exe_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_EXE
    
    if not os.path.exists(pin_path):
        print(f"[-] File not found: {pin_path}")
        sys.exit(1)
    
    if not os.path.exists(exe_path):
        print(f"[-] GameClient.exe not found: {exe_path}")
        sys.exit(1)
    
    unpacker = PinUnpacker(exe_path)
    result = unpacker.unpack_pin(pin_path)
    
    if result:
        print(f"\n[+] Unpacking complete!")


if __name__ == "__main__":
    main()
