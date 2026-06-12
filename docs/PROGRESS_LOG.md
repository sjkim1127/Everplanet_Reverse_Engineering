# EverPlanet KR v1842 프라이빗 서버 개발 진행 로그

## 프로젝트 개요
- **목표**: EverPlanet KR v1842 프라이빗 서버 구현
- **클라이언트**: GameClient.exe (Themida 패킹됨)
- **보호**: AhnLab HackShield 안티치트
- **GitHub**: https://github.com/sjkim1127/everplanet-server

---

## 2025-12-04 진행 상황

### 1. 클라이언트 바이패스 (완료)

#### CheatEngine 패치 (작동 확인됨)
| 패치명 | 주소 | 설명 |
|--------|------|------|
| ServerChk pass | 0x7565AE | 서버 연결 확인 우회 |
| LaunchArg pass | 0x75629F | 웹 런처 검증 우회 |
| Terminate | 0x755481 | 종료 함수 우회 |

**실행 방법**: CheatEngine Create Process + Suspended Mode

### 2. 서버 에뮬레이터 구현 (진행 중)

#### 완료된 패킷
| 패킷 | OpHash | 설명 |
|------|--------|------|
| PcFirstMessage | - | IV 교환 (평문) |
| PcKeyAuthRequest | 0xA0918EEB | 인증 요청 |
| PrLogin | 0x5C1E82E0 | 로그인 응답 |
| PrAuthLogin | 0x54E93D87 | 인증 완료 |
| PrChaList | 0x83ADFA12 | 캐릭터 목록 |
| PrWorldList | 0x4128264E | 월드 목록 |
| PrWorldSelect | 0x48B3870C | 월드 선택 |
| PrSyncTick | 0x6867E67F | 시간 동기화 (Long 타입) |
| PrSyncDateTime | 0xD67ECFEC | 날짜/시간 동기화 |

#### 암호화 시스템 (완료)
- IV-based XOR 암호화/복호화
- hashPacket 함수 구현 (비트 시프트 버그 수정됨)
- 세션 IV 복원 (재연결 처리)

#### 서버 포트
- 3431: 메인 게임 서버
- 3432: 백업/채널 서버
- 47611: Nexon 인증 서버

### 3. 해결된 이슈

#### hashPacket 비트 시프트 버그
- **문제**: `i * 8`로 계산하면 i>=4에서 오버플로우
- **해결**: droopl 원본처럼 `i` 또는 `i & 31` 사용
```javascript
// 수정 전 (버그)
hash ^= (decrypted << (i * 8));

// 수정 후 (droopl 방식)
hash ^= ((decrypted & 0xFF) << i);
```

#### PrSyncTick 타임스탬프 크기
- **문제**: Int(4바이트)로 전송 시 즉시 연결 끊김
- **해결**: Long(8바이트)로 변경 (droopl writeLong 사용)

#### 재연결 세션 복원
- 월드 선택 후 클라이언트가 같은 포트로 재연결
- 이전 세션의 IV와 패킷 카운터 복원 필요
- `sessionState` 객체로 상태 저장/복원

### 4. 진행 중인 이슈

#### 클라이언트 프리즈
- PrSyncTick + PrSyncDateTime 전송 후 클라이언트 응답 없음
- TCP 연결은 정상 종료되나 게임 화면 멈춤
- 추가 패킷 필요 여부 확인 중

---

## 파일 포맷 분석

### PIN1 파일
- 서버 IP 설정 (암호화된 XML)
- `-loginserveraddr` 옵션으로 우회 가능

### CHI 파일
- 게임 리소스 (RHO 업그레이드 버전)
- 파일마다 다른 파일키 사용
- 핵심 함수: `0x58CE20` (헤더키 추출)

---

## 다음 단계
1. 클라이언트 프리즈 원인 분석
2. 추가 필요 패킷 식별 (x64dbg 브레이크포인트)
3. 게임 입장 후 패킷 처리 구현
