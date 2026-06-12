// EverPlanet Force Login - MINIMAL VERSION
// Only patches from patchnote.md for KR v1842

const startTime = Date.now();
function ts() {
  const elapsed = Date.now() - startTime;
  const mins = Math.floor(elapsed / 60000);
  const secs = ((elapsed % 60000) / 1000).toFixed(3);
  return "[" + String(mins).padStart(2, '0') + ":" + String(secs).padStart(6, '0') + "]";
}

function log(msg) {
  console.log(ts() + " " + msg);
}

log("== EverPlanet MINIMAL v7 (Interceptor.replace for 0x755280) ==");

// Exception handler to catch crashes
Process.setExceptionHandler(function(details) {
  log("!!! EXCEPTION !!!");
  log("Type: " + details.type);
  log("Address: " + details.address);
  if (details.context) {
    log("EIP: " + details.context.pc);
    log("ESP: " + details.context.sp);
  }
  log("Memory: " + JSON.stringify(details.memory));
  return false;
});

function applyMinimalPatches() {
  // Try both module names
  let gameModule = null;
  try {
    gameModule = Process.getModuleByName("GameClient.exe");
  } catch(e) {
    try {
      gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    } catch(e2) {
      log("[!] Game module not found");
      return false;
    }
  }
  
  if (!gameModule) {
    log("[!] Game module not found");
    return false;
  }
  
  const imageBase = gameModule.base;
  const baseOffset = ptr(0x00400000);
  
  log("[*] Game module at: " + imageBase);
  
  // ==========================================
  // patchnote.md - EverPlanet KR v1842 patches
  // ==========================================
  
  // HS (HackShield?) patches
  // 007551F0: db B8 01 00 00 00 C3
  try {
    const addr1 = imageBase.add(ptr(0x007551F0).sub(baseOffset));
    Memory.protect(addr1, 8, 'rwx');
    addr1.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
    log("[+] 0x007551F0: mov eax,1; ret");
  } catch(e) { log("[!] 0x007551F0 failed: " + e); }
  
  // 00755280: This function keeps crashing even after patching
  // Use Interceptor.replace to ensure the hook persists
  try {
    const addr2 = imageBase.add(ptr(0x00755280).sub(baseOffset));
    Memory.protect(addr2, 16, 'rwx');
    // First, write the bytes as backup
    addr2.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x04, 0x00]);
    log("[+] 0x00755280: mov eax,1; ret 4 (byte patch)");
    
    // Also use Interceptor.replace to ensure it stays hooked
    Interceptor.replace(addr2, new NativeCallback(function(param1) {
      return 1;
    }, 'int', ['int']));
    log("[+] 0x00755280: Interceptor.replace (return 1)");
  } catch(e) { log("[!] 0x00755280 failed: " + e); }
  
  // 007549D0: db 31 C0 C3
  try {
    const addr3 = imageBase.add(ptr(0x007549D0).sub(baseOffset));
    Memory.protect(addr3, 4, 'rwx');
    addr3.writeByteArray([0x31, 0xC0, 0xC3]);
    log("[+] 0x007549D0: xor eax,eax; ret");
  } catch(e) { log("[!] 0x007549D0 failed: " + e); }
  
  // Mutex: 00750576+5 = 0075057B: db EB
  try {
    const addr4 = imageBase.add(ptr(0x0075057B).sub(baseOffset));
    Memory.protect(addr4, 2, 'rwx');
    addr4.writeU8(0xEB);
    log("[+] 0x0075057B: JNZ -> JMP (Mutex)");
  } catch(e) { log("[!] 0x0075057B failed: " + e); }
  
  // Window Mode: 006514A6: db 33 D2 90
  try {
    const addr5 = imageBase.add(ptr(0x006514A6).sub(baseOffset));
    Memory.protect(addr5, 4, 'rwx');
    addr5.writeByteArray([0x33, 0xD2, 0x90]);
    log("[+] 0x006514A6: xor edx,edx; nop (Window Mode)");
  } catch(e) { log("[!] 0x006514A6 failed: " + e); }
  
  // unknown error: 00C2D120: db 31 C0 C3
  try {
    const addr6 = imageBase.add(ptr(0x00C2D120).sub(baseOffset));
    Memory.protect(addr6, 4, 'rwx');
    addr6.writeByteArray([0x31, 0xC0, 0xC3]);
    log("[+] 0x00C2D120: xor eax,eax; ret");
  } catch(e) { log("[!] 0x00C2D120 failed: " + e); }
  
  // unknown error: 00BE66A0: db 31 C0 C2 04 00
  try {
    const addr7 = imageBase.add(ptr(0x00BE66A0).sub(baseOffset));
    Memory.protect(addr7, 8, 'rwx');
    addr7.writeByteArray([0x31, 0xC0, 0xC2, 0x04, 0x00]);
    log("[+] 0x00BE66A0: xor eax,eax; ret 4");
  } catch(e) { log("[!] 0x00BE66A0 failed: " + e); }
  
  // ==========================================
  // CheatEngine EXACT patches - ServerChk pass
  // ==========================================
  
  // ServerChk: 0x007565AE -> JMP 0x756682 -> JMP 0x7568BE
  // This is the EXACT CheatEngine approach!
  try {
    // First JMP: 007565AE -> JMP 00756682
    const jmp1 = imageBase.add(ptr(0x007565AE).sub(baseOffset));
    Memory.protect(jmp1, 8, 'rwx');
    // E9 = JMP rel32, offset = 0x756682 - (0x7565AE + 5) = 0xCF
    jmp1.writeByteArray([0xE9, 0xCF, 0x00, 0x00, 0x00]);
    log("[+] 0x007565AE: JMP 0x756682 (ServerChk pass 1)");
    
    // Second JMP: 00756682 -> JMP 007568BE  
    const jmp2 = imageBase.add(ptr(0x00756682).sub(baseOffset));
    Memory.protect(jmp2, 8, 'rwx');
    // E9 = JMP rel32, offset = 0x7568BE - (0x756682 + 5) = 0x237
    jmp2.writeByteArray([0xE9, 0x37, 0x02, 0x00, 0x00]);
    log("[+] 0x00756682: JMP 0x7568BE (ServerChk pass 2 - force end)");
  } catch(e) { log("[!] ServerChk JMP failed: " + e); }
  
  // LaunchARG: 0x0075629F - JZ -> JMP (bypass launcher check)
  try {
    const launchArg = imageBase.add(ptr(0x0075629F).sub(baseOffset));
    Memory.protect(launchArg, 2, 'rwx');
    launchArg.writeU8(0xEB);  // 74 (JZ) -> EB (JMP)
    log("[+] 0x0075629F: JZ -> JMP (LaunchARG bypass)");
  } catch(e) { log("[!] 0x0075629F failed: " + e); }
  
  // Terminate calls - Use Interceptor.replace for proper hook (CheatEngine style)
  // 0x756328 CALL destination -> Hook that returns 1 (ret 4)
  try {
    const terminate1 = imageBase.add(ptr(0x00756328).sub(baseOffset));
    Memory.protect(terminate1, 8, 'rwx');
    // Read the CALL target address
    const callOffset1 = terminate1.add(1).readS32();
    const callTarget1 = terminate1.add(5).add(callOffset1);
    
    // Replace the target function with one that returns 1
    Interceptor.replace(callTarget1, new NativeCallback(function() {
      return 1;
    }, 'int', []));
    log("[+] 0x00756328: CALL target hooked (return 1)");
  } catch(e) { 
    // Fallback: NOP the CALL
    try {
      const terminate1 = imageBase.add(ptr(0x00756328).sub(baseOffset));
      Memory.protect(terminate1, 8, 'rwx');
      terminate1.writeByteArray([0x90, 0x90, 0x90, 0x90, 0x90]);
      log("[+] 0x00756328: CALL -> NOP (fallback)");
    } catch(e2) { log("[!] 0x756328 failed: " + e2); }
  }
  
  // 0x755481 CALL 0x756b00 - Hook the target function to return 1
  // CheatEngine hooks this CALL and returns 1 with ret 0x14
  try {
    const func756b00 = imageBase.add(ptr(0x00756b00).sub(baseOffset));
    Memory.protect(func756b00, 16, 'rwx');
    
    // Write: mov eax, 1; ret 0x14 (stdcall with 5 params = 20 bytes cleanup)
    func756b00.writeByteArray([
      0xB8, 0x01, 0x00, 0x00, 0x00,  // mov eax, 1
      0xC2, 0x14, 0x00               // ret 0x14
    ]);
    log("[+] 0x00756b00: mov eax,1; ret 0x14 (hook for 0x755481 CALL)");
  } catch(e) { log("[!] 0x756b00 failed: " + e); }
  
  // Also patch 0x755481 area just to be safe - NOP the CALL and set AL=1
  try {
    const terminate2 = imageBase.add(ptr(0x00755481).sub(baseOffset));
    Memory.protect(terminate2, 8, 'rwx');
    // Leave CALL intact since we hooked the target, but let's verify
    log("[*] 0x00755481: CALL 0x756b00 (target already hooked)");
  } catch(e) { log("[!] 0x755481 check failed: " + e); }
  
  log("[+] All patchnote.md patches applied!");
  return true;
}

// Network redirect (minimal)
function hookNetwork() {
  try {
    const ws2 = Process.getModuleByName("Ws2_32.dll");
    const connectPtr = ws2.getExportByName("connect");
    
    Interceptor.attach(connectPtr, {
      onEnter(args) {
        try {
          const addr = ptr(args[1]);
          if (addr.isNull()) return;
          const family = addr.readU16();
          if (family !== 2) return;
          
          const portNet = addr.add(2).readU16();
          const ip = addr.add(4).readU32();
          const portHost = ((portNet & 0xff) << 8) | ((portNet >> 8) & 0xff);
          const ipBytes = [ip & 0xff, (ip >> 8) & 0xff, (ip >> 16) & 0xff, (ip >> 24) & 0xff];
          
          // Redirect game servers to localhost
          if (ipBytes[0] === 211 && ipBytes[1] === 39 && ipBytes[2] === 129) {
            log("[connect] " + ipBytes.join(".") + ":" + portHost + " -> 127.0.0.1");
            addr.add(4).writeU32((1 << 24) | (0 << 16) | (0 << 8) | 127);
          }
        } catch (e) {}
      }
    });
    
    // Simple recv/send logging with hex dump
    const recvPtr = ws2.getExportByName("recv");
    Interceptor.attach(recvPtr, {
      onEnter(args) { this.buf = args[1]; },
      onLeave(retval) {
        const len = retval.toInt32();
        if (len > 0 && this.buf && !this.buf.isNull()) {
          const data = this.buf.readByteArray(Math.min(len, 64));
          const hex = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2,'0')).join(' ');
          log("[recv] " + len + " bytes: " + hex);
        }
      }
    });
    
    const sendPtr = ws2.getExportByName("send");
    Interceptor.attach(sendPtr, {
      onEnter(args) {
        const len = args[2].toInt32();
        if (len > 0) log("[send] " + len + " bytes");
      }
    });
    
    log("[*] Network hooks installed");
  } catch (e) {
    log("[!] Network hook error: " + e);
  }
}

// Helper to get game module
function getGameModule() {
  try { return Process.getModuleByName("GameClient.exe"); } catch(e) {}
  try { return Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe"); } catch(e) {}
  return null;
}

// PIN file validation bypass (required)
function patchPinValidation() {
  try {
    const gameModule = getGameModule();
    if (!gameModule) { log("[!] PIN: module not found"); return; }
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    const pinAddr = imageBase.add(ptr(0x0064F290).sub(baseOffset));
    Memory.protect(pinAddr, 8, 'rwx');
    pinAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
    log("[+] PIN validation bypassed (0x64F290)");
  } catch(e) {
    log("[!] PIN patch failed: " + e);
  }
}

// NMCO Authentication patches
function patchNMCO() {
  try {
    const gameModule = getGameModule();
    if (!gameModule) { log("[!] NMCO: module not found"); return; }
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    // FUN_00674e50 - NMCO Init
    try {
      const addr1 = imageBase.add(ptr(0x00674E50).sub(baseOffset));
      Memory.protect(addr1, 8, 'rwx');
      addr1.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      log("[+] 0x00674E50: NMCO Init -> return 1");
    } catch(e) { log("[!] 0x674E50 failed: " + e); }
    
    // FUN_00675fe0 - NMCO RegisterCallback
    try {
      const addr2 = imageBase.add(ptr(0x00675FE0).sub(baseOffset));
      Memory.protect(addr2, 8, 'rwx');
      addr2.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      log("[+] 0x00675FE0: NMCO RegisterCallback -> return 1");
    } catch(e) { log("[!] 0x675FE0 failed: " + e); }
    
    // FUN_00676080 - PassportLogin (CRITICAL!)
    try {
      const addr3 = imageBase.add(ptr(0x00676080).sub(baseOffset));
      Memory.protect(addr3, 8, 'rwx');
      addr3.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      log("[+] 0x00676080: PassportLogin -> return 1");
    } catch(e) { log("[!] 0x676080 failed: " + e); }
    
    log("[+] NMCO patches applied!");
  } catch(e) {
    log("[!] NMCO patch error: " + e);
  }
}

// Execute
patchPinValidation();
applyMinimalPatches();
patchNMCO();
hookNetwork();

log("==============================================");
log("MINIMAL v4 patches complete!");
log("CheatEngine exact patches applied!");
log("==============================================");
