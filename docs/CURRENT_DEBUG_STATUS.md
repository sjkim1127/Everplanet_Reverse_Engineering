# EverPlanet 서버 에뮬레이터 - 현재 디버깅 상태

## 📅 최종 업데이트: 2025년 12월 4일 06:10

---

## 🎯 현재 상태 요약

**로비 → 월드 선택 → 재연결 → PqSyncTick/PrSyncTick 교환 성공!**
**하지만 그 이후 클라이언트가 다음 패킷(PqLogin)을 보내지 않고 프리즈**

---

## ✅ 작동하는 것

### 1. 첫 번째 연결 (로비)
```
Client connected (port 3431)
→ PcFirstMessage 전송 (IV 교환)
→ PqWorldList 수신 (평문)
→ PrWorldList 전송 (월드 목록 표시됨!)
→ PqWorldSelect 수신 (평문)
→ PrWorldSelect 전송 (127.0.0.1:3431)
→ Client disconnected
```

### 2. 재연결 (월드 진입)
```
Client connected (port 3431) - 재연결 감지
→ 세션 IV 복원 (예: 0x587983F2)
→ PcFirstMessage 전송 (같은 IV XOR 결과)
→ PqSyncTick 수신 (암호화됨, 복호화 성공!)
→ PrSyncTick 전송 (암호화됨)
→ ... 클라이언트 응답 없음 (프리즈)
```

---

## ❌ 문제점

### 증상
- `PrSyncTick` 전송 후 클라이언트가 응답하지 않음
- TCP 연결은 유지됨 (ESTABLISHED 상태)
- 게임 화면 프리즈
- 클라이언트가 `PqLogin`을 보내야 하는데 안 보냄

### 실험 결과

| 실험 | 결과 |
|------|------|
| PrSyncTick만 전송 | 클라이언트 응답 없음, 프리즈 |
| PrSyncTick + PrLogin 전송 | ECONNRESET (클라이언트가 연결 끊음) |
| PrSyncTick 후 서버가 연결 종료 | 세 번째 연결 없음, 프리즈 |

### 분석
- 클라이언트가 `PrSyncTick`을 **복호화하지 못했을 가능성**
- 또는 `PrSyncTick` 구조가 클라이언트 기대와 다름
- 재연결 시 IV 동기화 문제 가능성

---

## 🔧 해결된 이슈들

### 1. hashPacket 비트 시프트 버그 ✅
```javascript
// 수정 전 (버그)
hash ^= (decrypted << (i * 8));

// 수정 후 (droopl 방식)
hash ^= ((decrypted & 0xFF) << i);
```

### 2. PrSyncTick Long 타입 ✅
```javascript
buf.writeLong(Date.now());  // 8바이트
```

### 3. PrSyncDateTime 제거 ✅
droopl 원본처럼 `PrSyncTick`만 전송

---

## 📊 패킷 흐름 (droopl 원본)

```
PqSyncTick → PrSyncTick
PqLogin → PrLogin + PcKeyAuthRequest
PqAuthLogin → PrAuthLogin
PqChaList → PrChaList
...
```

**현재 문제**: `PqSyncTick` → `PrSyncTick` 후 클라이언트가 `PqLogin`을 안 보냄

---

## 🔍 다음 디버깅 단계

### x64dbg로 클라이언트 분석
1. `PrSyncTick` 수신 후 클라이언트 코드 추적
2. 복호화 로직 확인
3. 왜 다음 패킷을 안 보내는지 분석

### 확인할 포인트
- recv() 후 복호화 함수
- IV 계산 로직
- 패킷 파싱 로직

---

## 🔧 암호화 상수

```javascript
HASH_XOR      = 0xC9F84A90
LENGTH_XOR_TX = 0xF834A60C  // 서버→클라이언트
LENGTH_XOR_RX = 0xF834A608  // 클라이언트→서버
IV_INCREMENT  = 0x1473F19
```

---

## 📁 관련 파일

- **서버 코드**: `droopl/everplanet-server/server.js`
- **패킷 정의**: `droopl/everplanet-server/packets.js`
- **droopl 원본**: `droopl/src/main/scala/tool/Netty/TcpHandler.scala`
- **CheatEngine 패치**: `cheatengine/GameClient_Extended.CT`
- **x64dbg 스크립트**: `x64dbg/everplanet_patches.txt`

---

## 📝 서버 로그 예시 (성공 시점까지)

```
[00:51.776] Client connected: ::ffff:127.0.0.1:61987 (port 3431)
[00:51.776] [SESSION] Detected reconnection - restoring PREVIOUS session IV
[00:51.776] [SESSION] Restored: initIV=0x587983F2
[00:51.777] [SEND] PcFirstMessage (61 bytes, no encryption)
[00:51.874] [RECV] 16 bytes (encrypted)
[00:51.876] [PROC] PqSyncTick (0x764F67D9)
[00:51.876]   Tick: 7643226
[00:51.876] [SEND] PrSyncTick (20 bytes, encrypted)
← 여기서 멈춤! 클라이언트가 PqLogin을 안 보냄
```
