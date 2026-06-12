# EverPlanet 서버 에뮬레이터 진행 현황

**최종 업데이트:** 2024년 12월 4일

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 클라이언트 | `EverPlanet_KR_v1842_U_DEVM.exe` |
| 서버 | Node.js 기반 에뮬레이터 |
| 서버 포트 | 3431 (Login), 3432 (Game), 47611 (Auth) |
| 로컬 테스트 주소 | `127.0.0.1:3431` |

---

## ✅ 완료된 작업

### 1. 서버 에뮬레이터 구축
- [x] Node.js 서버 구현 (`everplanet-server/server.js`)
- [x] 패킷 파서 구현 (`packet.js`, `packets.js`)
- [x] OpCode 해싱 시스템 구현 (`ophash.js`)
- [x] 암호화 레이어 구현
- [x] 서버 포트 리스닝 확인 (3431, 3432, 47611)

### 2. 클라이언트 분석
- [x] 정적 분석 완료 (IDA/Ghidra)
- [x] 패킷 구조 분석
- [x] 메모리 패치 주소 식별 (9개)
- [x] 네트워크 함수 위치 확인 (ws2_32.dll)

### 3. 메모리 패치 준비
| 주소 | 패치 | 목적 |
|------|------|------|
| 0x7565AE | `EB` | 체크 우회 |
| 0x756682 | `EB` | 체크 우회 |
| 0x75629F | `EB` | 체크 우회 |
| 0x755481 | `EB 3D` | 점프 우회 |
| 0x7551F0 | `B8 01000000 C3` | 함수 우회 |
| 0x755280 | `B8 01000000 C3` | 함수 우회 |
| 0x7549D0 | `B8 01000000 C3` | 함수 우회 |
| 0x75057B | `EB` | 체크 우회 |
| 0x6514A6 | `90 90` | NOP 패치 |

### 4. CheatEngine 테이블
- [x] `GameClient_Extended.CT` 생성
- [x] 모든 패치 스크립트 포함
- [x] 커맨드라인 설정: `-loginserveraddr:127.0.0.1:3431`

---

## 🔄 현재 진행 중

### CheatEngine 테스트 (진행 중)
- [ ] CheatEngine으로 클라이언트 실행
- [ ] 패치 적용 확인
- [ ] 서버 연결 테스트
- [ ] 패킷 송수신 확인

---

## ❌ 미해결 이슈

### 1. x64dbg Anti-Debug 크래시
```
ExceptionCode: C0000005 (EXCEPTION_ACCESS_VIOLATION)
ExceptionAddress: 00BE66C7
ExceptionInfo: 0000001C (NULL 포인터 접근)
```

**원인 분석:**
- 클라이언트가 완전히 언패킹되지 않음
- TLS 콜백에서 Anti-Debug 실행
- ScyllaHide로 완전 우회 불가

**상태:** x64dbg 직접 실행 불가 → CheatEngine 사용

### 2. 클라이언트 언패킹 상태
| 항목 | 상태 |
|------|------|
| 기본 언패킹 | ✅ 부분 완료 |
| Anti-Debug | ❌ 활성화 |
| 코드 가상화 | ⚠️ 일부 존재 가능 |
| Import 복원 | ⚠️ 불완전 |

---

## 🛠️ 도구 및 환경

### 분석 도구
- **IDA Pro** - 정적 분석
- **Ghidra** - 디컴파일
- **x64dbg** - 동적 분석 (Anti-Debug로 제한적)
- **CheatEngine** - 메모리 패치 및 실행

### 서버 환경
- **Node.js** - 서버 런타임
- **Python 3.11.9** - 스크립트 (pyenv)

### 디버거 플러그인 (x64dbg)
- ScyllaHide (Themida 프로필)
- xAnalyzer
- SwissArmyKnife
- x64dbgpy (Python)

---

## 📁 주요 파일 위치

```
C:\Reversecore_Workspace\
├── EverPlanet\
│   ├── EverPlanet_KR_v1842_U_DEVM.exe  # 게임 클라이언트
│   └── GameClient.pin                   # PIN 정보
├── everplanet-server\
│   ├── server.js                        # 메인 서버
│   ├── packet.js                        # 패킷 파서
│   ├── packets.js                       # 패킷 핸들러
│   └── ophash.js                        # OpCode 해싱
├── x64dbg\
│   └── quick_patch.py                   # x64dbg 패치 스크립트
└── docs\
    ├── Cheatenginesetting.md            # CE 설정
    └── EverPlanet_Progress_Report.md    # 이 문서
```

---

## 📊 다음 단계

### 우선순위 1: CheatEngine 테스트
1. CheatEngine으로 클라이언트 실행
2. 모든 패치 적용
3. 서버 연결 확인
4. 패킷 로그 분석

### 우선순위 2: 패킷 프로토콜 완성
1. 첫 연결 패킷 분석 (PqSyncTick 등)
2. 로그인 시퀀스 구현
3. 응답 패킷 구현

### 우선순위 3: Anti-Debug 우회 (선택)
1. 0x00BE66C7 크래시 지점 분석
2. 추가 패치 작성
3. x64dbg Attach 방식 테스트

---

## 📝 로그 기록

### 2024-12-04
- x64dbg quick_patch.py 스크립트 완성
- 9개 패치 적용 성공 (x64dbg)
- Anti-Debug 크래시 발생 (0x00BE66C7)
- CheatEngine 테스트로 전환

---

## 🔗 참고 문서
- `QUICK_START.md` - 빠른 시작 가이드
- `EverPlanet_Security_Analysis_Report.md` - 보안 분석
- `EverPlanet_Server_Emulator_Plan.md` - 서버 계획
- `EVERPLANET_SERVER_EMULATOR_HANDOVER.md` - 인수인계 문서
