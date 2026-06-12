import struct

with open('EverPlanet/GameClient.exe', 'rb') as f:
    f.seek(0x8FE958)
    data = f.read(64)
    print('Data at 0x8FE958:')
    print(' '.join(f'{b:02X}' for b in data[:32]))
    print(' '.join(f'{b:02X}' for b in data[32:64]))
    
    # 파일 크기 확인
    f.seek(0, 2)
    size = f.tell()
    print(f'File size: {size} bytes (0x{size:X})')
    
    # 테이블 위치 재계산 - 덤프된 바이너리에서 직접 찾기
    # Themida 언팩 후 메모리 덤프라면 VA가 그대로일 수 있음
    f.seek(0)
    content = f.read()
    
    # 특정 패턴 검색 (테이블 시작 부분)
    print("\nSearching for potential table patterns...")
