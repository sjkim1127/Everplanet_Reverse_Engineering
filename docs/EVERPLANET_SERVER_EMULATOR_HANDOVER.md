# EverPlanet KR 서버 에뮬레이터 프로젝트 인수인계 문서

## 📋 프로젝트 개요

**목표**: 서비스 종료된 한국판 EverPlanet (Ver.0680) 클라이언트를 로컬 서버 에뮬레이터에 연결하여 다시 플레이 가능하게 만들기

**현재 상태**: 네트워크 연결 및 기본 패킷 구조 파악 완료, 프레이밍/암호화 레이어 포팅 필요

---

## 🎯 현재까지의 주요 발견 사항

### 1. 클라이언트 분석 결과

#### 실행 파일
- **EverPlanet_KR_v1842_U_DEVM.exe**: 부분 언패킹 버전 (주로 사용)
- **Themida 언패킹 버전**: 별도 보유 (동일한 동작 확인)

#### 네트워크 정보
- **실제 접속 시도 IP/Port** (Frida 후킹으로 확인):
  - `211.39.129.201:3431`, `211.39.129.201:3432`
  - `211.39.129.202:3431`, `211.39.129.202:3432`
- **프로토콜**: TCP 기반, 커스텀 패킷 프레이밍 사용

#### 주요 DLL 의존성
- `Ws2_32.dll`: 네트워크 통신 (send, recv, connect)
- `d3d9.dll`, `d3dx9_31.dll`: DirectX 그래픽
- `fmod_event.dll`, `fmodex.dll`: FMOD 오디오
- `HShield/`: AhnLab HackShield 안티치트 (서비스 종료로 비활성화)

#### 패킷 시스템
- **OpHash 기반**: 각 패킷은 정수 해시(예: `0x7191CA`)로 식별
- 패킷 이름 패턴:
  - `Pc*`: 클라이언트 → 서버
  - `Pr*`: 서버 → 클라이언트 (Response)
  - `Pq*`: 클라이언트 → 서버 (Query)

### 2. 참고 서버 구현 (droopl)

**위치**: `C:\Reversecore_Workspace\droopl\`

Scala 기반 EverPlanet 글로벌 서버 에뮬레이터로, 한국 버전과 프로토콜 구조가 유사함.

#### 핵심 파일 구조

```
droopl/
├── src/main/scala/
│   ├── main.scala                    # 서버 진입점 (포트 3411, 3431)
│   ├── tool/
│   │   ├── Config.scala              # 지역 설정 (JP/KR), 버전 정보
│   │   ├── Utils.scala               # hashPacket, cryptInt 등 암호화 유틸
│   │   └── Netty/
│   │       ├── TcpServer.scala       # TCP 서버 초기화 및 핸드셰이크
│   │       ├── TcpEncoder.scala      # 송신 패킷 프레이밍/암호화
│   │       ├── TcpDecoder.scala      # 수신 패킷 디코딩/검증
│   │       ├── TcpHandler.scala      # 패킷 라우팅 및 처리
│   │       └── OpHash.scala          # 패킷 해시 ↔ 이름 매핑
│   └── pktmodel/
│       ├── OutPkt.scala              # 패킷 베이스 클래스
│       ├── PcFirstMessage.scala      # 초기 핸드셰이크 패킷
│       ├── PrLogin.scala             # 로그인 응답
│       └── ...                       # 기타 패킷 모델들
```

#### 핵심 프로토콜 상수 (TcpDecoder.scala)

```scala
val HASH_XOR = 0xC9F84A90
val LENGTH_XOR = 0xF834A608
val IV_INCREMENT = 0x1473F19
val HASH_SIZE = 4
```

#### 핸드셰이크 흐름 (TcpServer.scala)

1. 클라이언트 접속 시:
   ```scala
   val xorivFirst = Random.nextInt
   val xorivSecond = Random.nextInt
   val IV = xorivFirst ^ xorivSecond
   client.send(PcFirstMessage(xorivFirst, xorivSecond))
   ```
2. 클라이언트는 `PqSyncTick` 으로 응답
3. 이후 모든 패킷은 IV 기반 암호화/해시 적용

#### 패킷 프레이밍 구조 (TcpEncoder.scala)

**첫 패킷 (IV == 0)**:
```
[length(4)] + [OpHash(4) + payload]
```
- 암호화 없음, 해시 없음

**이후 패킷 (IV != 0)**:
```
[length(4)] + [payload] + [hash(4)]
```
- `length = IV ^ (payloadLen + HASH_SIZE) ^ LENGTH_XOR`
- `hash = IV ^ hashPacket(payload, IV, payloadLen, false) ^ HASH_XOR`
- `IV += IV_INCREMENT` (0이면 1로 변경)

#### hashPacket 함수 (Utils.scala)

- 16바이트 블록 단위로 처리
- 4개의 XOR 키 사용: `nKey ^ 0x14B307C8`, `nKey ^ 0x8CBF12AC`, `nKey ^ 0x240397C1`, `nKey ^ 0xF3BD29C0`
- 블록 내 4개 Int를 XOR하여 해시 계산
- 남은 바이트는 keyArray로 XOR 처리

### 3. 현재 Node.js 서버 구현 상태

**위치**: `C:\Reversecore_Workspace\droopl\everplanet-server\`

#### 파일 구조

```
everplanet-server/
├── package.json          # Node.js 프로젝트 설정
├── server.js             # TCP 서버 메인 (3431, 3432 포트)
├── packet.js             # PacketBuffer, OutPkt 기본 클래스
├── ophash.js             # OpHash 매핑 시스템
└── packets.js            # 패킷 모델 구현 (PcFirstMessage, PrLogin 등)
```

#### 현재 구현 상태

✅ **완료된 부분**:
- 기본 PacketBuffer 클래스 (read/write Byte, Short, Int, Long, String, WString)
- OpHash 시스템 (일부 패킷 해시 매핑)
- TCP 서버 기본 구조 (3431, 3432 포트 리슨)
- IP 리다이렉트 (Frida hook_net.js)
- 기본 패킷 모델 구조 (PcFirstMessage, PrLogin, PrSyncTick 등)

❌ **미완성 부분**:
- **프레이밍 레이어**: droopl의 TcpEncoder/TcpDecoder 로직 미구현
- **암호화/해시**: hashPacket, IV 관리, LENGTH_XOR/HASH_XOR 적용 안 됨
- **첫 패킷 이후**: 현재는 모든 패킷이 암호화 없이 전송됨

#### 현재 동작

- 클라이언트가 서버에 연결 (`Client connected` 로그 확인)
- 하지만 클라이언트가 즉시 연결 종료 (`Client disconnected`)
- 이유: 프레이밍/암호화 형식이 맞지 않아 클라이언트가 "잘못된 서버"로 판단

### 4. Frida 후킹 스크립트

**위치**: `C:\Reversecore_Workspace\hook_net.js`

**기능**:
- Ws2_32.dll의 `connect`, `send`, `recv` 후킹
- 공식 서버 IP (211.39.129.201/202)를 127.0.0.1로 리다이렉트
- 패킷 hex dump 출력

**사용법**:
```powershell
# 관리자 권한 PowerShell
cd C:\Reversecore_Workspace
frida -p <EverPlanet_PID> -l hook_net.js
```

---

## 📁 주요 파일 상세 설명

### 1. droopl/src/main/scala/tool/Netty/TcpEncoder.scala

**역할**: 서버 → 클라이언트 패킷 인코딩

**핵심 로직**:
```scala
if (IV == 0) {
  // 첫 패킷: 암호화 없음
  out.writeInt(payload.writerIndex)
  out.writeBytes(payload)
  IV = initIv
} else {
  // 이후 패킷: 암호화 + 해시
  val hash = hashPacket(payload, IV, payload.writerIndex, false)
  val enchash = IV ^ hash ^ HASH_XOR
  out.writeInt(IV ^ (payload.writerIndex + HASH_SIZE) ^ LENGTH_XOR)
  out.writeBytes(payload)
  out.writeInt(enchash)
  IV += IV_INCREMENT
  if (IV == 0) IV = 1
}
```

### 2. droopl/src/main/scala/tool/Netty/TcpDecoder.scala

**역할**: 클라이언트 → 서버 패킷 디코딩

**핵심 로직**:
```scala
val size = in.readInt ^ IV ^ LENGTH_XOR
val dec = in.readSlice(size - HASH_SIZE)
val clientHash = in.readInt ^ IV ^ HASH_XOR
val serverHash = hashPacket(dec, IV, dec.writerIndex, true)
// 해시 검증 후 IV 증가
IV += IV_INCREMENT
if (IV == 0) IV = 1
```

### 3. droopl/src/main/scala/tool/Utils.scala

**역할**: 패킷 해시 계산 및 암호화 유틸리티

**hashPacket 함수**:
- 16바이트 블록 단위 처리
- 4개 XOR 키 생성 및 적용
- 해시 계산 (encrypt 모드: XOR 전, decrypt 모드: XOR 후)

### 4. droopl/src/main/scala/pktmodel/PcFirstMessage.scala

**구조**:
```scala
writeInt()              // unknown
writeShort()            // unknown
writeByte(Config.REGION) // KR = 118
writeShort(Config.VER)   // KR = 680
writeWString()          // patch url (빈 문자열 가능)
writeInt(xoriv_first)
writeInt(xoriv_second)
writeArr(32)            // 32바이트 (0으로 채움)
```

### 5. droopl/src/main/scala/pktmodel/PrLogin.scala

**구조**: 매우 복잡한 구조 (sub_4CC500 포함)
- 에러 코드, 계정 정보, 캐릭터 슬롯 정보 등
- KRver 플래그에 따라 추가 필드 존재

### 6. droopl/everplanet-server/server.js

**현재 구조**:
- `createEverplanetServer(port)`: 서버 생성 함수
- 클라이언트 접속 시 `PcFirstMessage` 전송
- `socket.on('data')`: 패킷 수신 및 라우팅

**문제점**:
- `Client.send()`가 단순히 `packet.build()`만 호출
- droopl의 프레이밍/암호화 로직이 전혀 적용되지 않음

### 7. droopl/everplanet-server/packets.js

**현재 구조**:
- 각 패킷 클래스가 `OutPkt` 상속
- `build()`에서 OpHash + payload 작성

**문제점**:
- `PcFirstMessage`만 길이 프레임을 흉내냄
- 나머지 패킷은 프레이밍 없이 payload만 생성

---

## 🔧 다음 단계 작업 가이드

### Phase 1: 프레이밍 레이어 구현

#### 1.1 Utils 모듈 생성

**파일**: `droopl/everplanet-server/utils.js`

**구현 필요**:
- `hashPacket(buf, nKey, nLength, decrypt)`: droopl Utils.scala의 hashPacket 포팅
- 상수 정의: `HASH_XOR`, `LENGTH_XOR`, `IV_INCREMENT`, `HASH_SIZE`

**참고 코드**: `droopl/src/main/scala/tool/Utils.scala` (L8-L87)

#### 1.2 Encoder 모듈 생성

**파일**: `droopl/everplanet-server/encoder.js`

**구현 필요**:
- `encodePacket(payload, iv, isFirstPacket)`: droopl TcpEncoder 로직 포팅
- 첫 패킷: `[length(4)] + payload`
- 이후 패킷: `[length(4)] + payload + [hash(4)]` (IV XOR 적용)

**참고 코드**: `droopl/src/main/scala/tool/Netty/TcpEncoder.scala`

#### 1.3 Decoder 모듈 생성 (선택사항)

**파일**: `droopl/everplanet-server/decoder.js`

**구현 필요**:
- `decodePacket(data, iv)`: droopl TcpDecoder 로직 포팅
- 길이 해독, 해시 검증, IV 증가

**참고 코드**: `droopl/src/main/scala/tool/Netty/TcpDecoder.scala`

### Phase 2: 서버 통합

#### 2.1 Client 클래스 수정

**파일**: `droopl/everplanet-server/server.js`

**수정 필요**:
- `Client` 클래스에 `iv` 상태 추가
- `send()` 메서드가 `encoder.encodePacket()` 호출하도록 변경
- 첫 패킷 전송 후 `iv` 설정

#### 2.2 패킷 모델 수정

**파일**: `droopl/everplanet-server/packets.js`

**수정 필요**:
- 모든 패킷의 `build()`가 OpHash + payload만 반환하도록 통일
- 프레이밍은 `encoder.encodePacket()`에서 처리

### Phase 3: 테스트 및 검증

#### 3.1 Frida 로그 확인

- `hook_net.js`로 실제 전송되는 패킷 hex dump 확인
- droopl 서버와 비교하여 형식 일치 여부 확인

#### 3.2 핸드셰이크 흐름 확인

**예상 흐름**:
1. 클라이언트 접속
2. 서버: `PcFirstMessage` 전송
3. 클라이언트: `PqSyncTick` 응답
4. 서버: `PrSyncTick` 응답
5. 클라이언트: `PqSyncDateTime` 요청
6. 서버: `PrSyncDateTime` 응답
7. 클라이언트: `PqLogin` 요청
8. 서버: `PrLogin` + `PcKeyAuthRequest` 응답
9. ... (이후 로그인/캐릭터 선택 흐름)

---

## 📝 알려진 이슈 및 주의사항

### 1. Cursor MCP 제한

- reversecore/ghidra MCP 서버는 존재하지만, Cursor에서 인자 전달이 제대로 안 되어 고급 기능 사용 불가
- 대안: 로컬에서 직접 Ghidra/Frida 사용 또는 droopl 코드 분석에 집중

### 2. 정적 분석의 한계

- 바이너리 디컴파일만으로는 런타임 프로토콜 구조를 정확히 파악하기 어려움
- 동적 분석(Frida) + droopl 코드 포팅이 더 효과적

### 3. 패킷 구조 불일치 가능성

- droopl은 글로벌 버전 기준으로 작성됨
- 한국 버전(Ver.0680)과 일부 필드/플래그가 다를 수 있음
- 실제 클라이언트 동작을 Frida로 확인하며 조정 필요

### 4. IV 관리

- IV는 클라이언트별로 독립적으로 관리되어야 함
- 각 `Client` 인스턴스가 자신의 IV 상태를 가져야 함

---

## 🔗 참고 자료

### droopl 프로젝트 파일

- `droopl/src/main/scala/tool/Netty/TcpServer.scala`: 서버 초기화 및 핸드셰이크
- `droopl/src/main/scala/tool/Netty/TcpEncoder.scala`: 송신 인코딩
- `droopl/src/main/scala/tool/Netty/TcpDecoder.scala`: 수신 디코딩
- `droopl/src/main/scala/tool/Utils.scala`: 암호화 유틸리티
- `droopl/src/main/scala/tool/Config.scala`: 지역/버전 설정
- `droopl/src/main/scala/pktmodel/PrLogin.scala`: 로그인 응답 구조 (KRver 플래그 포함)

### 현재 Node.js 구현

- `droopl/everplanet-server/server.js`: 서버 메인
- `droopl/everplanet-server/packet.js`: 기본 버퍼 클래스
- `droopl/everplanet-server/packets.js`: 패킷 모델
- `droopl/everplanet-server/ophash.js`: OpHash 매핑

### Frida 스크립트

- `hook_net.js`: 네트워크 후킹 및 IP 리다이렉트

---

## 🎯 성공 기준

1. ✅ 클라이언트가 서버에 연결하고 연결을 유지
2. ✅ `PqSyncTick` → `PrSyncTick` 핸드셰이크 성공
3. ✅ `PqLogin` → `PrLogin` 로그인 흐름 진행
4. ✅ `PqChaList` → `PrChaList` 캐릭터 목록 표시
5. ✅ `PqChaSelect` → `PrChaSelect` 캐릭터 선택 및 게임 진입

---

## 📞 추가 정보

**프로젝트 루트**: `C:\Reversecore_Workspace`

**주요 실행 파일**:
- 클라이언트: `EverPlanet_KR_v1842_U_DEVM.exe`
- 서버: `droopl\everplanet-server\server.js` (Node.js)

**테스트 환경**:
- Windows 10
- Node.js (버전 확인 필요)
- Frida CLI (후킹용)

---

**작성일**: 2025-12-02  
**작성자**: Cursor AI Assistant  
**다음 담당자**: GitHub Copilot
