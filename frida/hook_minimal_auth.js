// EverPlanet Auth Bypass v3.0 - Binary Search for problematic patches
// ES5 compatible
//
// Based on task-559 log analysis:
// - Without Lobby patches: game calls NMCO 0xf012/0xf011 then ExitProcess(1)
// - With ALL Lobby patches: game reaches 3431 but sends patcher protocol
//
// Strategy: Add Lobby patches one by one to find which one triggers Patch... screen
//
// This version: FIRST HALF of lobby patches only
// Patches included: 0x0075057B, 0x00755280, 0x007551F0
// Patches excluded: 0x007549D0, 0x00BE66A0, 0x00C2D120, 0x006514A6

var startTime = Date.now();
function ts() {
  var e = Date.now() - startTime;
  var ms = e % 1000;
  var sec = Math.floor(e / 1000) % 60;
  var min = Math.floor(e / 60000);
  return '[' + ('0'+min).slice(-2) + ':' + ('0'+sec).slice(-2) + '.' + ('00'+ms).slice(-3) + ']';
}
function log(msg) { console.log(ts() + ' ' + msg); }

log('=== Auth Bypass v3.0 - Lobby Patch Binary Search ===');
log('  Testing: 0x0075057B + 0x00755280 + 0x007551F0');
log('  Excluded: 0x007549D0 + 0x00BE66A0 + 0x00C2D120');

var gameModule = Process.getModuleByName('EverPlanet_KR_v1842_U_DEVM.exe');
var imageBase = gameModule.base;
var baseOffset = ptr(0x00400000);

function rva(va) { return imageBase.add(ptr(va).sub(baseOffset)); }

// ── MessageBoxW replace ──────────────────────────────────
var user32 = Process.getModuleByName('user32.dll');
Interceptor.replace(user32.getExportByName('MessageBoxW'), new NativeCallback(function(hwnd, text, caption, type) {
  try { log('[MessageBox] BLOCKED: ' + ptr(caption).readUtf16String() + ' -> ' + ptr(text).readUtf16String().substring(0, 80)); } catch(e) {}
  return 1;
}, 'int', ['pointer', 'pointer', 'pointer', 'uint']));
log('[+] MessageBoxW blocked');

// ── ExitProcess + TerminateProcess block ─────────────────
var kernel32 = Process.getModuleByName('kernel32.dll');

Interceptor.replace(kernel32.getExportByName('ExitProcess'), new NativeCallback(function(code) {
  log('[ExitProcess] BLOCKED code=' + code);
  // Log backtrace if possible
  Thread.sleep(999999);
}, 'void', ['uint']));

Interceptor.replace(kernel32.getExportByName('TerminateProcess'), new NativeCallback(function(hProc, code) {
  log('[TerminateProcess] BLOCKED hProc=' + hProc + ' code=' + code);
  Thread.sleep(999999);
  return 1;
}, 'int', ['pointer', 'uint']));
log('[+] ExitProcess + TerminateProcess blocked');

// ── GetCommandLineW ──────────────────────────────────────
Interceptor.attach(kernel32.getExportByName('GetCommandLineW'), {
  onLeave: function(retval) {
    try {
      var orig = retval.readUtf16String();
      if (orig && orig.indexOf('/LauncherAuth') === -1) {
        this.cmd = Memory.allocUtf16String(orig + ' /LauncherAuth /GameID=1234567890');
        retval.replace(this.cmd);
      }
    } catch(e) {}
  }
});
log('[+] GetCommandLineW hooked');

// ── Network hooks ────────────────────────────────────────
var ws2 = Process.getModuleByName('Ws2_32.dll');
Interceptor.attach(ws2.getExportByName('connect'), {
  onEnter: function(args) {
    try {
      var sa = args[1];
      if (sa.readU16() !== 2) return;
      var portNet = sa.add(2).readU16();
      var port = ((portNet & 0xff) << 8) | ((portNet >> 8) & 0xff);
      var ip = [sa.add(4).readU8(), sa.add(5).readU8(), sa.add(6).readU8(), sa.add(7).readU8()];
      log('[connect] ' + ip.join('.') + ':' + port);
      if (ip[0] === 183 && ip[1] === 110) {
        log('  -> 127.0.0.1');
        sa.add(4).writeByteArray([127, 0, 0, 1]);
      }
    } catch(e) {}
  }
});
Interceptor.attach(ws2.getExportByName('recv'), {
  onEnter: function(a) { this.buf = a[1]; },
  onLeave: function(ret) {
    var n = ret.toInt32(); if (n <= 0) return;
    var b = []; for (var i = 0; i < Math.min(n, 32); i++) b.push(('0'+this.buf.add(i).readU8().toString(16)).slice(-2));
    log('[recv] ' + n + ' bytes: ' + b.join(' '));
  }
});
Interceptor.attach(ws2.getExportByName('send'), {
  onEnter: function(a) {
    var n = a[2].toInt32();
    var b = []; for (var i = 0; i < Math.min(n, 32); i++) b.push(('0'+a[1].add(i).readU8().toString(16)).slice(-2));
    log('[send] ' + n + ' bytes: ' + b.join(' '));
  }
});

// WSAConnect - async socket reconnect (IOCP path)
try {
  Interceptor.attach(ws2.getExportByName('WSAConnect'), {
    onEnter: function(args) {
      try {
        var sa = args[1];
        if (sa.readU16() !== 2) return;
        var portNet = sa.add(2).readU16();
        var port = ((portNet & 0xff) << 8) | ((portNet >> 8) & 0xff);
        var ip = [sa.add(4).readU8(), sa.add(5).readU8(), sa.add(6).readU8(), sa.add(7).readU8()];
        log('[WSAConnect] ' + ip.join('.') + ':' + port);
        if (ip[0] === 183 && ip[1] === 110) {
          log('  -> 127.0.0.1');
          sa.add(4).writeByteArray([127, 0, 0, 1]);
        }
      } catch(e) {}
    }
  });
  log('[+] WSAConnect hooked');
} catch(e) { log('[!] WSAConnect: ' + e); }

// WSASend - async send (IOCP path)
try {
  Interceptor.attach(ws2.getExportByName('WSASend'), {
    onEnter: function(args) {
      try {
        var bufCount = args[2].toInt32();
        var wsaBufs = args[1];
        for (var i = 0; i < Math.min(bufCount, 3); i++) {
          var len = wsaBufs.add(i * 8).readU32();
          var buf = wsaBufs.add(i * 8 + 4).readPointer();
          var b = [];
          for (var j = 0; j < Math.min(len, 32); j++) b.push(('0'+buf.add(j).readU8().toString(16)).slice(-2));
          log('[WSASend] ' + len + ' bytes: ' + b.join(' '));
        }
      } catch(e) {}
    }
  });
  log('[+] WSASend hooked');
} catch(e) { log('[!] WSASend: ' + e); }

// WSARecv - async recv (IOCP path)
try {
  Interceptor.attach(ws2.getExportByName('WSARecv'), {
    onEnter: function(args) {
      this.wsaBufs = args[1];
      this.bufCount = args[2].toInt32();
    },
    onLeave: function(ret) {
      if (ret.toInt32() !== 0) return; // 0 = success (sync complete)
      try {
        var bufCount = this.bufCount;
        var wsaBufs = this.wsaBufs;
        for (var i = 0; i < Math.min(bufCount, 3); i++) {
          var len = wsaBufs.add(i * 8).readU32();
          var buf = wsaBufs.add(i * 8 + 4).readPointer();
          var b = [];
          for (var j = 0; j < Math.min(len, 32); j++) b.push(('0'+buf.add(j).readU8().toString(16)).slice(-2));
          log('[WSARecv] ' + len + ' bytes: ' + b.join(' '));
        }
      } catch(e) {}
    }
  });
  log('[+] WSARecv hooked');
} catch(e) { log('[!] WSARecv: ' + e); }

log('[+] Network hooked');

// ── Essential memory patches ─────────────────────────────
try { var p = rva(0x0064F290); Memory.protect(p, 6, 'rwx'); p.writeByteArray([0xB8,0x01,0x00,0x00,0x00,0xC3]); log('[+] PIN bypass (0x64F290)'); } catch(e) { log('[!] PIN: '+e); }
try { var p = rva(0x007564A0); Memory.protect(p, 8, 'rwx'); p.writeByteArray([0xB8,0x01,0x00,0x00,0x00,0xC2,0x0C,0x00]); log('[+] serverChk bypass (0x7564A0)'); } catch(e) { log('[!] serverChk: '+e); }
try { var p = rva(0x00676080); Memory.protect(p, 6, 'rwx'); p.writeByteArray([0xB8,0x01,0x00,0x00,0x00,0xC3]); log('[+] PassportLogin (0x676080)'); } catch(e) { log('[!] 676080: '+e); }

// ── LOBBY PATCHES - FIRST HALF ───────────────────────────
// Patch 1: 0x0075057B JNZ->JMP (WebLauncher bypass) - SAFE
try { var p = rva(0x0075057B); Memory.protect(p, 1, 'rwx'); p.writeU8(0xEB); log('[+] P1: 0x0075057B JNZ->JMP'); } catch(e) { log('[!] P1: '+e); }

// Patch 2: 0x00755280 -> mov eax,1; ret 4 (loginWrapper __stdcall)
try { var p = rva(0x00755280); Memory.protect(p, 8, 'rwx'); p.writeByteArray([0xB8,0x01,0x00,0x00,0x00,0xC2,0x04,0x00]); log('[+] P2: 0x00755280 -> ret 1'); } catch(e) { log('[!] P2: '+e); }

// Patch 3: 0x007551F0 -> mov eax,1; ret
try { var p = rva(0x007551F0); Memory.protect(p, 6, 'rwx'); p.writeByteArray([0xB8,0x01,0x00,0x00,0x00,0xC3]); log('[+] P3: 0x007551F0 -> ret 1'); } catch(e) { log('[!] P3: '+e); }

// EXCLUDED (second half - test separately):
// 0x007549D0 -> xor eax,eax; ret   (might cause patcher mode)
// 0x00BE66A0 -> xor eax,eax; ret 4 (might cause patcher mode)
// 0x00C2D120 -> xor eax,eax; ret   (might cause patcher mode)
// 0x006514A6 -> window mode

log('[=] Lobby patches: P1+P2+P3 applied, P4-P7 EXCLUDED');

// ── NMCO hooks ───────────────────────────────────────────
Interceptor.attach(rva(0x00673100), {
  onEnter: function() { log('[FUN_673100] Called'); },
  onLeave: function(r) { log('[FUN_673100] ' + r + '->0'); r.replace(ptr(0)); }
});
Interceptor.attach(rva(0x00676180), {
  onEnter: function() { log('[FUN_676180] Called'); },
  onLeave: function(r) { log('[FUN_676180] ' + r + '->1'); r.replace(ptr(1)); }
});
Interceptor.attach(rva(0x00672220), {
  onEnter: function(a) { log('[NMCOWrapper] p1=' + a[0] + ' p2=' + a[1]); },
  onLeave: function(r) { log('[NMCOWrapper] ' + r + '->1'); r.replace(ptr(1)); }
});
var fakePassport = 'NPP1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
Interceptor.attach(rva(0x00673240), {
  onEnter: function() { this.edi = this.context.edi; },
  onLeave: function(r) {
    if (this.edi && !this.edi.isNull()) {
      try { this.edi.writeUtf16String(fakePassport); r.replace(this.edi); log('[Passport] Fake passport injected'); } catch(e) {}
    }
  }
});
Interceptor.attach(rva(0x006763a0), {
  onEnter: function(a) { log('[GetPassport2] Called'); },
  onLeave: function(r) { log('[GetPassport2] Return=' + r); }
});

function patchNmcogame() {
  var m = Process.findModuleByName('nmcogame.dll');
  if (!m) { setTimeout(patchNmcogame, 200); return; }
  log('[*] nmcogame.dll at ' + m.base);
  try {
    Interceptor.attach(m.getExportByName('NMCO_CallNMFunc'), {
      onEnter: function(a) { log('[NMCO_CallNMFunc] arg0=' + a[0]); },
      onLeave: function(r) { log('[NMCO_CallNMFunc] ' + r + '->1'); r.replace(ptr(1)); }
    });
    log('[+] NMCO_CallNMFunc hooked');
  } catch(e) { log('[!] nmcogame: ' + e); }
}

// LoadLibraryW/A hook - patch nmcogame.dll THE MOMENT it loads
var loadLibW = kernel32.getExportByName('LoadLibraryW');
var loadLibA = kernel32.getExportByName('LoadLibraryA');
var loadLibExW = kernel32.getExportByName('LoadLibraryExW');
var nmcogamePatched = false;

function onLibraryLoaded(retval) {
  if (nmcogamePatched) return;
  if (retval.isNull()) return;
  try {
    var mod = Process.findModuleByAddress(retval);
    if (mod && mod.name.toLowerCase() === 'nmcogame.dll') {
      log('[LoadLibrary] nmcogame.dll detected! Patching immediately...');
      nmcogamePatched = true;
      patchNmcogame();
    }
  } catch(e) {}
}

Interceptor.attach(loadLibW, { onLeave: function(r) { onLibraryLoaded(r); } });
Interceptor.attach(loadLibA, { onLeave: function(r) { onLibraryLoaded(r); } });
Interceptor.attach(loadLibExW, { onLeave: function(r) { onLibraryLoaded(r); } });
log('[+] LoadLibrary hooks for nmcogame.dll instant detection');

// Also try immediately in case it's already loaded
patchNmcogame();

log('==============================================');
log('v3.0: First-half Lobby patches (P1+P2+P3)');
log('Watch: if Patch... screen -> P1/P2/P3 is culprit');
log('       if ExitProcess again -> need more patches');
log('==============================================');
