# EverPlanet KR v1842 - PIN/CHI 파일 분석 보고서

## 개요

이 문서는 EverPlanet KR 클라이언트의 `.pin` 및 `.chi` 파일 포맷 분석 결과를 기록합니다.

### 배경 정보 (커뮤니티 분석 참고)
- 카트라이더와 유사한 파일 구조 (같은 개발진)
- `aaa.pk`: 게임 파일 무결성 검사 및 관리 (XML 형태)
- `.pin`: 서버 IP 설정 및 일부 기능
- `.chi`: `.rho` 파일의 업그레이드 버전

## 파일 포맷 분석

### 1. 파일 시그니처
```
"Ch layer spec 1.2" (0x1F 바이트, 유니코드)
```

### 2. 헤더 구조 (0x100 바이트)
```
Offset  | Size | Description
--------|------|-------------
0x00    | 0x3E | 시그니처 "Ch layer spec 1.2" (wide string)
0x3E    | 0x02 | 패딩 (0x0000)
0x40    | 0x02 | 패딩 (0x0000)
0x42    | 0x80 | 암호화된 메타데이터 (32 x 4바이트 int)
```

### 3. 복호화된 메타데이터 구조 (local_c8, 32 int)
```
Index | Description
------|-------------
[0]   | 버전 체크 (FUN_00aec540(0x7c) 결과와 비교, 또는 0이면 스킵)
[1]   | 매직 넘버: 0x10002 (필수)
[2]   | 엔트리 개수 (각 엔트리 0x20 바이트)
[3]   | 초기 XOR 키 (param_3과 XOR하여 복호화에 사용)
[4+]  | 기타 메타데이터
```

### 4. 핵심 함수들

#### FUN_00AFF0B0 - 파일 읽기 함수
```c
// 핵심 로직
1. CreateFileW로 파일 열기
2. 0x100 바이트 헤더 읽기
3. 시그니처 "Ch layer spec 1.2" 확인
4. FUN_00aec930로 메타데이터 복호화 (param_3 = 파일 키)
5. local_c8[1] == 0x10002 확인
6. 엔트리 데이터 읽기 및 복호화
```

#### FUN_00AEC930 - XOR 복호화 함수
```c
void decrypt(uint *output, int input, uint size, uint key) {
    // 테이블 기반 XOR 복호화
    // 테이블 주소:
    //   DAT_00cfe958
    //   DAT_00cfed58
    //   DAT_00cff158
    //   DAT_00cff558
    
    for each 4-byte block:
        byte0 = key & 0xff
        byte1 = (key >> 8) & 0xff
        byte2 = (key >> 16) & 0xff
        byte3 = (key >> 24) & 0xff
        
        decrypted = TABLE1[byte0] ^ TABLE2[byte1] ^ 
                    TABLE3[byte2] ^ TABLE4[byte3] ^
                    input_block ^ accumulator
        
        accumulator += decrypted
        key += 1
}
```

### 5. CHI vs RHO 차이점 (커뮤니티 정보)
- RHO: `헤더키 ^ 파일키` 에서 파일키가 **고정**
- CHI: 파일마다 **파일키가 다름** (0x58CE20 함수에서 확인)
- 파일키: `0x358F10BA` (RHO와 동일할 수 있음)
- 체크키: `0x10002` (RHO와 다름)

### 6. 복호화 후 데이터
- PNG: 확장자가 `gnp`로 뒤집힘, IEND로 끝남 (헤더 정상)
- OGG: 확장자가 `ggo`로 뒤집힘, 헤더 문자열 유지

## GameClient.pin 분석 (PIN1 포맷)

### ⚠️ 중요 발견: PIN1 ≠ CHI

**GameClient.pin 파일은 CHI 포맷과 완전히 다릅니다!**

### PIN1 파일 구조
```
Offset  | Size | Description
--------|------|-------------
0x00    | 0x04 | 시그니처 "PIN1" (0x50494E31)
0x04    | 0x04 | 페이로드 크기 (little-endian)
0x08    | N    | 암호화된 XML 데이터
```

### GameClient.pin 헤더 덤프
```
00: 50 49 4E 31 F3 02 00 00 53 03 33 5E 39 43 ...
    P  I  N  1  [size=755] [encrypted XML data]
```

### PIN 파일 파싱 함수: FUN_0064F290

핵심 로직:
```c
// 1. PIN1 시그니처 검증
iVar7 = _strncmp(acStack_338, "PIN1", 4);
if (iVar7 != 0) break;

// 2. XML 데이터 복호화 및 파싱
puVar9 = (undefined4 *)FUN_00ae40a0();  // XML 파서

// 3. 서버 정보 추출
// - 로그인 서버 IP/포트
// - 월드 서버 목록
```

### 파일 목적
- 로그인 서버 IP 주소 목록
- 클라이언트 설정
- 월드 서버 정보

### 복호화 후 예상 구조 (XML)
```xml
<Config>
    <LoginServers>
        <Server ip="211.39.129.201" port="3431"/>
        <Server ip="211.39.129.202" port="3432"/>
    </LoginServers>
</Config>
```

---

## 🔑 서버 주소 오버라이드 방법

### 커맨드 라인 옵션 발견!

**FUN_0064F290**에서 발견된 중요한 코드:

```c
pwVar20 = L"-loginserveraddr:";
// ... 문자열 비교 ...
if (iVar7 == 0) {
    // 로그인 서버 주소 파싱
    iVar10 = FUN_00af13f0();  // IP:Port 파싱
    if (iVar10 == 0) {
        MessageBoxW(0, L"Illegal IpPort!", L"LoginServerAddr", 0x10);
    }
}
```

### 사용법
```batch
GameClient.exe -loginserveraddr:127.0.0.1:3431
```

**이 옵션은 PIN 파일의 서버 주소를 완전히 무시하고, 지정된 서버로 접속합니다!**

### run_local_server.bat 예시
```batch
@echo off
cd /d "C:\EverPlanet"
start "" "GameClient.exe" -loginserveraddr:127.0.0.1:3431
```

## 관련 주소

| 함수/데이터 | 주소 | 설명 |
|------------|------|------|
| **PIN 관련** | | |
| FUN_0064F290 | 0x0064F290 | **PIN1 파일 파싱 (핵심!)** |
| FUN_00AE40A0 | 0x00AE40A0 | XML 파서 |
| FUN_00AF13F0 | 0x00AF13F0 | IP:Port 파싱 |
| **CHI 관련** | | |
| FUN_00AFF0B0 | 0x00AFF0B0 | CHI 파일 읽기 |
| FUN_00AEC930 | 0x00AEC930 | XOR 복호화 |
| FUN_00AEC540 | 0x00AEC540 | 버전 체크 |
| FUN_0058CE20 | 0x0058CE20 | XML 속성 파싱 |
| **복호화 테이블** | | |
| TABLE1 | 0x00CFE958 | 복호화 테이블 1 |
| TABLE2 | 0x00CFED58 | 복호화 테이블 2 |
| TABLE3 | 0x00CFF158 | 복호화 테이블 3 |
| TABLE4 | 0x00CFF558 | 복호화 테이블 4 |

## 다음 단계

1. [x] PIN1 파일 포맷 분석
2. [x] `-loginserveraddr` 커맨드 라인 옵션 발견
3. [ ] PIN1 복호화 알고리즘 분석
4. [ ] PIN1 파일 언패커 구현
5. [ ] 서버 연결 테스트

## 참고자료

- 커뮤니티 분석 (2022.04.10)
- Ghidra 정적 분석
- droopl 프로젝트 (Scala 서버 에뮬레이터)
