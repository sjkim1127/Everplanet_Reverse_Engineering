// EverPlanet Force Login Script
// Version 7.1 - PIN file validation bypass + Launcher check bypass + JNZ patch
//
// Strategy:
// 1. FUN_0064F290 (PIN file validation) - force return 1
// 2. wt.game_seed_info launcher check bypass
// 3. JNZ instructions to NOP for auth success path

// ==============================
// Timestamp utility
// ==============================
const startTime = Date.now();
function ts() {
  const elapsed = Date.now() - startTime;
  const ms = elapsed % 1000;
  const sec = Math.floor(elapsed / 1000) % 60;
  const min = Math.floor(elapsed / 60000);
  return `[${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}]`;
}

function log(msg) {
  console.log(ts() + " " + msg);
}

log("== EverPlanet Force Login v7.9 ==");
log("== serverChk func patch + Lobby Patches + PIN Bypass ==");

// ==============================
// Login Authentication Functions bypass
// FUN_00755280 - called from FUN_00750300, calls FUN_007554e0
// FUN_007554e0 - shows "cannot execute directly" MessageBox
// ==============================
function patchLoginAuthFunctions() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found for Login Auth patch!");
      return false;
    }
    
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    // =========================================
    // FUN_00755280 - Login wrapper called from main init
    // If patched to return 1, bypasses FUN_007554e0 entirely
    // IMPORTANT: Must use 'ret 4' (C2 04 00) for __stdcall!
    // =========================================
    const loginWrapperOffset = ptr(0x00755280).sub(baseOffset);
    const loginWrapperAddr = imageBase.add(loginWrapperOffset);
    log("[*] LoginWrapper (FUN_00755280) at: " + loginWrapperAddr);
    
    try {
      Memory.protect(loginWrapperAddr, 16, 'rwx');
      const originalBytes = loginWrapperAddr.readByteArray(8);
      log("[*] Original bytes at FUN_00755280: " + hexdump(originalBytes, {length: 8, header: false}));
      
      // mov eax, 1; ret 4 (B8 01 00 00 00 C2 04 00) - __stdcall!
      loginWrapperAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x04, 0x00]);
      
      const patchedBytes = loginWrapperAddr.readByteArray(8);
      log("[*] Patched FUN_00755280: " + hexdump(patchedBytes, {length: 8, header: false}));
      log("[+] LOGIN WRAPPER (FUN_00755280) PATCHED! Now always returns 1 (ret 4 for __stdcall)");
    } catch (e) {
      log("[!] Failed to patch FUN_00755280: " + e);
      
      // Fallback: Interceptor
      Interceptor.attach(loginWrapperAddr, {
        onEnter(args) {
          log("[LoginWrapper FUN_00755280] Called");
        },
        onLeave(retval) {
          log("[LoginWrapper FUN_00755280] Forcing return 1");
          retval.replace(ptr(1));
        }
      });
    }
    
    // =========================================
    // FUN_007554e0 - Login UI function that shows MessageBox
    // Double-patch for safety
    // =========================================
    const loginUIOffset = ptr(0x007554e0).sub(baseOffset);
    const loginUIAddr = imageBase.add(loginUIOffset);
    log("[*] LoginUI (FUN_007554e0) at: " + loginUIAddr);
    
    try {
      Memory.protect(loginUIAddr, 16, 'rwx');
      const originalBytes = loginUIAddr.readByteArray(6);
      log("[*] Original bytes at FUN_007554e0: " + hexdump(originalBytes, {length: 6, header: false}));
      
      // mov eax, 1; ret
      loginUIAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      
      const patchedBytes = loginUIAddr.readByteArray(6);
      log("[*] Patched FUN_007554e0: " + hexdump(patchedBytes, {length: 6, header: false}));
      log("[+] LOGIN UI (FUN_007554e0) PATCHED! Now always returns 1");
    } catch (e) {
      log("[!] Failed to patch FUN_007554e0: " + e);
      
      Interceptor.attach(loginUIAddr, {
        onEnter(args) {
          log("[LoginUI FUN_007554e0] Called");
        },
        onLeave(retval) {
          log("[LoginUI FUN_007554e0] Forcing return 1");
          retval.replace(ptr(1));
        }
      });
    }
    
    // =========================================
    // FUN_00674e50 - NMCO initialization (also checked in main init)
    // =========================================
    const nmcoInitOffset = ptr(0x00674e50).sub(baseOffset);
    const nmcoInitAddr = imageBase.add(nmcoInitOffset);
    log("[*] NMCOInit (FUN_00674e50) at: " + nmcoInitAddr);
    
    try {
      Memory.protect(nmcoInitAddr, 16, 'rwx');
      const originalBytes = nmcoInitAddr.readByteArray(6);
      log("[*] Original bytes at FUN_00674e50: " + hexdump(originalBytes, {length: 6, header: false}));
      
      // mov eax, 1; ret
      nmcoInitAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      
      const patchedBytes = nmcoInitAddr.readByteArray(6);
      log("[*] Patched FUN_00674e50: " + hexdump(patchedBytes, {length: 6, header: false}));
      log("[+] NMCO INIT (FUN_00674e50) PATCHED! Now always returns 1");
    } catch (e) {
      log("[!] Failed to patch FUN_00674e50: " + e);
      
      Interceptor.attach(nmcoInitAddr, {
        onEnter(args) {
          log("[NMCOInit FUN_00674e50] Called");
        },
        onLeave(retval) {
          log("[NMCOInit FUN_00674e50] Forcing return 1");
          retval.replace(ptr(1));
        }
      });
    }
    
    // =========================================
    // FUN_00675fe0 - NMCO init 2 (also checked)
    // =========================================
    const nmcoInit2Offset = ptr(0x00675fe0).sub(baseOffset);
    const nmcoInit2Addr = imageBase.add(nmcoInit2Offset);
    log("[*] NMCOInit2 (FUN_00675fe0) at: " + nmcoInit2Addr);
    
    try {
      Memory.protect(nmcoInit2Addr, 16, 'rwx');
      const originalBytes = nmcoInit2Addr.readByteArray(6);
      log("[*] Original bytes at FUN_00675fe0: " + hexdump(originalBytes, {length: 6, header: false}));
      
      // mov eax, 1; ret
      nmcoInit2Addr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      
      const patchedBytes = nmcoInit2Addr.readByteArray(6);
      log("[*] Patched FUN_00675fe0: " + hexdump(patchedBytes, {length: 6, header: false}));
      log("[+] NMCO INIT2 (FUN_00675fe0) PATCHED! Now always returns 1");
    } catch (e) {
      log("[!] Failed to patch FUN_00675fe0: " + e);
      
      Interceptor.attach(nmcoInit2Addr, {
        onEnter(args) {
          log("[NMCOInit2 FUN_00675fe0] Called");
        },
        onLeave(retval) {
          log("[NMCOInit2 FUN_00675fe0] Forcing return 1");
          retval.replace(ptr(1));
        }
      });
    }
    
    // =========================================
    // FUN_00676080 - Passport login check
    // If FUN_00673100 returns 0, this returns 1
    // Patch to always return 1
    // =========================================
    const passportLoginOffset = ptr(0x00676080).sub(baseOffset);
    const passportLoginAddr = imageBase.add(passportLoginOffset);
    log("[*] PassportLogin (FUN_00676080) at: " + passportLoginAddr);
    
    try {
      Memory.protect(passportLoginAddr, 16, 'rwx');
      const originalBytes = passportLoginAddr.readByteArray(6);
      log("[*] Original bytes at FUN_00676080: " + hexdump(originalBytes, {length: 6, header: false}));
      
      // mov eax, 1; ret
      passportLoginAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      
      const patchedBytes = passportLoginAddr.readByteArray(6);
      log("[*] Patched FUN_00676080: " + hexdump(patchedBytes, {length: 6, header: false}));
      log("[+] PASSPORT LOGIN (FUN_00676080) PATCHED! Now always returns 1");
    } catch (e) {
      log("[!] Failed to patch FUN_00676080: " + e);
      
      Interceptor.attach(passportLoginAddr, {
        onEnter(args) {
          log("[PassportLogin FUN_00676080] Called");
        },
        onLeave(retval) {
          log("[PassportLogin FUN_00676080] Forcing return 1");
          retval.replace(ptr(1));
        }
      });
    }
    
    log("[+] All login auth functions patched!");
    return true;
  } catch (e) {
    log("[!] patchLoginAuthFunctions error: " + e);
    return false;
  }
};

// ==============================
// PIN file validation bypass (CRITICAL!)
// FUN_0064F290 - GameClient.pin validation function
// On failure: MessageBox "Cannot open a pin-file" then return 0
// On success: return 1
// => Patch function entry to return 1 immediately
// ==============================
function patchPinValidation() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found for PIN patch!");
      return false;
    }
    
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    // FUN_0064F290 - PIN file validation function address
    const pinValidationOffset = ptr(0x0064F290).sub(baseOffset);
    const pinValidationAddr = imageBase.add(pinValidationOffset);
    log("[*] PIN Validation (FUN_0064F290) at: " + pinValidationAddr);
    
    // Method 1: Patch function entry to return 1 (mov eax, 1; ret)
    // x86: B8 01 00 00 00 C3
    try {
      Memory.protect(pinValidationAddr, 16, 'rwx');
      
      // Backup original bytes
      const originalBytes = pinValidationAddr.readByteArray(6);
      log("[*] Original bytes at FUN_0064F290: " + hexdump(originalBytes, {length: 6, header: false}));
      
      // mov eax, 1 (B8 01 00 00 00) + ret (C3)
      pinValidationAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);
      
      const patchedBytes = pinValidationAddr.readByteArray(6);
      log("[*] Patched bytes: " + hexdump(patchedBytes, {length: 6, header: false}));
      log("[+] PIN VALIDATION BYPASSED! FUN_0064F290 now always returns 1");
      
      return true;
    } catch (e) {
      log("[!] Direct patch failed: " + e);
      
      // Method 2: Use Interceptor to force return value
      log("[*] Trying Interceptor method...");
      Interceptor.attach(pinValidationAddr, {
        onEnter(args) {
          log("[PIN_Validation] GameClient.pin check called");
        },
        onLeave(retval) {
          log("[PIN_Validation] Original return: " + retval);
          log("[PIN_Validation] FORCING return 1 (SUCCESS)");
          retval.replace(ptr(1));
        }
      });
      return true;
    }
  } catch (e) {
    log("[!] patchPinValidation error: " + e);
    return false;
  }
}

// ==============================
// Launcher check bypass (wt.game_seed_info)
// ==============================
function bypassLauncherCheck() {
  try {
    const kernel32 = Process.getModuleByName("kernel32.dll");
    
    // Hook CreateFileW - detect seed_info file access
    const createFileW = kernel32.getExportByName("CreateFileW");
    Interceptor.attach(createFileW, {
      onEnter(args) {
        try {
          const fileName = args[0].readUtf16String();
          if (fileName && (fileName.includes("seed_info") || fileName.includes(".pin"))) {
            log("[CreateFileW] Launcher check file: " + fileName);
            this.isLauncherCheck = true;
          }
        } catch(e) {}
      },
      onLeave(retval) {
        if (this.isLauncherCheck) {
          log("[CreateFileW] Launcher check - handle: " + retval);
        }
      }
    });
    
    // Hook ReadFile - read seed_info data
    const readFile = kernel32.getExportByName("ReadFile");
    Interceptor.attach(readFile, {
      onEnter(args) {
        this.buffer = args[1];
        this.bytesToRead = args[2].toInt32();
      }
    });
    
    // Block ExitProcess completely - prevent exit on launcher check failure
    const exitProcess = kernel32.getExportByName("ExitProcess");
    Interceptor.replace(exitProcess, new NativeCallback(function(exitCode) {
      log("[ExitProcess] BLOCKED! Exit code: " + exitCode);
      log("[ExitProcess] Game will continue running...");
      // Don't exit, just block in infinite loop
      while(true) {
        Thread.sleep(1000);
      }
    }, 'void', ['uint']));
    
    // Hook GetCommandLineW - inject launcher arguments
    const getCommandLineW = kernel32.getExportByName("GetCommandLineW");
    
    Interceptor.attach(getCommandLineW, {
      onLeave(retval) {
        try {
          const original = retval.readUtf16String();
          if (original && !original.includes("/LauncherAuth") && !original.includes("-GameID")) {
            log("[GetCommandLineW] Original: " + original);
            const newCmdLine = original + " /LauncherAuth /GameID=1234567890";
            log("[GetCommandLineW] Injecting launcher args: " + newCmdLine);
            this.newCmd = Memory.allocUtf16String(newCmdLine);
            retval.replace(this.newCmd);
          }
        } catch (e) {
          log("[!] GetCommandLineW hook error: " + e);
        }
      }
    });
    
    log("[*] Launcher bypass installed");
  } catch (e) {
    log("[!] bypassLauncherCheck error: " + e);
  }
}

// ==============================
// Network redirect (Ws2_32.dll)
// ==============================
function hookNetwork() {
  try {
    const ws2 = Process.getModuleByName("Ws2_32.dll");
    log("[*] Ws2_32.dll base: " + ws2.base);

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
          const ipBytes = [
            ip & 0xff,
            (ip >> 8) & 0xff,
            (ip >> 16) & 0xff,
            (ip >> 24) & 0xff
          ];
          
          // Redirect all Nexon-related IPs to localhost
          const isNexonAuth = (ipBytes[0] === 183 && ipBytes[1] === 110);
          const isGameServer = (ipBytes[0] === 211 && ipBytes[1] === 39 && ipBytes[2] === 129);
          
          if (isNexonAuth || isGameServer) {
            log("[connect] " + ipBytes.join(".") + ":" + portHost + " -> 127.0.0.1");
            const newIpVal = (1 << 24) | (0 << 16) | (0 << 8) | 127;
            addr.add(4).writeU32(newIpVal);
          }
        } catch (e) {
          log("[connect] error: " + e);
        }
      }
    });

    // Hook recv
    const recvPtr = ws2.getExportByName("recv");
    Interceptor.attach(recvPtr, {
      onEnter(args) {
        this.buf = args[1];
      },
      onLeave(retval) {
        try {
          const len = retval.toInt32();
          if (len <= 0) return;
          const buf = this.buf;
          if (!buf || buf.isNull()) return;
          const bytes = [];
          for (let i = 0; i < Math.min(len, 64); i++) {
            bytes.push(('0' + buf.add(i).readU8().toString(16)).slice(-2));
          }
          log("[recv] " + len + " bytes: " + bytes.join(' ') + (len > 64 ? "..." : ""));
        } catch (e) {}
      }
    });

    // Hook send
    const sendPtr = ws2.getExportByName("send");
    Interceptor.attach(sendPtr, {
      onEnter(args) {
        try {
          const buf = args[1];
          const len = args[2].toInt32();
          if (!buf || buf.isNull() || len <= 0) return;
          const bytes = [];
          for (let i = 0; i < Math.min(len, 64); i++) {
            bytes.push(('0' + buf.add(i).readU8().toString(16)).slice(-2));
          }
          log("[send] " + len + " bytes: " + bytes.join(' ') + (len > 64 ? "..." : ""));
        } catch (e) {}
      }
    });

    log("[*] Network hooks installed");
  } catch (e) {
    log("[!] hookNetwork error: " + e);
  }
}

// ==============================
// Core: JNZ instruction patch + FUN_00673100 return value patch
// ==============================
function patchAuthCheck() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found!");
      return;
    }
    
    const imageBase = gameModule.base;
    log("[*] Game module at: " + imageBase);
    
    // Binary base address: 0x00400000
    const baseOffset = ptr(0x00400000);
    
    // =========================================
    // Method 1: Force FUN_00673100 return value to 0
    // =========================================
    const fn00673100_offset = ptr(0x00673100).sub(baseOffset);
    const fn00673100_addr = imageBase.add(fn00673100_offset);
    log("[*] FUN_00673100 at: " + fn00673100_addr);
    
    Interceptor.attach(fn00673100_addr, {
      onEnter(args) {
        log("[FUN_00673100] NMCO Auth check called");
      },
      onLeave(retval) {
        log("[FUN_00673100] Original return: " + retval);
        // 0 = auth success
        log("[FUN_00673100] PATCHING return value to 0 (SUCCESS)");
        retval.replace(ptr(0));
      }
    });
    
    // =========================================
    // Method 2: Patch JNZ instruction to NOP
    // 006760c0: 75 10 = JNZ +0x10
    // => 90 90 = NOP NOP
    // =========================================
    const jnz_offset = ptr(0x006760c0).sub(baseOffset);
    const jnz_addr = imageBase.add(jnz_offset);
    log("[*] JNZ instruction at: " + jnz_addr);
    
    // Check current bytes
    const currentBytes = jnz_addr.readByteArray(2);
    log("[*] Current bytes at JNZ: " + hexdump(currentBytes, {length: 2, header: false}));
    
    // Change memory protection and patch
    try {
      Memory.protect(jnz_addr, 2, 'rwx');
      jnz_addr.writeByteArray([0x90, 0x90]); // NOP NOP
      log("[*] JNZ PATCHED to NOP NOP!");
      
      const patchedBytes = jnz_addr.readByteArray(2);
      log("[*] Patched bytes: " + hexdump(patchedBytes, {length: 2, header: false}));
    } catch (e) {
      log("[!] Failed to patch JNZ: " + e);
      log("[!] Will rely on Interceptor method instead");
    }
    
    // =========================================
    // Hook FUN_00676080 (success confirmation)
    // =========================================
    const fn00676080_offset = ptr(0x00676080).sub(baseOffset);
    const fn00676080_addr = imageBase.add(fn00676080_offset);
    
    Interceptor.attach(fn00676080_addr, {
      onEnter(args) {
        log("[FUN_00676080] Login check function called!");
        this.param1 = args[0];
      },
      onLeave(retval) {
        log("[FUN_00676080] Return: " + retval);
        // success = 1
        if (retval.toInt32() !== 1) {
          log("[FUN_00676080] FORCING SUCCESS (return 1)");
          retval.replace(ptr(1));
        }
      }
    });
    
    // =========================================
    // Patch FUN_00676180, FUN_00676290 same pattern
    // =========================================
    const relatedFuncs = [
      { addr: 0x00676180, jnz: 0x006761c0 },
      { addr: 0x00676290, jnz: 0x006762d0 }
    ];
    
    for (const func of relatedFuncs) {
      const funcOffset = ptr(func.addr).sub(baseOffset);
      const funcAddr = imageBase.add(funcOffset);
      
      Interceptor.attach(funcAddr, {
        onEnter(args) {
          log("[FUN_" + func.addr.toString(16) + "] Called");
        },
        onLeave(retval) {
          if (retval.toInt32() !== 1) {
            log("[FUN_" + func.addr.toString(16) + "] Forcing return 1");
            retval.replace(ptr(1));
          }
        }
      });
      
      // Patch JNZ
      const jnzOffset = ptr(func.jnz).sub(baseOffset);
      const jnzAddr = imageBase.add(jnzOffset);
      try {
        Memory.protect(jnzAddr, 2, 'rwx');
        jnzAddr.writeByteArray([0x90, 0x90]);
        log("[*] Patched JNZ at 0x" + func.jnz.toString(16));
      } catch (e) {
        log("[!] Failed to patch 0x" + func.jnz.toString(16) + ": " + e);
      }
    }
    
    log("[*] Auth check patches installed");
  } catch (e) {
    log("[!] patchAuthCheck error: " + e);
  }
}

// ==============================
// NMCO_CallNMFunc wrapper (FUN_00672220) patch
// ==============================
function patchNmcoCallResult() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found!");
      return;
    }
    
    const imageBase = gameModule.base;
    log("[*] Game module at: " + imageBase);
    
    const baseOffset = ptr(0x00400000);
    
    // FUN_00672220 - wrapper that calls NMCO_CallNMFunc
    const nmcoWrapperOffset = ptr(0x00672220).sub(ptr(0x00400000));
    const nmcoWrapperAddr = imageBase.add(nmcoWrapperOffset);
    
    log("[*] NMCO Wrapper (FUN_00672220) at: " + nmcoWrapperAddr);
    
    Interceptor.attach(nmcoWrapperAddr, {
      onEnter(args) {
        log("[NMCO_Wrapper] Called! param_1: " + args[0] + " param_2: " + args[1]);
        this.param1 = args[0];
        this.param2 = args[1];
      },
      onLeave(retval) {
        log("[NMCO_Wrapper] Original return value: " + retval);
        
        // Force return 1 for success
        if (this.param2 && !this.param2.isNull()) {
          log("[NMCO_Wrapper] FORCING SUCCESS! Setting return to 1");
          retval.replace(ptr(1));
        }
      }
    });
    
    // Hook FUN_006734e0 (login virtual function call)
    const loginVirtualOffset = ptr(0x006734e0).sub(ptr(0x00400000));
    const loginVirtualAddr = imageBase.add(loginVirtualOffset);
    
    log("[*] LoginVirtual (FUN_006734e0) at: " + loginVirtualAddr);
    
    Interceptor.attach(loginVirtualAddr, {
      onEnter(args) {
        log("[LoginVirtual] Called with param_1: " + args[0] + " param_2: " + args[1]);
      }
    });
    
    // Hook FUN_00676840 (LoginWrapper) to check flow
    const loginWrapperOffset = ptr(0x00676840).sub(ptr(0x00400000));
    const loginWrapperAddr = imageBase.add(loginWrapperOffset);
    
    Interceptor.attach(loginWrapperAddr, {
      onEnter(args) {
        log("[LoginWrapper] Called!");
      }
    });
    
    // Hook success path (FUN_00676b50)
    const successPathOffset = ptr(0x00676b50).sub(ptr(0x00400000));
    const successPathAddr = imageBase.add(successPathOffset);
    
    Interceptor.attach(successPathAddr, {
      onEnter(args) {
        log("[SUCCESS] Login SUCCESS path reached!");
      }
    });
    
    // Hook MessageBoxW - check error messages and block
    const user32 = Process.getModuleByName("user32.dll");
    const msgBoxPtr = user32.getExportByName("MessageBoxW");
    
    // Pre-allocate empty string
    const emptyString = Memory.allocUtf16String("");
    
    Interceptor.attach(msgBoxPtr, {
      onEnter(args) {
        try {
          const text = args[1].readUtf16String();
          const caption = args[2].readUtf16String();
          log("[MessageBox] " + caption + ": " + text);
          
          // Block "direct execution" messages
          if (text && (text.includes("directly") || text.includes("Launch") || text.includes("\uC9C1\uC811"))) {
            log("[MessageBox] BLOCKED - Launcher check bypass!");
            this.blocked = true;
            // Replace arguments with empty string
            args[1] = emptyString;
            args[2] = emptyString;
          }
        } catch(e) {
          log("[MessageBox] Error reading text: " + e);
        }
      },
      onLeave(retval) {
        // Return IDOK (1)
        retval.replace(ptr(1));
      }
    });
    
    // Patch ExitProcess - prevent exit
    const kernel32 = Process.getModuleByName("kernel32.dll");
    const exitProcessPtr = kernel32.getExportByName("ExitProcess");
    
    Interceptor.attach(exitProcessPtr, {
      onEnter(args) {
        const exitCode = args[0].toInt32();
        log("[ExitProcess] Called with code: " + exitCode);
        
        // Block exit due to launcher check failure
        if (exitCode !== 0) {
          log("[ExitProcess] BLOCKING non-zero exit! Replacing with infinite sleep...");
        }
      }
    });
    
    log("[*] Login patches installed");
  } catch (e) {
    log("[!] patchNmcoCallResult error: " + e);
  }
}

// ==============================
// nmcogame.dll direct patch
// ==============================
function patchNmcogame() {
  try {
    const nmco = Process.getModuleByName("nmcogame.dll");
    if (!nmco) {
      log("[!] nmcogame.dll not loaded yet, will retry...");
      setTimeout(patchNmcogame, 1000);
      return;
    }
    
    log("[*] nmcogame.dll found at: " + nmco.base);
    
    // Find NMCO_CallNMFunc export
    const callNMFunc = nmco.getExportByName("NMCO_CallNMFunc");
    if (callNMFunc) {
      log("[*] NMCO_CallNMFunc at: " + callNMFunc);
      
      Interceptor.attach(callNMFunc, {
        onEnter(args) {
          log("[NMCO_CallNMFunc] Called!");
          log("  arg0: " + args[0]);
          log("  arg1: " + args[1]);
          log("  arg2: " + args[2]);
          log("  arg3: " + args[3]);
          
          // Analyze arguments
          if (args[1] && !args[1].isNull()) {
            const magic1 = args[1].readU32();
            log("  [arg1] magic: " + magic1.toString(16));
          }
        },
        onLeave(retval) {
          log("[NMCO_CallNMFunc] Returned: " + retval);
          // return 1 = success
          log("[NMCO_CallNMFunc] FORCING return=1");
          retval.replace(ptr(1));
        }
      });
    }
    
    log("[*] nmcogame.dll patches installed");
  } catch (e) {
    log("[!] patchNmcogame error: " + e);
  }
}

// ==============================
// FUN_00673240 (GetNexonPassport) patch
// Return fake passport string
// ==============================
function patchPassportFunc() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found for passport patch!");
      return;
    }
    
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    // FUN_00673240 - CNMGetNexonPassportFunc call
    const getPassportOffset = ptr(0x00673240).sub(baseOffset);
    const getPassportAddr = imageBase.add(getPassportOffset);
    log("[*] GetNexonPassport (FUN_00673240) at: " + getPassportAddr);
    
    // Fake passport string (unicode)
    const passportStr = "NPP1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF";
    
    Interceptor.attach(getPassportAddr, {
      onEnter(args) {
        // EDI register is output buffer (callee-saved, set by caller)
        this.outBuffer = this.context.edi;
        log("[GetNexonPassport] Called, EDI (output buffer): " + this.outBuffer);
      },
      onLeave(retval) {
        log("[GetNexonPassport] Original return: " + retval);
        
        // Write fake passport to EDI buffer (wchar_t format)
        if (this.outBuffer && !this.outBuffer.isNull()) {
          try {
            this.outBuffer.writeUtf16String(passportStr);
            log("[GetNexonPassport] Wrote fake passport to EDI buffer");
            
            // Set EDI as return value (on success returns EDI)
            retval.replace(this.outBuffer);
            log("[GetNexonPassport] Return forced to: " + this.outBuffer);
          } catch(e) {
            log("[GetNexonPassport] Write failed: " + e);
          }
        } else {
          log("[GetNexonPassport] No output buffer available");
        }
      }
    });
    
    // FUN_00672220 - NMCO_CallNMFunc wrapper patch (force return 1)
    const nmcoWrapperOffset = ptr(0x00672220).sub(baseOffset);
    const nmcoWrapperAddr = imageBase.add(nmcoWrapperOffset);
    log("[*] NMCO Wrapper (FUN_00672220) at: " + nmcoWrapperAddr);
    
    Interceptor.attach(nmcoWrapperAddr, {
      onEnter(args) {
        log("[NMCOWrapper] Called");
        this.param1 = args[0];
        this.param2 = args[1];
        
        // Check func ID at second argument
        if (args[1] && !args[1].isNull()) {
          try {
            const offset_0x18 = args[1].add(0x18).readU32();
            log("[NMCOWrapper] param2+0x18 (func ID): " + offset_0x18.toString(16));
          } catch(e) {}
        }
      },
      onLeave(retval) {
        log("[NMCOWrapper] Original return: " + retval);
        // Return 1 for passport request (0x2105)
        log("[NMCOWrapper] Forcing return=1");
        retval.replace(ptr(1));
      }
    });
    
    // FUN_006763a0 - get passport (uses FUN_00673240 result)
    const getPassport2Offset = ptr(0x006763a0).sub(baseOffset);
    const getPassport2Addr = imageBase.add(getPassport2Offset);
    log("[*] GetPassport2 (FUN_006763a0) at: " + getPassport2Addr);
    
    Interceptor.attach(getPassport2Addr, {
      onEnter(args) {
        this.outPtr = args[0];
        log("[GetPassport2] Called, output ptr: " + args[0]);
      },
      onLeave(retval) {
        log("[GetPassport2] Return: " + retval);
        // Check result string
        if (this.outPtr && !this.outPtr.isNull()) {
          try {
            const strPtr = this.outPtr.readPointer();
            if (strPtr && !strPtr.isNull()) {
              const str = strPtr.readUtf16String();
              log("[GetPassport2] Result string: " + (str ? str.substring(0, 50) : "(null)"));
            }
          } catch(e) {}
        }
      }
    });
    
    log("[*] Passport patches installed");
  } catch (e) {
    log("[!] patchPassportFunc error: " + e);
  }
}

// ==============================
// Lobby Patches (from EverPlanet_KR_v1842_L.exe diff analysis)
// These patches were found by comparing original and lobby-patched exe
// ==============================
function applyLobbyPatches() {
  try {
    const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
    if (!gameModule) {
      log("[!] Game module not found for Lobby patches!");
      return false;
    }
    
    const imageBase = gameModule.base;
    const baseOffset = ptr(0x00400000);
    
    log("[*] Applying Lobby patches from L.exe analysis...");
    
    // Patch 1: 0x0075057B - JNZ -> JMP (웹 런처 체크 우회)
    const addr1 = imageBase.add(ptr(0x0075057B).sub(baseOffset));
    try {
      Memory.protect(addr1, 1, 'rwx');
      const orig1 = addr1.readU8();
      addr1.writeU8(0xEB);  // JNZ(75) -> JMP(EB)
      log("[+] 0x0075057B: " + orig1.toString(16) + " -> EB (JNZ->JMP) - WebLauncher bypass");
    } catch(e) { log("[!] Patch 0x0075057B failed: " + e); }
    
    // Patch 2: 0x007549D0 - function -> xor eax,eax; ret (return 0)
    const addr2 = imageBase.add(ptr(0x007549D0).sub(baseOffset));
    try {
      Memory.protect(addr2, 4, 'rwx');
      addr2.writeByteArray([0x31, 0xC0, 0xC3, 0x90]);  // xor eax,eax; ret; nop
      log("[+] 0x007549D0: patched -> xor eax,eax; ret");
    } catch(e) { log("[!] Patch 0x007549D0 failed: " + e); }
    
    // Patch 3: 0x007551F0 - function -> mov eax,1; ret (return 1)
    const addr3 = imageBase.add(ptr(0x007551F0).sub(baseOffset));
    try {
      Memory.protect(addr3, 6, 'rwx');
      addr3.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3]);  // mov eax,1; ret
      log("[+] 0x007551F0: patched -> mov eax,1; ret");
    } catch(e) { log("[!] Patch 0x007551F0 failed: " + e); }
    
    // Patch 4: 0x00755280 - already patched by patchLoginAuthFunctions()
    // But L.exe uses ret 4, so update it
    const addr4 = imageBase.add(ptr(0x00755280).sub(baseOffset));
    try {
      Memory.protect(addr4, 8, 'rwx');
      addr4.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x04, 0x00]);  // mov eax,1; ret 4
      log("[+] 0x00755280: patched -> mov eax,1; ret 4 (updated)");
    } catch(e) { log("[!] Patch 0x00755280 failed: " + e); }
    
    // Patch 5: 0x00BE66A0 - function -> xor eax,eax; ret 4 (return 0)
    const addr5 = imageBase.add(ptr(0x00BE66A0).sub(baseOffset));
    try {
      Memory.protect(addr5, 5, 'rwx');
      addr5.writeByteArray([0x31, 0xC0, 0xC2, 0x04, 0x00]);  // xor eax,eax; ret 4
      log("[+] 0x00BE66A0: patched -> xor eax,eax; ret 4");
    } catch(e) { log("[!] Patch 0x00BE66A0 failed: " + e); }
    
    // Patch 6: 0x00C2D120 - function -> xor eax,eax; ret (return 0)
    const addr6 = imageBase.add(ptr(0x00C2D120).sub(baseOffset));
    try {
      Memory.protect(addr6, 3, 'rwx');
      addr6.writeByteArray([0x31, 0xC0, 0xC3]);  // xor eax,eax; ret
      log("[+] 0x00C2D120: patched -> xor eax,eax; ret");
    } catch(e) { log("[!] Patch 0x00C2D120 failed: " + e); }
    
    // Patch 7: 0x006514A6 - Window Mode (8A 51 10 -> 33 D2 90)
    // patchnote.md: 006514A6 db 33 D2 90
    const addr7 = imageBase.add(ptr(0x006514A6).sub(baseOffset));
    try {
      Memory.protect(addr7, 3, 'rwx');
      addr7.writeByteArray([0x33, 0xD2, 0x90]);  // xor edx,edx; nop
      log("[+] 0x006514A6: patched -> xor edx,edx; nop (Window Mode)");
    } catch(e) { log("[!] Patch 0x006514A6 failed: " + e); }
    
    log("[+] All Lobby patches applied!");
    return true;
  } catch (e) {
    log("[!] applyLobbyPatches error: " + e);
    return false;
  }
}

// ==============================
// CheatEngine Script Patches (CRITICAL for lobby entry without server!)
// These patches allow lobby entry WITHOUT needing server responses
// ==============================
function applyCheatEnginePatches() {
  log("[*] Applying CheatEngine patches (serverChk bypass)...");
  
  const gameModule = Process.getModuleByName("EverPlanet_KR_v1842_U_DEVM.exe");
  if (!gameModule) {
    log("[!] Game module not found for CE patches");
    return false;
  }
  
  const imageBase = gameModule.base;
  const baseOffset = ptr(0x00400000);
  
  try {
    // =========================================
    // Patch 1: FUN_007564a0 - serverChk function
    // This function checks [DAT_00e89a28+0x88]+0x1c == 2
    // If not 2, shows MessageBox and terminates
    // SAFER: Patch entire function to return 1
    // =========================================
    const serverChkFuncAddr = imageBase.add(ptr(0x007564a0).sub(baseOffset));
    try {
      Memory.protect(serverChkFuncAddr, 16, 'rwx');
      const orig = serverChkFuncAddr.readByteArray(8);
      log("[*] serverChk func (0x7564A0) original: " + hexdump(orig, {length: 8, header: false}));
      
      // Patch to: mov eax, 1; ret 0xC (this function uses ret 0xC at end)
      // B8 01 00 00 00 C2 0C 00
      serverChkFuncAddr.writeByteArray([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x0C, 0x00]);
      log("[+] 0x007564A0: serverChk func -> mov eax,1; ret 0xC");
    } catch(e) { log("[!] Patch 0x7564A0 failed: " + e); }
    
    // =========================================
    // Patch 2: 0x0075629F - LaunchARG
    // Original: 74 xx (JZ short) - but log shows 74, need to check offset
    // CheatEngine: force jump (74 -> EB makes it JMP)
    // =========================================
    const launchArgAddr = imageBase.add(ptr(0x0075629F).sub(baseOffset));
    try {
      Memory.protect(launchArgAddr, 4, 'rwx');
      const orig = launchArgAddr.readU8();
      log("[*] LaunchARG (0x75629F) original: " + orig.toString(16));
      launchArgAddr.writeU8(0xEB);  // JZ -> JMP short
      log("[+] 0x0075629F: LaunchARG -> JZ to JMP (74->EB)");
    } catch(e) { log("[!] Patch 0x75629F failed: " + e); }
    
    // =========================================
    // Patch 3: 0x00756328 - Terminate hook
    // Original: e8 f3 55 00 00 (CALL - 5 bytes!)
    // Must NOP all 5 bytes!
    // =========================================
    const terminateAddr = imageBase.add(ptr(0x00756328).sub(baseOffset));
    try {
      Memory.protect(terminateAddr, 8, 'rwx');
      const orig = terminateAddr.readByteArray(6);
      log("[*] Terminate (0x756328) original: " + hexdump(orig, {length: 6, header: false}));
      // NOP the entire 5-byte CALL instruction
      terminateAddr.writeByteArray([0x90, 0x90, 0x90, 0x90, 0x90]);  // 5x NOP
      log("[+] 0x00756328: Terminate CALL -> NOPed (5 bytes)");
    } catch(e) { log("[!] Patch 0x756328 failed: " + e); }
    
    // =========================================
    // Patch 4: 0x00755481 - Terminate(serverCHK)
    // Original: e8 7a 16 00 00 (CALL - 5 bytes!)
    // Must NOP all 5 bytes!
    // =========================================
    const serverChk2Addr = imageBase.add(ptr(0x00755481).sub(baseOffset));
    try {
      Memory.protect(serverChk2Addr, 8, 'rwx');
      const orig = serverChk2Addr.readByteArray(6);
      log("[*] Terminate/serverCHK (0x755481) original: " + hexdump(orig, {length: 6, header: false}));
      // NOP the entire 5-byte CALL instruction
      serverChk2Addr.writeByteArray([0x90, 0x90, 0x90, 0x90, 0x90]);  // 5x NOP
      log("[+] 0x00755481: Terminate(serverCHK) CALL -> NOPed (5 bytes)");
    } catch(e) { log("[!] Patch 0x755481 failed: " + e); }
    
    log("[+] All CheatEngine patches applied!");
    return true;
  } catch (e) {
    log("[!] applyCheatEnginePatches error: " + e);
    return false;
  }
}

// ==============================
// Main execution
// ==============================

// Monitor process termination to find crash source
function hookTermination() {
  try {
    const kernel32 = Process.getModuleByName("kernel32.dll");
    
    // Hook ExitProcess
    const exitProcess = kernel32.getExportByName("ExitProcess");
    Interceptor.attach(exitProcess, {
      onEnter(args) {
        log("[!] ExitProcess called! Exit code: " + args[0]);
        log("[!] Stack trace:");
        log(Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n'));
      }
    });
    
    // Hook TerminateProcess
    const terminateProcess = kernel32.getExportByName("TerminateProcess");
    Interceptor.attach(terminateProcess, {
      onEnter(args) {
        log("[!] TerminateProcess called! Handle: " + args[0] + ", Exit code: " + args[1]);
        log("[!] Stack trace:");
        log(Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n'));
      }
    });
    
    log("[*] Termination hooks installed");
  } catch (e) {
    log("[!] hookTermination error: " + e);
  }
}

hookTermination(); // Monitor crashes
applyCheatEnginePatches(); // CheatEngine patches FIRST (critical!)
patchPinValidation(); // PIN file validation bypass
patchLoginAuthFunctions(); // Login auth functions bypass (SECOND!)
applyLobbyPatches();  // Lobby patches from L.exe analysis (NEW!)
bypassLauncherCheck(); // Launcher check bypass
hookNetwork();
patchAuthCheck();     // JNZ patches
patchNmcoCallResult();
patchPassportFunc();  // passport function patch

// nmcogame.dll may be loaded later, so delay
setTimeout(patchNmcogame, 2000);

log("==============================================");
log("Force Login v7.9 patches installed!");
log("- serverChk func (0x7564A0) -> return 1 (FULL FUNCTION PATCH)");
log("- PIN file validation bypassed (FUN_0064F290 -> return 1)");
log("- Login auth functions bypassed");
log("- Lobby patches from L.exe applied (NEW!)");
log("- Launcher check bypass");
log("- JNZ instructions patched to NOP");
log("- FUN_00673100 return forced to 0");
log("- FUN_00673240 passport forced");
log("- NMCO_CallNMFunc return forced to 1");
log("==============================================");
