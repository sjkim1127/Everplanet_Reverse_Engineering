/**
 * EverPlanet 심층 네트워크 분석 스크립트
 * 
 * 목적:
 * 1. 3431 포트로 연결 후 클라이언트가 보내는 첫 패킷 분석
 * 2. PcFirstMessage 처리 함수 추적
 * 3. "Patch..." 화면 트리거 조건 파악
 * 4. recv/send 호출 스택 추적
 */

'use strict';

// ─── 상수 ───────────────────────────────────────────────
const BASE = Module.getBaseAddress('EverPlanet_KR_v1842_U_DEVM.exe');
const log = (msg) => console.log(`[${new Date().toISOString().substr(11, 12)}] ${msg}`);

log('=== Deep Network Analysis Script Loaded ===');
log(`Base: ${BASE}`);

// ─── ws2_32 훅 (모든 send/recv 추적) ───────────────────
const ws2 = Module.findBaseAddress('ws2_32.dll');
if (ws2) {
    log(`ws2_32.dll base: ${ws2}`);
    
    // recv 훅 - 반환 직후 caller 스택 확인
    const recvPtr = Module.getExportByName('ws2_32.dll', 'recv');
    Interceptor.attach(recvPtr, {
        onEnter(args) {
            this.sock = args[0].toInt32();
            this.buf = args[1];
            this.len = args[2].toInt32();
        },
        onLeave(ret) {
            const bytesRecv = ret.toInt32();
            if (bytesRecv <= 0) return;
            
            const data = this.buf.readByteArray(bytesRecv);
            const hex = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2,'0')).join(' ');
            
            log(`[recv] sock=${this.sock} ${bytesRecv} bytes: ${hex.substr(0, 96)}${hex.length > 96 ? '...' : ''}`);
            
            // 반환 주소 (caller) 확인
            const retAddr = this.returnAddress;
            const retOffset = retAddr.sub(BASE);
            log(`  [recv caller] retAddr=${retAddr} (BASE+0x${retOffset.toString(16)})`);
        }
    });
    
    // send 훅
    const sendPtr = Module.getExportByName('ws2_32.dll', 'send');
    Interceptor.attach(sendPtr, {
        onEnter(args) {
            this.sock = args[0].toInt32();
            const len = args[2].toInt32();
            const data = args[1].readByteArray(Math.min(len, 64));
            const hex = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2,'0')).join(' ');
            
            log(`[send] sock=${this.sock} ${len} bytes: ${hex}`);
            
            const retOffset = this.returnAddress.sub(BASE);
            log(`  [send caller] BASE+0x${retOffset.toString(16)}`);
        }
    });
    
    // connect 훅 - 포트 정보 포함
    const connectPtr = Module.getExportByName('ws2_32.dll', 'connect');
    Interceptor.attach(connectPtr, {
        onEnter(args) {
            this.sock = args[0].toInt32();
            const sa = args[1];
            const family = sa.readU16();
            if (family === 2) { // AF_INET
                const port = ((sa.add(2).readU8() << 8) | sa.add(3).readU8());
                const ip = `${sa.add(4).readU8()}.${sa.add(5).readU8()}.${sa.add(6).readU8()}.${sa.add(7).readU8()}`;
                log(`[connect] sock=${this.sock} → ${ip}:${port}`);
                
                const retOffset = this.returnAddress.sub(BASE);
                log(`  [connect caller] BASE+0x${retOffset.toString(16)}`);
                
                // 콜 스택
                try {
                    const bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 5);
                    bt.forEach((addr, i) => {
                        const off = addr.sub(BASE);
                        if (off.compare(ptr(0)) > 0 && off.compare(ptr(0x2000000)) < 0) {
                            log(`    [bt${i}] BASE+0x${off.toString(16)}`);
                        }
                    });
                } catch(e) {}
            }
        },
        onLeave(ret) {
            log(`  [connect ret] ${ret.toInt32()}`);
        }
    });
}

// ─── 게임 내부 함수 훅 ───────────────────────────────────

// FUN_00be6ad0 = 수신 처리 함수
const recvFn = BASE.add(0xBE6AD0);
Interceptor.attach(recvFn, {
    onEnter(args) {
        log(`[FUN_be6ad0/RecvProc] Called, arg0=${args[0]}, arg1=${args[1]}, arg2=${args[2]}`);
    },
    onLeave(ret) {
        log(`[FUN_be6ad0/RecvProc] Returned: ${ret}`);
    }
});

// FUN_00be6db0 = 송신 처리 함수
const sendFn = BASE.add(0xBE6DB0);
Interceptor.attach(sendFn, {
    onEnter(args) {
        log(`[FUN_be6db0/SendProc] Called, arg0=${args[0]}, arg1=${args[1]}, arg2=${args[2]}`);
    },
    onLeave(ret) {
        log(`[FUN_be6db0/SendProc] Returned: ${ret}`);
    }
});

// FUN_00673100 = 인증 관련 함수 (이미 알고 있음)
// 3431 → PcFirstMessage 처리 후 어디로 가는지 추적

// ─── 문자열 "Patch" 근처 코드 훅 시도 ──────────────────
// 바이너리에서 "Patch..." UI 표시 함수를 찾아야 함
// 일단 메모리에서 "Patch" 문자열 검색

function searchStringInMemory(pattern, maxResults = 10) {
    const results = [];
    try {
        const ranges = Process.enumerateRanges({ protection: 'r--', coalesce: true });
        for (const range of ranges) {
            try {
                const matches = Memory.scanSync(range.base, range.size, pattern);
                for (const match of matches) {
                    results.push(match.address);
                    if (results.length >= maxResults) return results;
                }
            } catch (e) {}
        }
    } catch (e) {}
    return results;
}

// 게임이 초기화된 후 "Patch" 문자열 검색 (2초 후)
setTimeout(() => {
    log('[MEM SEARCH] Searching for "Patch" string...');
    
    // UTF-16LE "Patch" = 50 00 61 00 74 00 63 00 68 00
    const patchPattern = '50 00 61 00 74 00 63 00 68 00';
    const patchAddrs = searchStringInMemory(patchPattern);
    patchAddrs.forEach(addr => {
        const off = addr.sub(BASE);
        log(`  [PATCH STR] addr=${addr} (BASE+0x${off.toString(16)}): ${addr.readUtf16String(20)}`);
    });
    
    // ASCII "Patch" 검색
    const patchAscii = '50 61 74 63 68';
    const patchAsciiAddrs = searchStringInMemory(patchAscii);
    patchAsciiAddrs.forEach(addr => {
        const off = addr.sub(BASE);
        log(`  [PATCH ASCII] addr=${addr} (BASE+0x${off.toString(16)}): "${addr.readCString()}"`);
    });
    
    log('[MEM SEARCH] Done.');
}, 2000);

// ─── 패처 포트 3432 관련 코드 탐색 ─────────────────────
// 3432 = 0x0D68
// 리틀 엔디언으로 메모리에서: 68 0D
setTimeout(() => {
    log('[MEM SEARCH] Searching for port 3432 (0x0D68) in code...');
    
    const port3432 = '68 0D 00 00'; // DWORD 3432
    const port3432be = '0D 68'; // big endian (network byte order)
    
    const ranges = Process.enumerateRanges({ protection: 'r-x', coalesce: true });
    for (const range of ranges) {
        try {
            // 실행 가능한 영역에서 검색
            const matches = Memory.scanSync(range.base, range.size, port3432);
            for (const m of matches) {
                const off = m.address.sub(BASE);
                log(`  [PORT 3432 LE] code=${m.address} (BASE+0x${off.toString(16)})`);
            }
            
            const matches2 = Memory.scanSync(range.base, range.size, port3432be);
            for (const m of matches2) {
                const off = m.address.sub(BASE);
                // BASE 기준으로 합리적인 범위인지 확인
                if (off.compare(ptr(0)) > 0 && off.compare(ptr(0x2000000)) < 0) {
                    log(`  [PORT 3432 BE] code=${m.address} (BASE+0x${off.toString(16)})`);
                }
            }
        } catch (e) {}
    }
    
    // 마찬가지로 3431 검색
    log('[MEM SEARCH] Searching for port 3431 (0x0D67)...');
    const port3431be = '0D 67';
    for (const range of ranges) {
        try {
            const matches = Memory.scanSync(range.base, range.size, port3431be);
            for (const m of matches) {
                const off = m.address.sub(BASE);
                if (off.compare(ptr(0)) > 0 && off.compare(ptr(0x2000000)) < 0) {
                    log(`  [PORT 3431 BE] code=${m.address} (BASE+0x${off.toString(16)})`);
                }
            }
        } catch (e) {}
    }
    
    log('[MEM SEARCH] Port search done.');
}, 3000);

log('=== Hooks installed. Waiting for game activity... ===');
