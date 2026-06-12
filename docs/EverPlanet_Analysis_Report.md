# EverPlanet KR v1842 프라이빗 서버 - 분석 보고서

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **게임** | EverPlanet KR v1842 |
| **목표** | Nexon 인증 우회 및 프라이빗 서버 연결 |
| **도구** | Frida 17.5.1, CheatEngine, Ghidra |
| **상태** | 진행 중 |

---

## 🔍 클라이언트 파일 분석

### 파일 비교

| 파일명 | 설명 | 비고 |
|--------|------|------|
| `GameClient.exe` | **Themida 패킹된 원본** | CheatEngine 성공 |
| `EverPlanet_KR_v1842_U_DEVM.exe` | 언패킹/가상화 제거 버전 | 주소 불일치 가능 |
| `EverPlanet_KR_v1842_L.exe` | 언패킹 버전 | - |

### 중요 발견
- CheatEngine은 **Themida 패킹된 원본**(`GameClient.exe`)에서 성공
- 언패킹된 버전은 **주소 오프셋이 다를 수 있음**
- 런타임 패치는 **원본 파일** 사용 권장

---

## 🔧 패치 목록 (CheatEngine 기반)

### CheatEngine GameClient.CT 분석

```
[ServerChk pass]
007565AE: jmp 00756682
00756682: jmp 007568BE

[LaunchArg pass]  
0075629F: db EB (JZ → JMP)
00756328: call Hook → return 1

[Terminate (Serverchk)]
00755481: call Hook → return 1, ret 0x14
```

### patchnote.md 패치 (KR v1842)

| 주소 | 패치 | 설명 |
|------|------|------|
| `0x007551F0` | `B8 01 00 00 00 C3` | HackShield 우회 (mov eax,1; ret) |
| `0x00755280` | `B8 01 00 00 00 C2 04 00` | HackShield 우회 (mov eax,1; ret 4) |
| `0x007549D0` | `31 C0 C3` | HackShield 우회 (xor eax,eax; ret) |
| `0x0075057B` | `EB` | Mutex 우회 (JNZ → JMP) |
| `0x006514A6` | `33 D2 90` | 창모드 (xor edx,edx; nop) |
| `0x00C2D120` | `31 C0 C3` | 에러 우회 (xor eax,eax; ret) |
| `0x00BE66A0` | `31 C0 C2 04 00` | 에러 우회 (xor eax,eax; ret 4) |

### 추가 패치 (인증 우회)

| 주소 | 패치 | 설명 |
|------|------|------|
| `0x0064F290` | `B8 01 00 00 00 C3` | PIN 검증 우회 |
| `0x00674E50` | `B8 01 00 00 00 C3` | NMCO Init |
| `0x00675FE0` | `B8 01 00 00 00 C3` | NMCO RegisterCallback |
| `0x00676080` | `B8 01 00 00 00 C3` | PassportLogin |

---

## 🌐 서버 에뮬레이터

### 설정

```javascript
HASH_XOR      = 0xC9F84A90
LENGTH_XOR_TX = 0xF834A60C
LENGTH_XOR_RX = 0xF834A608
IV_INCREMENT  = 0x1473F19
```

### 포트

| 포트 | 용도 |
|------|------|
| 3431 | 게임 서버 (백업) |
| 3432 | 게임 서버 (메인) |
| 47611 | Nexon Auth 서버 |

### 패킷 흐름

```
[서버] → PcFirstMessage (61 bytes) → [클라이언트]
        - sessionKey, xorivFirst, xorivSecond
        - 암호화 IV 초기화

[클라이언트] → PqSyncTick → [서버]  ← 현재 여기서 멈춤
```

---

## 📁 주요 파일

```
C:\Reversecore_Workspace\
├── EverPlanet/
│   ├── GameClient.exe          # 원본 (Themida 패킹)
│   ├── run_gameclient.bat      # 원클릭 실행
│   └── ...
├── cheatengine/
│   └── GameClient.CT           # CheatEngine 스크립트
├── droopl/everplanet-server/
│   └── server.js               # 서버 에뮬레이터
├── hook_minimal.js             # Frida 패치 스크립트 (v5)
└── docs/
    └── patchnote.md            # 패치 주소 문서
```

---

## 🚀 실행 방법

### 방법 1: 원클릭 실행
```batch
C:\Reversecore_Workspace\EverPlanet\run_gameclient.bat
```

### 방법 2: 수동 실행

1. **서버 시작**:
   ```powershell
   cd C:\Reversecore_Workspace\droopl\everplanet-server
   node server.js
   ```

2. **GameClient.exe 실행**:
   ```powershell
   cd C:\Reversecore_Workspace\EverPlanet
   .\GameClient.exe
   ```

3. **Frida Attach** (5초 후):
   - VSCode: `Ctrl+Shift+P` → "Frida: Quick Attach"
   - `GameClient.exe` 선택
   - `hook_minimal.js` 선택

---

## ✅ 진행 상황

| 단계 | 상태 | 설명 |
|------|------|------|
| 서버 연결 | ✅ 완료 | localhost:3432 리다이렉션 |
| PcFirstMessage 수신 | ✅ 완료 | 61 bytes 정상 수신 |
| 런처 체크 우회 | ✅ 완료 | LaunchARG bypass |
| 서버 체크 우회 | ✅ 완료 | ServerChk pass (JMP) |
| HackShield 우회 | ✅ 완료 | 패치 적용 |
| **PqSyncTick 전송** | ❌ 대기 | 클라이언트가 응답 안함 |
| 로비 진입 | ⏳ 대기 | - |

---

## 🔬 현재 문제

### 증상
- PcFirstMessage 수신 후 클라이언트가 응답하지 않음
- 언패킹된 버전(`DEVM`)에서는 프로세스 종료
- 원본(`GameClient.exe`)은 아직 테스트 필요

### 가설
1. **언패킹 버전 주소 불일치**: Themida 해제 과정에서 주소가 변경됨
2. **추가 체크 존재**: 패킷 처리 전 추가 검증 로직
3. **서버 응답 형식**: PcFirstMessage 구조가 정확하지 않음

### 다음 단계
1. ✨ **원본 GameClient.exe로 테스트** (최우선)
2. CheatEngine + 원본으로 로비 진입 확인
3. 성공 시 Frida 스크립트 동기화

---

## 📞 참고 정보

- **eesdf (Discord)**: CheatEngine으로 인게임 진입 성공
- **필요 패킷**: `PdChaMove` - 인게임 진입용 (eesdf 정보)
- **CT 파일**: `cheatengine/GameClient.CT`

---

## 📝 업데이트 로그

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-04 | v6 | 크래시 분석 및 수정 - 0x755481 CALL→XOR EAX,EAX (AL=0으로 safe branch) |
| 2025-12-03 | v5 | GameClient.exe 지원 추가 |
| 2025-12-03 | v4 | CheatEngine JMP 패치 적용 |
| 2025-12-03 | v3 | NMCO 패치 추가 |
| 2025-12-03 | v2 | patchnote.md 패치 적용 |
| 2025-12-03 | v1 | 초기 버전 |

---

## 🔬 크래시 분석 (2025-12-04)

### 크래시 정보
```
Address: 0x75549a
Type: access-violation
Memory: {"operation":"write","address":"0xfffffffa"}
EIP: 0x75549a
```

### 원인 분석
1. `0x755481`에서 `CALL 0x756b00` 호출
2. 반환 후 `AL != 0`이면 `0x75549a`의 `XADD.LOCK [ECX],EDX` 실행
3. `ECX`가 잘못된 주소를 가리켜 access-violation 발생

### 해결책
```asm
; Before (크래시)
00755481: CALL 0x756b00
00755486: OR EDX,0xffffffff
00755489: TEST AL,AL
0075548B: JZ 0x75536a  ; AL=0이면 safe path

; After (수정)
00755481: XOR EAX,EAX  ; AL = 0
00755483: NOP
00755484: NOP
00755485: NOP
; AL=0이므로 JZ에서 safe path(0x75536a)로 점프
```

---

*마지막 업데이트: 2025-12-04*
