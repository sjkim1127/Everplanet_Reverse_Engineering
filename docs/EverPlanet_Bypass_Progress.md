# EverPlanet KR Private Server - Launcher Bypass Progress Report

**Date**: 2025-12-03  
**Version**: v7.8  
**Status**: 🔄 In Progress - CheatEngine 패치 적용, 로비 진입 테스트 중

---

## 📋 프로젝트 개요

EverPlanet KR (v1842) 게임 클라이언트의 Nexon 인증을 우회하여 프라이빗 서버에 연결하는 프로젝트

### 목표
1. ✅ 패킷 암호화/복호화 분석 및 구현
2. ✅ 서버 에뮬레이터 기본 구현
3. ✅ 런처 인증 우회 (Quick Attach 방식으로 해결)
4. 🔄 로비 진입 (현재 작업 중)
5. ⏳ 캐릭터 선택 및 인게임 진입

---

## 🎯 주요 성과

### ✅ Quick Attach 방식 발견 (핵심 돌파구!)
- **문제**: Frida Spawn 모드 실패 (0x000002e4)
- **해결**: 게임 시작 후 500ms 이내에 Frida Attach
- **결과**: 모든 초기화 함수 패치 성공!

### ✅ 서버 연결 성공
```
[00:19.237] [connect] 211.39.129.202:3431 -> 127.0.0.1
[00:19.242] [recv] 61 bytes: PcFirstMessage ✅
```

### 🔄 진행 중: 로비 진입
- v7.5: patchnote.md 기반 패치 적용
- v7.6: CheatEngine 패치 추가 (serverChk, LaunchARG, Terminate)
- v7.7: CALL 명령어 5바이트 NOP 수정
- v7.8: CMP ESI,ESI 트릭으로 안전한 조건 우회

---

## 🔑 핵심 발견: CheatEngine 패치 정보

### 커뮤니티 정보 (eesdf)
- **Discord**: `eesdf` - 인게임 진입까지 성공한 사람
- **서버 없이 로비 진입 가능** - CheatEngine 스크립트만으로!
- **핵심 패치**: serverChk, LaunchARG, Terminate 우회

### 인게임 진입 패킷 순서 (커뮤니티 정보)
```
1. PuChaEnterServer  (캐릭터 서버 진입)
2. PrChaOut          
3. PdChaMove         (핵심!)
4. PdChaMoveZone     (존 이동)
```

---

## 🔐 암호화 프로토콜 (완료)

### XOR 기반 암호화
```
HASH_XOR       = 0xC9F84A90
LENGTH_XOR_TX  = 0xF834A60C  (클라이언트 → 서버)
LENGTH_XOR_RX  = 0xF834A608  (서버 → 클라이언트)
IV_INCREMENT   = 0x1473F19
```

### 패킷 구조
```
[4 bytes] Length (XOR encrypted)
[4 bytes] Hash (XOR encrypted) 
[4 bytes] IV
[N bytes] Payload (XOR encrypted with rolling IV)
```

---

## 🖥️ 서버 에뮬레이터 (완료)

**파일**: `everplanet-server/server.js`

### 구현된 기능
- ✅ TCP 서버 (포트 3431, 3432)
- ✅ Nexon Auth 서버 (포트 47611)
- ✅ PcFirstMessage 핸드셰이크
- ✅ PqSyncTick 응답
- ✅ XOR 암호화/복호화

### 서버 상태
```
Port 3431: Game Server (Active)
Port 3432: Game Server (Active)  
Port 47611: Nexon Auth (Active)
```

---

## 🔍 분석된 함수들

### PIN 파일 검증
| 함수 | 주소 | 역할 | 상태 |
|------|------|------|------|
| `FUN_0064F290` | 0x0064F290 | GameClient.pin 파일 검증 | ✅ 패치됨 |

**분석 결과**:
- "PIN1" 헤더 확인
- 실패 시: MessageBox "Cannot open a pin-file" 표시 후 return 0
- 성공 시: return 1

### NMCO 인증 함수들
| 함수 | 주소 | 역할 | 상태 |
|------|------|------|------|
| `FUN_00674e50` | 0x00674E50 | NMCO 초기화, 파일 작업 | ✅ 패치됨 |
| `FUN_00675fe0` | 0x00675FE0 | NMCO RegisterCallbackMessage | ✅ 패치됨 |
| `FUN_00676080` | 0x00676080 | Passport Login 체크 | ✅ **패치됨 (v7.3 추가)** |
| `FUN_00672220` | 0x00672220 | NMCO_CallNMFunc 래퍼 | ✅ Interceptor |
| `FUN_00673100` | 0x00673100 | NMCO Auth 체크 (success = 0) | ✅ Interceptor |
| `FUN_00673240` | 0x00673240 | GetNexonPassport | ✅ Interceptor |
| `FUN_006734e0` | 0x006734E0 | LoginVirtual (NMCO 래퍼 호출) | 분석됨 |
| `FUN_00676840` | 0x00676840 | LoginVirtual 상위 함수 | 분석됨 |

### 로그인 UI 함수들
| 함수 | 주소 | 역할 | 상태 |
|------|------|------|------|
| `FUN_00750300` | 0x00750300 | 메인 초기화 함수 | 분석됨 |
| `FUN_00755280` | 0x00755280 | 로그인 래퍼 (FUN_007554e0 호출) | ✅ 패치됨 |
| `FUN_007554e0` | 0x007554e0 | 로그인 UI (MessageBox 표시) | ✅ 패치됨 |

### JNZ 패치 위치
| 주소 | 원본 | 패치 | 상태 |
|------|------|------|------|
| 0x006760C0 | `75 10` (JNZ) | `90 90` (NOP) | ✅ 패치됨 |
| 0x006761C0 | `75 10` (JNZ) | `90 90` (NOP) | ✅ 패치됨 |
| 0x006762D0 | `75 10` (JNZ) | `90 90` (NOP) | ✅ 패치됨 |

---

## 🚧 현재 문제점

### 핵심 문제: 클라이언트가 PqLogin을 보내지 않음

**증상**:
- 클라이언트가 게임 서버(3431/3432)에 연결
- PcFirstMessage 수신, PqSyncTick 송신, PrSyncTick 수신
- 이후 연결 종료 (ECONNRESET)
- 화면에 "Login..." 텍스트만 표시

**원인 분석**:
- 넥슨 웹 로그인 → 런처 실행 → 게임 실행 워크플로우
- 클라이언트가 **넥슨 인증 없이는 PqLogin을 전송하지 않음**
- `-passport:` 또는 `-login` 커맨드라인 인자가 필요할 수 있음

**FUN_007554e0 분석 결과**:
```c
// 커맨드라인에서 -passport: 확인
if (*pwVar11 == L'-') {
    pwVar16 = L"-passport:";
    // 매칭되면 passport로 로그인 시도
}

// 또는 -login 확인
pwVar16 = L"-login";

// FUN_00676080이 성공(0이 아님)하면
if (cVar6 != '\0') {
    param_2[0] = L'\x02';  // 성공 플래그
    FUN_006763a0();        // GetPassport2 호출
}
```

### 시도한 해결책
1. ❌ 서버에서 PrLogin 먼저 전송 → 클라이언트가 연결 종료
2. ✅ FUN_00676080 패치 (return 1) → 적용됨
3. 🔄 클라이언트 내부 상태 조작 필요

---

## 📁 프로젝트 파일 구조 (정리 완료)

```
Reversecore_Workspace/
├── 🚀 START.bat              # 원클릭 런처 (진입점)
├── 📜 START_SERVER.ps1       # PowerShell 런처 스크립트
├── 📜 hook_force_login.js    # Frida 스크립트 (v7.3)
├── 📜 quick_attach.ps1       # Quick Attach 스크립트
├── 🎮 EverPlanet_KR_v1842_U_DEVM.exe  # 게임 실행파일
├── 📦 nmcogame.dll           # Nexon 인증 DLL
│
├── 📂 docs/                  # 문서
│   ├── EverPlanet_Bypass_Progress.md (현재 파일)
│   ├── EverPlanet_Security_Analysis_Report.md
│   ├── EVERPLANET_SERVER_EMULATOR_HANDOVER.md
│   ├── EverPlanet_Server_Emulator_Plan.md
│   └── QUICK_START.md
│
├── 📂 EverPlanet/            # 게임 클라이언트 폴더
│   ├── GameClient.pin
│   ├── wt.game_seed_info
│   └── Data/
│
└── 📂 droopl/everplanet-server/  # 서버 에뮬레이터
    ├── server.js             # 메인 서버 (타임스탬프 로깅 추가)
    ├── packet.js
    ├── packets.js
    ├── encoder.js
    └── ophash.js
```

**삭제된 파일들** (더 이상 필요 없음):
- `attach_frida.ps1`, `frida_spawn.py`, `patch_binary.py`
- `spawn_frida.bat`, `START_SERVER.bat`
- `*.x64dbg.txt` 스크립트들

---

## 🛠️ 패치 목록 (v7.8 기준)

### patchnote.md 패치 (EverPlanet KR v1842)
| 주소 | 원본 | 패치 | 설명 | 상태 |
|------|------|------|------|------|
| 0x007551F0 | 함수 프롤로그 | `B8 01 00 00 00 C3` | mov eax,1; ret | ✅ |
| 0x00755280 | 함수 프롤로그 | `B8 01 00 00 00 C2 04 00` | mov eax,1; ret 4 (__stdcall) | ✅ |
| 0x007549D0 | 함수 프롤로그 | `31 C0 C3` | xor eax,eax; ret | ✅ |
| 0x0075057B | `75` (JNZ) | `EB` (JMP) | Mutex 우회 | ✅ |
| 0x006514A6 | `8A 51 10` | `33 D2 90` | Window Mode | ✅ |
| 0x00C2D120 | 함수 프롤로그 | `31 C0 C3` | xor eax,eax; ret | ✅ |
| 0x00BE66A0 | 함수 프롤로그 | `31 C0 C2 04 00` | xor eax,eax; ret 4 | ✅ |

### CheatEngine 패치 (serverChk 우회)
| 주소 | 원본 | 패치 | 설명 | 상태 |
|------|------|------|------|------|
| 0x007565AB | `39 70 1C` (CMP) | `39 F6 90` | CMP ESI,ESI; NOP (항상 참) | ✅ v7.8 |
| 0x0075629F | `74` (JZ) | `EB` (JMP) | LaunchARG 우회 | ✅ |
| 0x00756328 | `E8 xx xx xx xx` (CALL) | `90 90 90 90 90` | Terminate NOP | ✅ v7.7 |
| 0x00755481 | `E8 xx xx xx xx` (CALL) | `90 90 90 90 90` | serverCHK NOP | ✅ v7.7 |

### 기타 패치
| 주소 | 설명 | 상태 |
|------|------|------|
| 0x0064F290 | PIN 파일 검증 → return 1 | ✅ |
| 0x00674E50 | NMCO 초기화 → return 1 | ✅ |
| 0x00675FE0 | NMCO RegisterCallback → return 1 | ✅ |
| 0x00676080 | Passport Login → return 1 | ✅ |
| 0x007554E0 | Login UI → return 1 | ✅ |
| 0x006760C0 | JNZ → NOP NOP | ✅ |
| 0x006761C0 | JNZ → NOP NOP | ✅ |
| 0x006762D0 | JNZ → NOP NOP | ✅ |

---

## 📊 버전 히스토리

| 버전 | 날짜 | 변경 내용 | 결과 |
|------|------|----------|------|
| v7.3 | 12/03 | FUN_00676080 (PassportLogin) 패치 추가 | 서버 연결 |
| v7.4 | 12/03 | L.exe 바이너리 분석 패치 적용 | - |
| v7.5 | 12/03 | ret 4 수정, 0x006514A6 주소 수정 | "Login..." |
| v7.6 | 12/03 | CheatEngine 패치 추가 (serverChk) | "Connect..." |
| v7.7 | 12/03 | CALL 5바이트 NOP 수정 | 크래시 |
| v7.8 | 12/03 | CMP ESI,ESI 트릭으로 안전한 우회 | 테스트 중 |

---

## 🚀 원클릭 런처 사용법

```powershell
# 더블클릭으로 실행
START.bat
```

**자동 수행 작업**:
1. 기존 node/game 프로세스 종료
2. Node.js 서버 시작 (새 창)
3. 게임 클라이언트 시작
4. 500ms 대기 후 Frida 훅 연결

---

## 📝 다음 단계

1. **v7.8 테스트** - CMP 패치로 크래시 해결 확인
2. **로비 진입 확인** - "Connect..." 이후 진행 여부
3. **추가 패치 필요 시 분석** - Ghidra로 실패 지점 추적
4. **인게임 진입** - PdChaMove 패킷 구현

---

## 📊 진행률

| 단계 | 상태 | 진행률 |
|------|------|--------|
| 패킷 암호화 분석 | ✅ 완료 | 100% |
| 서버 에뮬레이터 | ✅ 완료 | 100% |
| PIN 검증 우회 | ✅ 완료 | 100% |
| NMCO 함수 분석 | ✅ 완료 | 100% |
| 런처 체크 우회 | ✅ 완료 (Quick Attach) | 100% |
| 네트워크 리다이렉트 | ✅ 완료 | 100% |
| 서버 연결 | ✅ 완료 | 100% |
| 로비 진입 | 🔄 진행 중 | 60% |
| 캐릭터 선택 | ⏳ 대기 | 0% |
| 인게임 진입 | ⏳ 대기 | 0% |

**전체 진행률**: ~80%

---

## 🔗 참고 자료

- **Discord**: `eesdf` - 인게임 진입 성공자
- **docs/patchnote.md** - EverPlanet JP/KR/TH 패치 주소
- **docs/Communitydata.md** - 커뮤니티 리버싱 정보

- Ghidra MCP로 분석한 함수들
- Frida 스크립트 로그
- droopl Scala 서버 참조 코드
- 패킷 캡처 데이터

---

## 📜 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-03 | v7.3 | FUN_00676080 패치 추가, 파일 정리, 원클릭 런처 |
| 2025-12-03 | v7.2 | Quick Attach 방식 발견, 서버 연결 성공 |
| 2025-12-03 | v7.1 | JNZ 패치, NMCO 함수 분석 |
| 2025-12-03 | v7.0 | PIN 검증 우회, 로그인 함수 패치 |

---

*Last Updated: 2025-12-03 (v7.3)*
