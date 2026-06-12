/**
 * EverPlanet 패처 vs 로그인 모드 분기 탐지 스크립트
 * 
 * 핵심 관찰:
 * - 클라이언트가 3431로 연결 후 PcFirstMessage를 받음
 * - 하지만 패처 프로토콜 패킷 (16 bytes: 08 72 89 25 ...)을 전송
 * - 이는 클라이언트가 PcFirstMessage를 처리하지 않는다는 의미
 *
 * 목표:
 * 1. 3431 connect() 후 첫 recv() 호출 추적
 * 2. recv() 이후 실행 흐름 추적 (어느 함수로 가는지)
 * 3. isPatchFirst / patchType 변수가 어디서 설정되는지
 */

'use strict';

const BASE = Module.getBaseAddress('EverPlanet_KR_v1842_U_DEVM.exe');
const ts = () => `[${(Date.now() % 1000000).toString().padStart(6, '0')}]`;
const log = (m) => console.log(ts() + ' ' + m);

log(`=== Patch-or-Login Detector ===`);
log(`Base: ${BASE}`);

// ─── 소켓 추적 ──────────────────────────────────────────
// 어떤 소켓이 3431, 3432에 연결되었는지 추적
const connectedSockets = new Map(); // sock → port

const connectFn = Module.getExportByName('ws2_32.dll', 'connect');
Interceptor.attach(connectFn, {
    onEnter(args) {
        this.sock = args[0].toInt32();
        const sa = args[1];
        const family = sa.readU16();
        if (family === 2) {
            const port = ((sa.add(2).readU8() << 8) | sa.add(3).readU8());
            const ip = `${sa.add(4).readU8()}.${sa.add(5).readU8()}.${sa.add(6).readU8()}.${sa.add(7).readU8()}`;
            this.port = port;
            this.ip = ip;
        }
    },
    onLeave(ret) {
        if (this.port) {
            log(`[CONNECT] sock=${this.sock} → ${this.ip}:${this.port} (ret=${ret.toInt32()})`);
            connectedSockets.set(this.sock, { port: this.port, ip: this.ip });
            
            // 포트별 특별 처리
            if (this.port === 3431) {
                log(`  ★★★ LOGIN SERVER CONNECTION (3431) ★★★`);
                // 콜 스택 추적
                try {
                    const bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 8);
                    bt.forEach((addr, i) => {
                        const mod = Process.findModuleByAddress(addr);
                        const off = addr.sub(BASE);
                        if (mod && mod.name.includes('EverPlanet')) {
                            log(`    [BT${i}] BASE+0x${off.toString(16).toUpperCase()} (${mod.name})`);
                        }
                    });
                } catch(e) {}
            } else if (this.port === 3432) {
                log(`  ★★★ PATCHER CONNECTION (3432) ★★★`);
                try {
                    const bt = Thread.backtrace(this.context, Backtracer.FUZZY).slice(0, 8);
                    bt.forEach((addr, i) => {
                        const mod = Process.findModuleByAddress(addr);
                        const off = addr.sub(BASE);
                        if (mod && mod.name.includes('EverPlanet')) {
                            log(`    [BT${i}] BASE+0x${off.toString(16).toUpperCase()}`);
                        }
                    });
                } catch(e) {}
            }
        }
    }
});

// ─── recv 추적 (3431/3432 소켓만) ───────────────────────
const recvFn = Module.getExportByName('ws2_32.dll', 'recv');
Interceptor.attach(recvFn, {
    onEnter(args) {
        this.sock = args[0].toInt32();
        this.buf = args[1];
    },
    onLeave(ret) {
        const n = ret.toInt32();
        if (n <= 0) return;
        
        const info = connectedSockets.get(this.sock);
        const port = info ? info.port : '?';
        
        if (port === 3431 || port === 3432 || port === '?') {
            const hex = Array.from(this.buf.readByteArray(Math.min(n, 32))).map(b => b.toString(16).padStart(2,'0')).join(' ');
            log(`[RECV:${port}] sock=${this.sock} ${n} bytes: ${hex}`);
            
            // caller 추적
            const callerOff = this.returnAddress.sub(BASE);
            log(`  caller: BASE+0x${callerOff.toString(16).toUpperCase()}`);
        }
    }
});

// ─── send 추적 ───────────────────────────────────────────
const sendFn = Module.getExportByName('ws2_32.dll', 'send');
Interceptor.attach(sendFn, {
    onEnter(args) {
        const sock = args[0].toInt32();
        const len = args[2].toInt32();
        const info = connectedSockets.get(sock);
        const port = info ? info.port : '?';
        
        if (port === 3431 || port === 3432) {
            const hex = Array.from(args[1].readByteArray(Math.min(len, 32))).map(b => b.toString(16).padStart(2,'0')).join(' ');
            log(`[SEND:${port}] sock=${sock} ${len} bytes: ${hex}`);
            
            const callerOff = this.returnAddress.sub(BASE);
            log(`  caller: BASE+0x${callerOff.toString(16).toUpperCase()}`);
        }
    }
});

// ─── 중요: recv 이후 콜 체인 추적 ──────────────────────
// 3431 recv 이후 어디로 가는지를 알기 위해
// 첫 recv 반환 후 다음 함수 호출을 스토킹

let firstRecvDone3431 = false;

// FUN_00be6ad0 = 알려진 recv 처리 함수 시도
const knownRecvProcs = [
    0xBE6AD0,  // recv 처리
    0xBE6DB0,  // send 처리
];

knownRecvProcs.forEach(off => {
    const addr = BASE.add(off);
    try {
        Interceptor.attach(addr, {
            onEnter(args) {
                log(`[RECV_PROC:0x${off.toString(16)}] Called`);
                log(`  args: ${args[0]}, ${args[1]}, ${args[2]}`);
            },
            onLeave(ret) {
                log(`[RECV_PROC:0x${off.toString(16)}] Returned: ${ret}`);
            }
        });
        log(`Hooked FUN_${off.toString(16).padStart(8,'0')}`);
    } catch(e) {
        log(`Failed to hook 0x${off.toString(16)}: ${e.message}`);
    }
});

// ─── isPatchFirst 주변 메모리 모니터링 ─────────────────
// isPatchFirst 문자열은 0x00d34850에 있음
// 이 주변에서 참조하는 코드를 찾기 위해
// 실행 중에 이 주소를 push하는 명령어를 찾아야 함

setTimeout(() => {
    log('=== Searching for isPatchFirst references at runtime ===');
    
    // 메모리에서 isPatchFirst 문자열 찾기
    const isPatchFirst_utf16 = [0x69, 0x00, 0x73, 0x00, 0x50, 0x00, 0x61, 0x00, 
                                 0x74, 0x00, 0x63, 0x00, 0x68, 0x00, 0x46, 0x00, 
                                 0x69, 0x00, 0x72, 0x00, 0x73, 0x00, 0x74, 0x00];
    
    const pattern = isPatchFirst_utf16.map(b => b.toString(16).padStart(2,'0')).join(' ');
    log(`Pattern: ${pattern}`);
    
    const ranges = Process.enumerateRanges({ protection: 'r--', coalesce: true });
    for (const range of ranges) {
        try {
            const matches = Memory.scanSync(range.base, range.size, pattern);
            for (const m of matches) {
                const off = m.address.sub(BASE);
                log(`  isPatchFirst found at ${m.address} (BASE+0x${off.toString(16)})`);
                log(`  value: "${m.address.readUtf16String(16)}"`);
            }
        } catch (e) {}
    }
    log('=== isPatchFirst search done ===');
}, 2000);

// ─── 패치 관련 코드 실행 추적 ───────────────────────────
// 0x006c449b에 3432(0x0D68) 패턴이 있었음
// 이 함수 추적
const patchAddr = BASE.add(0x006c449b);
try {
    // 함수 시작 부분을 찾아야 함 - 일단 근처 코드 실행 시 로깅
    Interceptor.attach(BASE.add(0x006c4000), {
        onEnter(args) {
            log(`[0x6C4000] Called - may be patcher function`);
        }
    });
} catch(e) {}

log('=== All hooks installed. Launch game now. ===');
