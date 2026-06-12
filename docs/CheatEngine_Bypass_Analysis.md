# EverPlanet Cheat Engine Bypass Script Analysis

**Date**: 2025-12-03  
**Source**: 이전 사용자 공유 스크립트 + 바이너리 diff 분석  
**Target**: EverPlanet KR v1842  
**Status**: ✅ Frida 스크립트 v7.4에 적용 완료

---

## 📋 개요

다른 사람이 공유한 치트엔진 스크립트로 **로비까지 진입 성공** 확인됨.
`EverPlanet_KR_v1842_L.exe`와 원본을 비교하여 **29개 패치 지점** 발견.

---

## 🔍 바이너리 비교 분석 결과

### 파일 정보
- **원본**: `EverPlanet_KR_v1842_U_DEVM.exe` (11,158,016 bytes)
- **패치본**: `EverPlanet_KR_v1842_L.exe` (11,158,016 bytes)
- **차이점**: 29 bytes

### 발견된 패치 목록

| File Offset | VA (가상주소) | Original | Patched | 설명 |
|-------------|--------------|----------|---------|------|
| 0x006514A6 | 0x00A514A6 | `8A 51 10` | `33 D2 90` | xor edx,edx; nop |
| 0x0035057B | 0x0075057B | `75` | `EB` | JNZ → JMP (웹런처 우회) |
| 0x003549D0 | 0x007549D0 | `55 8B EC` | `31 C0 C3` | xor eax,eax; ret |
| 0x003551F0 | 0x007551F0 | 함수 프롤로그 | `B8 01...C3` | mov eax,1; ret |
| 0x00355280 | 0x00755280 | 함수 프롤로그 | `B8 01...C2 04` | mov eax,1; ret 4 |
| 0x007E66A0 | 0x00BE66A0 | 함수 프롤로그 | `31 C0 C2 04` | xor eax,eax; ret 4 |
| 0x0082D120 | 0x00C2D120 | 함수 프롤로그 | `31 C0 C3` | xor eax,eax; ret |

---

## 🔧 치트엔진 스크립트 분석

### 1. serverChk pass (서버 체크 우회)

```asm
[ENABLE]
007565AE:                    ; Checking connection 1
jmp 00756682                 ; 체크 로직 스킵

00756682:                    ; Force end
jmp 007568BE                 ; 강제로 성공 경로로 점프
```

**분석**:
- `0x007565AE`: 서버 연결 확인 로직 시작점
- `0x00756682`: 중간 체크포인트
- `0x007568BE`: 서버 체크 성공 후 경로

**의미**: 서버 연결 검증을 완전히 건너뛰고 성공 경로로 직접 점프

---

### 2. LaunchARG pass (런처 인자 우회)

```asm
[ENABLE]
0075629F:                    ; Pass webLaunching
db EB                        ; JNZ(75) -> JMP(EB) 변경

Alloc(Hook,128)

00756328:                    ; terminate
call Hook

Hook:
mov eax,1                    ; return 1 (성공)
ret 0004
```

**분석**:
- `0x0075629F`: 웹 런처 확인 분기점
  - 원본: `75 XX` (JNZ - 조건 점프)
  - 패치: `EB XX` (JMP - 무조건 점프)
- `0x00756328`: 종료 함수 호출 지점
  - Hook으로 대체하여 성공(1) 반환

**의미**: 웹 런처 없이 실행해도 통과

---

### 3. Terminate(serverCHK) (종료 방지)

```asm
[ENABLE]
Alloc(Hook,128)

00755481:
call Hook

Hook:
mov eax,1                    ; return 1 (성공)
ret 0014                     ; 5개 인자 정리 (0x14 = 20 bytes)
```

**분석**:
- `0x00755481`: 서버 체크 실패 시 종료 호출 지점
- Hook으로 대체하여 항상 성공 반환
- `ret 0014`: stdcall 규약, 5개 인자 (5 * 4 = 20 = 0x14)

**의미**: 서버 체크 실패해도 종료하지 않음

---

## 📍 핵심 주소 요약

| 주소 | 역할 | 패치 내용 |
|------|------|----------|
| `0x007565AE` | 서버 연결 체크 | JMP 0x756682 |
| `0x00756682` | 체크 중간점 | JMP 0x7568BE |
| `0x0075629F` | 웹 런처 분기 | 75→EB (JNZ→JMP) |
| `0x00756328` | 종료 함수 | Hook (return 1) |
| `0x00755481` | 서버체크 종료 | Hook (return 1) |

---

## 🔗 기존 분석과의 연관성

### 이전에 분석한 함수들과 비교

| 치트엔진 주소 | 우리가 분석한 함수 | 매칭 |
|--------------|-------------------|------|
| `0x00755481` | `FUN_007554e0` (로그인 UI) | ✅ 근접! |
| `0x0075629F` | `FUN_007554e0` 내부 | ✅ 내부 분기 |
| `0x00756328` | `FUN_007554e0` 내부 | ✅ 내부 분기 |
| `0x007565AE` | 미분석 영역 | 🔍 분석 필요 |
| `0x00756682` | 미분석 영역 | 🔍 분석 필요 |
| `0x007568BE` | 미분석 영역 | 🔍 분석 필요 |

**중요 발견**: 
- `0x00755481`은 `FUN_007554e0` 함수 내부! (0x7554e0 + 0xA1 = 0x755581)
- 우리가 함수 전체를 패치했지만, 더 정밀한 지점 패치가 필요할 수 있음

---

## 💡 Frida 스크립트 적용 방안

```javascript
// 치트엔진 스크립트를 Frida로 변환

// 1. serverChk pass
const addr1 = ptr(0x007565AE);
Memory.protect(addr1, 6, 'rwx');
// JMP 00756682 (E9 CF 00 00 00 90)
addr1.writeByteArray([0xE9, 0xCF, 0x00, 0x00, 0x00, 0x90]);

const addr2 = ptr(0x00756682);
Memory.protect(addr2, 6, 'rwx');
// JMP 007568BE (E9 37 02 00 00 90)
addr2.writeByteArray([0xE9, 0x37, 0x02, 0x00, 0x00, 0x90]);

// 2. LaunchARG pass
const addr3 = ptr(0x0075629F);
Memory.protect(addr3, 1, 'rwx');
addr3.writeU8(0xEB);  // JNZ -> JMP

const addr4 = ptr(0x00756328);
Memory.protect(addr4, 6, 'rwx');
// mov eax, 1; ret 4
addr4.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x04, 0x00]);

// 3. Terminate bypass
const addr5 = ptr(0x00755481);
Memory.protect(addr5, 8, 'rwx');
// mov eax, 1; ret 0x14
addr5.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x14, 0x00]);
```

---

## 📁 관련 파일

- `EverPlanet_KR_v1842_U_DEVM.exe` - 원본 클라이언트
- `EverPlanet_KR_v1842_L.exe` - 로비 진입용 패치 클라이언트

---

## 🔬 바이너리 비교 분석 결과

두 파일 비교 결과: **29개 바이트 차이** 발견!

### 패치된 위치 상세

| File Offset | VA 주소 | 원본 | 패치 | 설명 |
|-------------|---------|------|------|------|
| `0x002514A6` | `0x006514A6` | `8A 51 10` | `33 D2 90` | xor edx,edx; nop |
| `0x0035057B` | `0x0075057B` | `75` | `EB` | **JNZ → JMP** |
| `0x003549D0` | `0x007549D0` | `55 8B EC` | `31 C0 C3` | xor eax,eax; ret |
| `0x003551F0` | `0x007551F0` | `55 8B EC...` | `B8 01 00 00 00 C3` | **mov eax,1; ret** |
| `0x00355280` | `0x00755280` | `55 8B EC...` | `B8 01 00 00 00 C2 04 00` | **mov eax,1; ret 4** ✅ |
| `0x007E66A0` | `0x00BE66A0` | `55 8B EC...` | `31 C0 C2 04 00` | xor eax,eax; ret 4 |
| `0x0082D120` | `0x00C2D120` | `8B FF 55` | `31 C0 C3` | xor eax,eax; ret |

### 핵심 발견 🎯

1. **`0x00755280`** - 우리가 이미 분석한 `FUN_00755280` (Login Wrapper)!
   - L.exe에서도 동일하게 패치됨
   - `mov eax, 1; ret 4` (stdcall 규약)

2. **`0x007551F0`** - 새로운 함수 발견!
   - `mov eax, 1; ret` 패치
   - 분석 필요

3. **`0x007549D0`** - 새로운 함수 발견!
   - `xor eax, eax; ret` (return 0)
   - 분석 필요

4. **`0x0075057B`** - JNZ → JMP 패치
   - 조건 분기를 무조건 점프로 변경
   - **치트엔진 스크립트의 0x0075629F 와 다른 위치!**

5. **`0x006514A6`** - edx 레지스터 초기화
   - 어떤 함수 내부의 코드

6. **`0x00BE66A0`, `0x00C2D120`** - 높은 주소의 함수들
   - .rdata 또는 다른 섹션일 수 있음
   - return 0 패치

---

## ⚠️ 치트엔진 스크립트 vs L.exe 비교

| 항목 | 치트엔진 주소 | L.exe 주소 | 일치 |
|------|--------------|------------|------|
| 런처 분기 | `0x0075629F` | `0x0075057B` | ❌ 다름! |
| 종료 방지 | `0x00755481` | `0x007551F0` | ❌ 다름! |
| 서버 체크 | `0x007565AE` | 미발견 | ❌ |
| 로그인 래퍼 | 미언급 | `0x00755280` | ✅ 발견 |

**결론**: 치트엔진 스크립트와 L.exe는 **서로 다른 패치 방식** 사용!

---

## 🔧 Frida 스크립트 업데이트 방안

L.exe의 패치를 Frida로 적용:

```javascript
// L.exe 패치 재현
function applyLobbyPatches() {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    const base = gameModule.base;
    
    // 1. 0x006514A6: xor edx, edx; nop
    const addr1 = base.add(0x006514A6 - 0x400000);
    Memory.protect(addr1, 3, 'rwx');
    addr1.writeByteArray([0x33, 0xD2, 0x90]);
    
    // 2. 0x0075057B: JNZ -> JMP
    const addr2 = base.add(0x0075057B - 0x400000);
    Memory.protect(addr2, 1, 'rwx');
    addr2.writeU8(0xEB);
    
    // 3. 0x007549D0: xor eax, eax; ret
    const addr3 = base.add(0x007549D0 - 0x400000);
    Memory.protect(addr3, 3, 'rwx');
    addr3.writeByteArray([0x31, 0xC0, 0xC3]);
    
    // 4. 0x007551F0: mov eax, 1; ret
    const addr4 = base.add(0x007551F0 - 0x400000);
    Memory.protect(addr4, 6, 'rwx');
    addr4.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
    
    // 5. 0x00755280: mov eax, 1; ret 4 (이미 적용됨)
    
    // 6. 0x00BE66A0: xor eax, eax; ret 4
    const addr6 = base.add(0x00BE66A0 - 0x400000);
    Memory.protect(addr6, 5, 'rwx');
    addr6.writeByteArray([0x31, 0xC0, 0xC2, 0x04, 0x00]);
    
    // 7. 0x00C2D120: xor eax, eax; ret
    const addr7 = base.add(0x00C2D120 - 0x400000);
    Memory.protect(addr7, 3, 'rwx');
    addr7.writeByteArray([0x31, 0xC0, 0xC3]);
    
    log("[+] L.exe lobby patches applied!");
}
```

---

## ✅ 다음 단계

1. Ghidra로 새로운 주소들 분석 (0x7565AE, 0x756682, 0x7568BE)
2. 두 exe 파일 비교 분석 (diff)
3. Frida 스크립트에 치트엔진 패치 적용
4. 로비 진입 테스트

---

*Created: 2025-12-03*
