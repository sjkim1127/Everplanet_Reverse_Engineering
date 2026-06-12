# EverPlanet KR 서버 에뮬레이터 - 빠른 시작 가이드

## 🚀 현재 상태 요약

- ✅ 클라이언트 바이패스 완료 (CheatEngine 패치)
- ✅ 서버 에뮬레이터 구현 (Node.js)
- ✅ 암호화/복호화 시스템 완료
- ✅ 로비 → 월드 선택 → 재연결 작동
- ⏳ 게임 입장 후 추가 패킷 처리 필요

## 📦 필요 조건

1. **Node.js** (v16 이상)
2. **CheatEngine** (Create Process 기능 필요)
3. **EverPlanet_KR_v1842_U_DEVM.exe** (Themida 언패킹된 클라이언트)

## 🎮 실행 방법

### Step 1: 서버 실행

```powershell
cd C:\Reversecore_Workspace\droopl\everplanet-server
node server.js
```

서버가 다음 포트에서 대기:
- `3431` - 메인 게임 서버
- `3432` - 백업 서버  
- `47611` - 인증 서버

### Step 2: CheatEngine으로 클라이언트 실행

1. **CheatEngine** 열기
2. **File → Open Process → Create Process** 클릭
3. 파일 선택: `C:\Reversecore_Workspace\EverPlanet\EverPlanet_KR_v1842_U_DEVM.exe`
4. **Parameters** 입력: `-loginserveraddr:127.0.0.1:3431`
5. **☑ Create Suspended** 체크 (중요!)
6. **Open** 클릭

### Step 3: 패치 적용 및 실행

1. CheatEngine 테이블에서 3개 패치 활성화:
   - `ServerChk pass` (0x7565AE)
   - `LaunchArg pass` (0x75629F)
   - `Terminate` (0x755481)
2. **Run** 버튼 클릭 (또는 Debug → Run)
3. 게임 클라이언트가 실행되며 로그인 화면 표시

### Step 4: 게임 진입

1. 로그인 화면에서 아무 ID/PW 입력 → 로그인 버튼
2. 월드 선택 화면 표시
3. 월드 선택 후 진행 (현재 여기서 프리즈 발생 중)

## 📁 프로젝트 구조

```
droopl/everplanet-server/
├── server.js      # 메인 서버 (세션 관리, 패킷 라우팅)
├── packets.js     # 패킷 정의 (PrLogin, PrWorldList 등)
├── encoder.js     # 암호화/복호화
├── utils.js       # hashPacket, 유틸리티
├── ophash.js      # OpCode 해시 생성
├── packet.js      # PacketBuffer 구현
└── logs/          # 서버 로그 (자동 생성)
```

## 🔧 암호화 상수

```javascript
HASH_XOR = 0xC9F84A90
LENGTH_XOR_TX = 0xF834A60C  // 서버→클라이언트
LENGTH_XOR_RX = 0xF834A608  // 클라이언트→서버
IV_INCREMENT = 0x1473F19
```

## 🐛 디버깅

### 서버 로그 확인
서버 콘솔에 모든 패킷 송수신 내역이 표시됩니다.

### 문제 발생 시
1. 서버 로그에서 `[ERROR]` 또는 `Hash mismatch` 확인
2. `logs/` 폴더의 로그 파일 확인
3. x64dbg로 클라이언트 브레이크포인트 설정

## 📚 상세 정보

- 프로젝트 현황: `docs/PROJECT_STATUS.md`
- 진행 로그: `docs/PROGRESS_LOG.md`
- 인수인계 문서: `docs/EVERPLANET_SERVER_EMULATOR_HANDOVER.md`

## 🔗 GitHub

https://github.com/sjkim1127/everplanet-server
