# x64dbg 사용 가이드 - EverPlanet 디버깅

## 🚀 빠른 시작

### 1. x64dbg로 게임 실행

1. **x32dbg.exe** 실행 (32비트 클라이언트!)
2. **File → Open** → `EverPlanet_KR_v1842_U_DEVM.exe` 선택
3. **Command line arguments**: `-loginserveraddr:127.0.0.1:3431`
4. OK 클릭

### 2. Python 스크립트로 자동 설정 (권장!)

x64dbg 하단 **Python** 탭에서:

```python
# 한 줄로 모든 패치 + 브레이크포인트 설정
exec(open(r"C:\Reversecore_Workspace\x64dbg\quick_patch.py").read())
```

또는 전체 분석 도구:
```python
exec(open(r"C:\Reversecore_Workspace\x64dbg\everplanet_analyze.py").read())
help()       # 사용 가능한 명령어 보기
setup_all()  # 패치 + 브레이크포인트 한번에
```

### 2-1. 수동 패치 (대안)

하단 명령어 창에서 직접 입력:

```
// 필수 패치 3개
patch 007565AE, E9 D0 00 00 00
patch 00756682, E9 37 02 00 00
patch 0075629F, EB
patch 00755481, B8 01 00 00 00 C2 14 00

// HackShield 우회
patch 007551F0, B8 01 00 00 00 C3
patch 00755280, B8 01 00 00 00 C2 04 00
patch 007549D0, 31 C0 C3

// Mutex + Window Mode
patch 0075057B, EB
patch 006514A6, 33 D2 90
```

### 3. 네트워크 브레이크포인트

```
bp ws2_32.recv
bp ws2_32.send
bp ws2_32.connect
```

### 4. 실행

**F9** 누르거나 명령어 창에 `run`

---

## 🔬 SyncTick 핸들러 추적 (Python)

```python
# SyncTick 추적 도구 로드
exec(open(r"C:\Reversecore_Workspace\x64dbg\find_synctick.py").read())

# Workflow:
setup()       # recv 브레이크포인트 설정
# F9로 실행
recv_hit()    # recv 호출 시 파라미터 확인
# F8로 step over
recv_done()   # 받은 패킷이 PrSyncTick인지 확인
trace()       # 리턴 주소에 BP 설정
# F9로 계속
where()       # 현재 위치 분석
qtrace(100)   # 100 스텝 추적
```

---

## 🔍 PrSyncTick 수신 후 디버깅

### 목표
클라이언트가 `PrSyncTick`을 받고 왜 다음 패킷을 안 보내는지 확인

### 단계

1. **서버 먼저 실행**
   ```
   cd C:\Reversecore_Workspace\droopl\everplanet-server
   node server.js
   ```

2. **x64dbg에서 recv 브레이크포인트**
   ```
   bp ws2_32.recv
   ```

3. **게임 실행 (F9)**

4. **recv에서 멈추면**:
   - **F9** 계속 눌러서 로비 진입, 월드 선택
   - 재연결 후 `PrSyncTick` 수신 시점에서 정밀 분석

5. **recv 후 리턴 주소 확인**:
   - 스택에서 리턴 주소 확인
   - 그 주소에 브레이크포인트 설정
   - 복호화 로직 추적

---

## 📍 주요 주소

| 함수 | 주소 | 설명 |
|------|------|------|
| ServerChk | 0x7565AE | 서버 연결 확인 |
| LaunchArg | 0x75629F | 웹 런처 검증 |
| Terminate | 0x755481 | 종료 함수 |
| HackShield1 | 0x7551F0 | 안티치트 |
| HackShield2 | 0x755280 | 안티치트 |
| HackShield3 | 0x7549D0 | 안티치트 |
| Mutex | 0x75057B | 다중 실행 |
| WindowMode | 0x6514A6 | 창모드 |

---

## 🔧 유용한 x64dbg 명령어

| 명령어 | 단축키 | 설명 |
|--------|--------|------|
| `run` | F9 | 실행 |
| `sti` | F8 | Step Over |
| `sto` | F7 | Step Into |
| `rtr` | Ctrl+F9 | Run to Return |
| `bp <addr>` | F2 | 브레이크포인트 |
| `bc <addr>` | - | 브레이크포인트 삭제 |
| `bpd` | - | 모든 BP 비활성화 |
| `bpe` | - | 모든 BP 활성화 |
| `d <addr>` | - | 덤프 창으로 이동 |
| `g <addr>` | Ctrl+G | 주소로 이동 |

---

## 📁 파일 위치

- **x64dbg 스크립트**: `x64dbg/everplanet_patches.txt`
- **x64dbg 명령어**: `x64dbg/everplanet_commands.txt`
- **CheatEngine 원본**: `cheatengine/GameClient_Extended.CT`
