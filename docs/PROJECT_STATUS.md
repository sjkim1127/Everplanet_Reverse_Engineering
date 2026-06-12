# EverPlanet KR v1842 프라이빗 서버 프로젝트 현황

## 📅 최종 업데이트: 2025년 12월 4일

---

## 🎯 프로젝트 목표

**EverPlanet KR v1842 클라이언트를 로컬 서버 에뮬레이터에 연결하여 오프라인/프라이빗 서버로 운영**

---

## ✅ 완료된 작업

### 1. Themida 언패킹 (100%)
- 원본: `GameClient.exe` (Themida 패킹)
- 언패킹됨: `EverPlanet_KR_v1842_U_DEVM.exe`
- 복호화 테이블 추출 완료

### 2. 인증 우회 (100%)
**방법: CheatEngine 스크립트 (Create Process + Suspended Mode)**

| 패치 | 주소 | 원본 | 패치 | 설명 |
|------|------|------|------|------|
| ServerChk pass | 0x7565AE | 75 XX | 90 90 | 서버 인증 점프 우회 |
| LaunchArg pass | 0x75629F | 0F 85 XX | 90 E9 XX | 실행 인자 검사 우회 |
| Terminate pass | 0x755481 | 75 XX | EB XX | 종료 로직 우회 |

**파일**: `cheatengine/GameClient_Extended.CT`

### 3. 서버 주소 오버라이드 (100%)
- **발견된 커맨드 라인 옵션**: `-loginserveraddr:IP:PORT`
- PIN 파일 복호화 없이 서버 주소 직접 지정 가능!

```batch
GameClient.exe -loginserveraddr:127.0.0.1:3431
```

### 4. 서버 에뮬레이터 (90%)
- **GitHub**: https://github.com/sjkim1127/everplanet-server
- **위치**: `droopl/everplanet-server/`
- **기반**: Node.js (droopl Scala 서버에서 포팅)
- **포트**: 3431 (메인), 3432 (백업), 47611 (부가)

#### 구현된 기능:
- ✅ 암호화 시스템 (IV-based XOR, hashPacket)
- ✅ 키 교환 (PcFirstMessage, PcKeyAuthRequest)
- ✅ 로그인 (PqLogin/PrLogin)
- ✅ 인증 (PrAuthLogin)
- ✅ 캐릭터 목록 (PqChaList/PrChaList)
- ✅ 월드 목록 (PrWorldList)
- ✅ 월드 선택 (PqWorldSelect/PrWorldSelect)
- ✅ 재연결 처리 (세션 IV 복원)
- ✅ PqSyncTick/PrSyncTick 암호화된 패킷 처리
- ⏳ 게임 입장 후 추가 패킷 처리

#### 암호화 상수:
```javascript
HASH_XOR = 0xC9F84A90
LENGTH_XOR_TX = 0xF834A60C  // 서버→클라이언트
LENGTH_XOR_RX = 0xF834A608  // 클라이언트→서버
IV_INCREMENT = 0x1473F19
```

### 5. 파일 포맷 분석 (70%)

#### CHI 파일 (게임 리소스)
- 시그니처: `"Ch layer spec 1.2"`
- 매직: `0x10002`
- XOR 테이블 기반 암호화

#### PIN1 파일 (서버 설정)
- 시그니처: `"PIN1"`
- 암호화된 XML 데이터
- `-loginserveraddr` 옵션으로 우회 가능!

---

## 🔄 현재 상태

### 진행 상황
1. ✅ CheatEngine 패치 후 로비 진입 성공
2. ✅ `-loginserveraddr:127.0.0.1:3431` 옵션으로 로컬 서버 연결
3. ✅ 월드 선택 화면 진입, 월드 목록 표시
4. ✅ 월드 선택 성공, 재연결 처리 완료
5. ✅ PqSyncTick 암호화된 패킷 복호화 성공
6. ✅ hashPacket 비트 시프트 버그 수정 (`i*8` → `i&31`)
7. ⏳ PrSyncTick 전송 후 클라이언트 프리즈 현상 디버깅 중

### 해결된 이슈
- ✅ IV 동기화 문제 (재연결 시 세션 상태 복원)
- ✅ hashPacket 계산 오류 (비트 시프트 로직 수정)
- ✅ PrSyncTick 타임스탬프 크기 (Int→Long, 8바이트)

### 진행 중인 이슈
- ⏳ 클라이언트가 PrSyncTick+PrSyncDateTime 수신 후 프리즈

---

## 📁 핵심 파일 위치

```
c:\Reversecore_Workspace\
├── docs\
│   ├── PROJECT_STATUS.md          # 이 문서
│   ├── PROGRESS_LOG.md            # 진행 로그
│   ├── PIN_CHI_File_Analysis.md   # 파일 포맷 분석
│   └── QUICK_START.md             # 빠른 시작
├── droopl\
│   └── everplanet-server\         # Node.js 서버
│       ├── server.js              # 메인 서버
│       ├── packets.js             # 패킷 정의
│       ├── encoder.js             # 암호화/복호화
│       ├── utils.js               # 유틸리티
│       ├── ophash.js              # OpCode 해시
│       └── packet.js              # 패킷 버퍼
├── EverPlanet\                    # 게임 클라이언트
│   └── EverPlanet_KR_v1842_U_DEVM.exe
└── cheatengine\
    └── GameClient_Extended.CT     # CheatEngine 스크립트
```

---

## 🚀 실행 방법

### 1. 서버 실행
```powershell
cd C:\Reversecore_Workspace\droopl\everplanet-server
node server.js
```

### 2. CheatEngine으로 클라이언트 실행
1. CheatEngine 열기
2. File → Open Process → Create Process
3. `EverPlanet_KR_v1842_U_DEVM.exe` 선택
4. Parameters: `-loginserveraddr:127.0.0.1:3431`
5. **☑ Create Suspended 체크**
6. Open 클릭 → 3개 패치 활성화 → Run 버튼 클릭

---

## 📝 참고 자료
- droopl Scala 원본: `droopl/src/main/scala/`
- DC Inside 게임개발 갤러리 분석글
