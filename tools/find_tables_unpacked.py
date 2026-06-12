import struct
import os

# 언팩된 EXE에서 테이블 찾기
exe_path = 'EverPlanet_KR_v1842_U_DEVM.exe'

with open(exe_path, 'rb') as f:
    # 파일 크기 확인
    f.seek(0, 2)
    size = f.tell()
    print(f'File: {exe_path}')
    print(f'Size: {size} bytes (0x{size:X})')
    
    # PE 헤더 파싱
    f.seek(0x3C)
    pe_offset = struct.unpack('<I', f.read(4))[0]
    f.seek(pe_offset + 6)
    num_sections = struct.unpack('<H', f.read(2))[0]
    f.seek(pe_offset + 0x14)
    opt_header_size = struct.unpack('<H', f.read(2))[0]
    
    # 이미지 베이스
    f.seek(pe_offset + 0x34)
    image_base = struct.unpack('<I', f.read(4))[0]
    
    sections_offset = pe_offset + 0x18 + opt_header_size
    
    print(f'\nPE Offset: 0x{pe_offset:X}')
    print(f'Image Base: 0x{image_base:X}')
    print(f'Number of sections: {num_sections}')
    print(f'\nSections:')
    
    sections = []
    for i in range(num_sections):
        f.seek(sections_offset + i * 40)
        name = f.read(8).rstrip(b'\x00').decode('ascii', errors='ignore')
        vsize = struct.unpack('<I', f.read(4))[0]
        va = struct.unpack('<I', f.read(4))[0]
        raw_size = struct.unpack('<I', f.read(4))[0]
        raw_ptr = struct.unpack('<I', f.read(4))[0]
        
        sections.append({
            'name': name,
            'va': va,
            'vsize': vsize,
            'raw_ptr': raw_ptr,
            'raw_size': raw_size
        })
        
        print(f'  {name:8s}: VA=0x{va:08X}, VSize=0x{vsize:X}, RawPtr=0x{raw_ptr:08X}, RawSize=0x{raw_size:X}')
    
    # 타겟 주소들 (Ghidra 분석 기준)
    targets = {
        'TABLE1': 0x00CFE958,
        'TABLE2': 0x00CFED58,
        'TABLE3': 0x00CFF158,
        'TABLE4': 0x00CFF558,
    }
    
    print(f'\n타겟 테이블 위치 (Image Base = 0x{image_base:X}):')
    
    for name, va in targets.items():
        rva = va - image_base
        print(f'\n  {name}: VA=0x{va:08X}, RVA=0x{rva:08X}')
        
        # 어떤 섹션에 있는지 찾기
        for sec in sections:
            if sec['va'] <= rva < sec['va'] + sec['vsize']:
                file_offset = sec['raw_ptr'] + (rva - sec['va'])
                print(f'    -> Section: {sec["name"]}')
                print(f'    -> File offset: 0x{file_offset:08X}')
                
                # 실제 데이터 읽기
                if file_offset < size:
                    f.seek(file_offset)
                    data = f.read(32)
                    if len(data) == 32:
                        ints = struct.unpack('<8I', data)
                        print(f'    -> First 8 DWORDs: {" ".join(f"0x{x:08X}" for x in ints)}')
                    else:
                        print(f'    -> Could only read {len(data)} bytes')
                else:
                    print(f'    -> Offset beyond file size!')
                break
        else:
            print(f'    -> Not found in any section!')
