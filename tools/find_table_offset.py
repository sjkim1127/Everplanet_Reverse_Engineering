import struct

# GameClient.exe에서 복호화 테이블 추출
with open('EverPlanet/GameClient.exe', 'rb') as f:
    # PE 헤더 파싱
    f.seek(0x3C)
    pe_offset = struct.unpack('<I', f.read(4))[0]
    f.seek(pe_offset + 6)
    num_sections = struct.unpack('<H', f.read(2))[0]
    f.seek(pe_offset + 0x14)
    opt_header_size = struct.unpack('<H', f.read(2))[0]
    
    sections_offset = pe_offset + 0x18 + opt_header_size
    
    print(f'PE Offset: 0x{pe_offset:X}')
    print(f'Number of sections: {num_sections}')
    print(f'Sections start at: 0x{sections_offset:X}')
    
    # 섹션 찾기
    for i in range(num_sections):
        f.seek(sections_offset + i * 40)
        name = f.read(8).rstrip(b'\x00').decode('ascii', errors='ignore')
        vsize = struct.unpack('<I', f.read(4))[0]
        va = struct.unpack('<I', f.read(4))[0]
        raw_size = struct.unpack('<I', f.read(4))[0]
        raw_ptr = struct.unpack('<I', f.read(4))[0]
        
        print(f'{name}: VA=0x{va:X}, RawPtr=0x{raw_ptr:X}, Size=0x{raw_size:X}')
        
        # 0xcfe958이 어떤 섹션에 있는지 확인
        # 이미지 베이스 0x400000 가정
        target_rva = 0xcfe958 - 0x400000
        if va <= target_rva < va + vsize:
            file_offset = raw_ptr + (target_rva - va)
            print(f'  -> Target 0xCFE958 is in this section!')
            print(f'  -> File offset: 0x{file_offset:X}')
