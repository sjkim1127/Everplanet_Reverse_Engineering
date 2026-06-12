# EverPlanet 서버 에뮬레이터 - 문제 상황 보고서

**작성일:** 2024년 12월 4일  
**버전:** v2.0  
**상태:** 🔴 진행 중단 (클라이언트 응답 대기)

---

## 1. 요약

클라이언트가 월드 선택 후 재연결하여 `PqSyncTick`을 보내고, 서버가 `PrSyncTick`으로 응답했으나, **클라이언트가 다음 패킷(`PqLogin`)을 보내지 않고 멈춤**.

---

## 2. 성공한 패킷 교환

| 순서 | 방향 | 패킷명 | 암호화 | 상태 |
|------|------|--------|--------|------|
| 1 | S→C | PcFirstMessage | ❌ 평문 | ✅ 성공 |
| 2 | C→S | PqWorldList | ❌ 평문 | ✅ 성공 |
| 3 | S→C | PrWorldList | ❌ 평문 | ✅ 성공 |
| 4 | C→S | PqWorldSelect | ❌ 평문 | ✅ 성공 |
| 5 | S→C | PrWorldSelect | ❌ 평문 | ✅ 성공 |
| 6 | - | **재연결** | - | ✅ 성공 |
| 7 | S→C | PcFirstMessage | ❌ 평문 | ✅ 성공 |
| 8 | C→S | PqSyncTick | ✅ 암호화 | ✅ 성공 |
| 9 | S→C | PrSyncTick | ✅ 암호화 | ✅ 성공 |
| 10 | C→S | PqLogin | ✅ 암호화 | ❌ **수신 없음** |

---

## 3. 서버 로그 (전체)

```
[LOG] Logging to: server_20251204_070600.log
╔════════════════════════════════════════════════════════════╗
║   EverPlanet KR Server Emulator v2.0                       ║
║   With Encryption Layer (Binary Analysis Applied)          ║
╠════════════════════════════════════════════════════════════╣
║   HASH_XOR      = 0xC9F84A90                               ║
║   LENGTH_XOR_TX = 0xF834A60C                               ║
║   LENGTH_XOR_RX = 0xF834A608                               ║
║   IV_INCREMENT  = 0x1473F19                                ║
╚════════════════════════════════════════════════════════════╝

[00:00.004] EverPlanet Server listening on port 3431
[00:00.005] EverPlanet Server listening on port 3432
Nexon Auth Server listening on port 47611

=== 첫 번째 연결 ===
[19:23.096] Client connected: ::ffff:127.0.0.1:60594 (port 3431)
[19:23.097] [IV] xorivFirst=0x2a9b09a4, xorivSecond=0x3e99251a
[19:23.097] [IV] initIV = 0x14022CBE
[19:23.098] [SEND] PcFirstMessage (61 bytes, no encryption)
[19:29.125] [RECV] 8 bytes - PqWorldList (0xFD1640F)
[19:29.127] [SEND] PrWorldList (42 bytes, encrypted=false)
[20:59.720] [RECV] 12 bytes - PqWorldSelect (0x3B97F44D)
[20:59.722] [SEND] PrWorldSelect (35 bytes, encrypted=false)
[20:59.737] Client disconnected (port 3431)
[20:59.737] [SESSION] Saved: initIV=0x14022CBE

=== 재연결 ===
[20:59.738] Client connected: ::ffff:127.0.0.1:56498 (port 3431)
[20:59.738] [SESSION] Detected reconnection - restoring PREVIOUS session IV
[20:59.739] [SESSION] Restored: initIV=0x14022CBE, sendIV=0x14022CBE, recvIV=0x14022CBE
[20:59.739] [SEND] PcFirstMessage (61 bytes, no encryption)
[20:59.838] [RECV] 16 bytes (encrypted)
[20:59.839] [PROC] PqSyncTick (0x764F67D9) - Tick: 12455010
[20:59.839] [SEND] PrSyncTick (20 bytes, IV=0x14022CBE, encrypted=true)
[20:59.840] Waiting for client's next packet (PqLogin expected)...

← 여기서 무한 대기 중
```

---

## 4. 문제 분석

### 4.1 클라이언트 상태 (미확인)
- [ ] 로그인 화면이 표시되는가?
- [ ] 로딩 중인가?
- [ ] 에러 메시지가 있는가?
- [ ] 화면이 멈췄는가?

### 4.2 가능한 원인

#### 원인 1: 로그인 UI 대기
클라이언트가 로그인 화면을 띄우고 **사용자 입력을 기다리는 중**일 수 있음.
- **확인 방법:** 클라이언트 화면에 ID/PW 입력란이 보이는지 확인
- **조치:** 로그인 정보 입력 시도

#### 원인 2: 추가 패킷 필요
서버가 `PrSyncTick` 외에 **추가 패킷을 먼저 보내야** 할 수 있음.
- **후보 패킷:** `PrSyncDateTime`, `PrGsxsData`
- **확인 방법:** droopl Scala 원본 로직 분석

#### 원인 3: 암호화/복호화 오류
`PrSyncTick` 패킷이 **클라이언트에서 복호화 실패**했을 수 있음.
- **확인 방법:** 패킷 구조 및 IV 검증

#### 원인 4: Nexon Auth 서버 필요
클라이언트가 **47611 포트의 인증 서버에 먼저 연결**해야 할 수 있음.
- **확인 방법:** 47611 포트 로그 확인

#### 원인 5: 패킷 구조 불일치
`PrSyncTick`의 **페이로드 구조가 클라이언트 기대와 다름**.
```
// 서버가 보낸 것:
PrSyncTick: opHash(4) + timestamp(8) = 12 bytes payload

// 클라이언트가 기대하는 것:
???
```

---

## 5. 패킷 구조 비교

### PqSyncTick (클라이언트 → 서버)
```
Raw (encrypted): ba 8a 36 ec af 4c fe 76 70 32 03 98 95 4c fa dd
Decrypted:       d9 67 4f 76 62 0c be 00
                 │  opHash  │ tick(4) │
```

### PrSyncTick (서버 → 클라이언트)
```
Payload:  da 25 69 49 03 74 53 e6 9a 01 00 00
          │  opHash  │   timestamp(8)    │

Encoded:  a2 8a 36 ec ac 0e d8 49 11 4a ee 7e e5 ba 01 30 22 94 fa dd
          │ len(enc) │         encrypted payload              │
```

### droopl 원본 PrSyncTick.scala
```scala
class PrSyncTick(tick: Int) extends OutPkt({
  writeLong(System.currentTimeMillis)  // 8바이트 timestamp
})
```

---

## 6. 세션 상태

| 항목 | 값 |
|------|-----|
| initIV | 0x14022CBE |
| sendIV | 0x14022CBE |
| recvIV | 0x14022CBE |
| sendPacketCount | 2 |
| recvPacketCount | 2 |
| isReconnect | true |

---

## 7. 다음 단계

### 즉시 확인 필요
1. **클라이언트 화면 상태** - 로그인 UI가 보이는지?
2. **47611 포트 로그** - Auth 서버에 요청이 오는지?

### 테스트 항목
| # | 테스트 | 설명 |
|---|--------|------|
| 1 | 추가 패킷 전송 | `PrSyncTick` 후 `PrSyncDateTime` 전송 |
| 2 | Auth 플로우 | 47611 포트 핸들링 강화 |
| 3 | 패킷 캡처 | Wireshark로 실제 트래픽 분석 |
| 4 | 로그인 입력 | 클라이언트에 ID/PW 입력 시도 |

### 코드 수정 후보
```javascript
// server.js - handleSyncTick()에 추가
handleSyncTick(buffer) {
    const tick = buffer.readInt();
    log(`  Tick: ${tick}`);
    this.send(new PrSyncTick(tick));
    this.send(new PrSyncDateTime());  // 추가 테스트
}
```

---

## 8. 관련 파일

| 파일 | 경로 |
|------|------|
| 서버 메인 | `droopl/everplanet-server/server.js` |
| 패킷 정의 | `droopl/everplanet-server/packets.js` |
| OpHash | `droopl/everplanet-server/ophash.js` |
| 원본 PrSyncTick | `droopl/src/main/scala/pktmodel/PrSyncTick.scala` |
| 원본 PrWorldSelect | `droopl/src/main/scala/pktmodel/PrWorldSelect.scala` |

---

## 9. 참고: 정상 플로우 (예상)

```
[Client]                    [Login Server:3431]           [Game Server:3432]
    │                              │                              │
    │─── TCP Connect ─────────────▶│                              │
    │◀── PcFirstMessage ───────────│                              │
    │─── PqWorldList ─────────────▶│                              │
    │◀── PrWorldList ──────────────│                              │
    │─── PqWorldSelect ───────────▶│                              │
    │◀── PrWorldSelect ────────────│                              │
    │                              │                              │
    │─── TCP Reconnect (재연결) ───▶│                              │
    │◀── PcFirstMessage ───────────│                              │
    │─── PqSyncTick ──────────────▶│                              │
    │◀── PrSyncTick ───────────────│                              │
    │─── PqLogin ─────────────────▶│  ← 여기서 멈춤               │
    │◀── PrLogin ──────────────────│                              │
    │                              │                              │
```

---

**보고서 끝**
