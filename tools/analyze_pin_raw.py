import struct

# PIN 파일 원시 분석
pin_path = 'EverPlanet/GameClient.pin'

with open(pin_path, 'rb') as f:
    data = f.read()

print(f'File: {pin_path}')
print(f'Size: {len(data)} bytes')
print()

# 첫 256 바이트 헥스 덤프
print('Hex dump (first 256 bytes):')
for i in range(0, min(256, len(data)), 16):
    hex_str = ' '.join(f'{b:02X}' for b in data[i:i+16])
    ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in data[i:i+16])
    print(f'{i:04X}: {hex_str:<48} {ascii_str}')

print()

# ASCII 문자열 확인
print('Printable strings:')
current = ''
for i, b in enumerate(data):
    if 32 <= b < 127:
        current += chr(b)
    else:
        if len(current) >= 4:
            print(f'  Offset 0x{i-len(current):04X}: "{current}"')
        current = ''

# "PIN" 시그니처 확인
print()
print('Checking for PIN signatures:')
if data[:4] == b'PIN1':
    print('  Found PIN1 signature!')
elif data[:3] == b'PIN':
    print('  Found PIN signature!')
    
# 첫 4바이트 해석
print()
print('First 4 bytes interpretations:')
print(f'  ASCII: {data[:4]}')
print(f'  Hex: {data[:4].hex()}')
if len(data) >= 4:
    print(f'  Little-endian int: 0x{struct.unpack("<I", data[:4])[0]:08X}')
    print(f'  Big-endian int: 0x{struct.unpack(">I", data[:4])[0]:08X}')
