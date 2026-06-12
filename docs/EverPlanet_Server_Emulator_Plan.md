# EverPlanet KR 서버 에뮬레이터 개발 계획

## 분석 결과 요약

### 게임 정보
- **엔진**: C++ 자체제작 엔진 (DirectX 기반)
- **플랫폼**: Windows x86
- **보호**: AhnLab HShield 안티치트
- **네트워크**: TCP 기반 패킷 통신

### 기존 자료
- **droopl 프로젝트**: 글로벌 버전 서버 에뮬레이터 (Scala + Netty)
- **한국 버전 특징**: KRver 플래그로 구분되는 패킷 구조 차이

## 개발 계획

### Phase 1: droopl 기반 포팅
1. **Config 수정**: REGION을 KR로 변경, VER을 680으로 설정
2. **패킷 구조 분석**: KRver 플래그가 영향을 주는 패킷들 확인
3. **Scala 환경 구축**: sbt 또는 직접 Java로 변환 고려

### Phase 2: 패킷 프로토콜 구현
1. **OpHash 시스템 분석**: 패킷 해시 매핑 메커니즘 이해
2. **핵심 패킷 구현**:
   - PqLogin → PrLogin (로그인)
   - PqAuthLogin → PrAuthLogin (인증)
   - PqChaList → PrChaList (캐릭터 목록)
   - PqChaSelect → PrChaSelect (캐릭터 선택)

### Phase 3: 데이터베이스 설계
1. **계정 시스템**: 사용자 인증 및 세션 관리
2. **캐릭터 시스템**: 캐릭터 생성, 선택, 저장
3. **게임 데이터**: 인벤토리, 퀘스트, 길드 등

### Phase 4: 게임 로직 구현
1. **기본 게임플레이**: 이동, 채팅, 상호작용
2. **전투 시스템**: 스킬, 데미지 계산
3. **경제 시스템**: 아이템, 상점, 거래

## 기술 스택 선택

### 옵션 1: Scala (droopl 기반)
```scala
// droopl의 장점: 이미 구현된 패킷 구조
libraryDependencies += "io.netty" % "netty-all" % "4.2.0.Final"
```

### 옵션 2: Java (Netty)
```java
// 더 친숙한 언어, droopl 로직을 Java로 변환
<dependency>
    <groupId>io.netty</groupId>
    <artifactId>netty-all</artifactId>
    <version>4.1.100.Final</version>
</dependency>
```

### 옵션 3: Node.js
```javascript
// 빠른 프로토타이핑 가능
const net = require('net');
```

## 구현 우선순위

### 1단계: 기본 연결 및 인증
- [ ] 서버 포트 3411, 3431 개방
- [ ] PqLogin 패킷 처리
- [ ] PrLogin 응답 전송
- [ ] PcKeyAuthRequest 처리

### 2단계: 캐릭터 시스템
- [ ] PqChaList 처리 및 캐릭터 목록 응답
- [ ] PqChaSelect 처리 및 캐릭터 선택
- [ ] 기본 캐릭터 데이터 구조 구현

### 3단계: 게임 월드
- [ ] PqWorldList/PqWorldSelect 처리
- [ ] PqWorldMoveIn 처리
- [ ] 기본 월드 이동 로직

## 테스트 전략

### 단위 테스트
- 각 패킷 파서/빌더 테스트
- 데이터베이스 연동 테스트

### 통합 테스트
- 클라이언트 ↔ 서버 연결 테스트
- 로그인 → 캐릭터 선택 → 게임 입장 플로우

### 실제 클라이언트 테스트
- EverPlanet_KR_v1842_U_DEVM.exe 실행
- 서버 연결 및 기본 기능 확인

## 위험 요소 및 해결 방안

### 1. 패킷 암호화
**문제**: 패킷이 암호화될 수 있음
**해결**: Wireshark로 패킷 캡처 및 분석

### 2. 안티치트 간섭
**문제**: HShield가 서버 통신을 검증할 수 있음
**해결**: 클라이언트 측에서 안티치트 우회 또는 로컬 테스트

### 3. 데이터베이스 설계
**문제**: 게임 데이터 구조 불명확
**해결**: 클라이언트 메모리 덤프 및 분석

## 마일스톤

### Week 1-2: droopl 분석 및 포팅
- droopl 코드 완전 분석
- 한국 버전 패킷 구조 확인
- 기본 서버 프레임워크 구축

### Week 3-4: 인증 시스템
- 로그인/로그아웃 구현
- 세션 관리 시스템 구축

### Week 5-6: 캐릭터 시스템
- 캐릭터 생성/선택 구현
- 기본 캐릭터 데이터 저장

### Week 7-8: 게임 월드
- 기본 이동 및 상호작용 구현
- 첫 번째 통합 테스트

## 결론

droopl 프로젝트를 기반으로 한국 버전 EverPlanet 서버 에뮬레이터 개발은 충분히 가능합니다. 주요 과제는 패킷 구조의 차이점을 파악하고 한국 버전에 맞게 수정하는 것입니다.

**다음 단계**: droopl의 Scala 코드를 Java로 변환하여 개발 시작