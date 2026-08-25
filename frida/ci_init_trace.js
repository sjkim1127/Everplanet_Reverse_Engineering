console.log('[INIT_TRACE] script_loaded');

function safeUtf8(p) {
  try { return p && !p.isNull() ? p.readUtf8String() : '<null>'; } catch (e) { return `<utf8-error:${e}>`; }
}

function safeUtf16(p) {
  try { return p && !p.isNull() ? p.readUtf16String() : '<null>'; } catch (e) { return `<utf16-error:${e}>`; }
}

function hookExport(moduleName, exportName, callbacks) {
  try {
    const mod = Process.getModuleByName(moduleName);
    const addr = mod.getExportByName(exportName);
    Interceptor.attach(addr, callbacks);
    console.log(`[INIT_TRACE] hooked ${moduleName}!${exportName} @ ${addr}`);
  } catch (e) {
    console.log(`[INIT_TRACE] hook_error ${moduleName}!${exportName}: ${e}`);
  }
}

hookExport('kernel32.dll', 'LoadLibraryA', {
  onEnter(args) { this.name = safeUtf8(args[0]); console.log(`[INIT_TRACE] LoadLibraryA ${this.name}`); },
  onLeave(retval) { console.log(`[INIT_TRACE] LoadLibraryA result=${retval} name=${this.name}`); }
});

hookExport('kernel32.dll', 'LoadLibraryW', {
  onEnter(args) { this.name = safeUtf16(args[0]); console.log(`[INIT_TRACE] LoadLibraryW ${this.name}`); },
  onLeave(retval) { console.log(`[INIT_TRACE] LoadLibraryW result=${retval} name=${this.name}`); }
});

hookExport('kernel32.dll', 'LoadLibraryExA', {
  onEnter(args) { this.name = safeUtf8(args[0]); console.log(`[INIT_TRACE] LoadLibraryExA ${this.name}`); },
  onLeave(retval) { console.log(`[INIT_TRACE] LoadLibraryExA result=${retval} name=${this.name}`); }
});

hookExport('kernel32.dll', 'LoadLibraryExW', {
  onEnter(args) { this.name = safeUtf16(args[0]); console.log(`[INIT_TRACE] LoadLibraryExW ${this.name}`); },
  onLeave(retval) { console.log(`[INIT_TRACE] LoadLibraryExW result=${retval} name=${this.name}`); }
});

hookExport('kernel32.dll', 'GetProcAddress', {
  onEnter(args) {
    this.name = args[1].toUInt32() <= 0xffff ? `ordinal:${args[1].toUInt32()}` : safeUtf8(args[1]);
    console.log(`[INIT_TRACE] GetProcAddress ${this.name}`);
  }
});

hookExport('kernel32.dll', 'CreateFileW', {
  onEnter(args) {
    const name = safeUtf16(args[0]);
    if (/nmcogame|gameclient|\.pin|seed_info|passport|nexon/i.test(name)) {
      console.log(`[INIT_TRACE] CreateFileW ${name}`);
    }
  }
});

hookExport('kernel32.dll', 'CreateFileA', {
  onEnter(args) {
    const name = safeUtf8(args[0]);
    if (/nmcogame|gameclient|\.pin|seed_info|passport|nexon/i.test(name)) {
      console.log(`[INIT_TRACE] CreateFileA ${name}`);
    }
  }
});

hookExport('user32.dll', 'MessageBoxW', {
  onEnter(args) { console.log(`[INIT_TRACE] MessageBoxW text=${safeUtf16(args[1])} caption=${safeUtf16(args[2])}`); }
});

hookExport('user32.dll', 'MessageBoxA', {
  onEnter(args) { console.log(`[INIT_TRACE] MessageBoxA text=${safeUtf8(args[1])} caption=${safeUtf8(args[2])}`); }
});

hookExport('kernel32.dll', 'ExitProcess', {
  onEnter(args) { console.log(`[INIT_TRACE] ExitProcess code=${args[0].toUInt32()}`); }
});

hookExport('kernel32.dll', 'TerminateProcess', {
  onEnter(args) { console.log(`[INIT_TRACE] TerminateProcess code=${args[1].toUInt32()}`); }
});

try {
  const ntdll = Process.getModuleByName('ntdll.dll');
  const ldrLoadDll = ntdll.getExportByName('LdrLoadDll');
  Interceptor.attach(ldrLoadDll, {
    onEnter(args) {
      try {
        const us = args[2];
        if (us && !us.isNull()) {
          const length = us.readU16();
          const buffer = us.add(Process.pointerSize === 8 ? 8 : 4).readPointer();
          this.name = buffer.readUtf16String(length / 2);
          console.log(`[INIT_TRACE] LdrLoadDll ${this.name}`);
        }
      } catch (e) {
        console.log(`[INIT_TRACE] LdrLoadDll parse_error=${e}`);
      }
    },
    onLeave(retval) { console.log(`[INIT_TRACE] LdrLoadDll status=${retval.toInt32()} name=${this.name || '<unknown>'}`); }
  });
  console.log(`[INIT_TRACE] hooked ntdll.dll!LdrLoadDll @ ${ldrLoadDll}`);
} catch (e) {
  console.log(`[INIT_TRACE] hook_error ntdll.dll!LdrLoadDll: ${e}`);
}

setInterval(function () {
  try {
    const mods = Process.enumerateModules().map(m => m.name.toLowerCase());
    const nmco = mods.includes('nmcogame.dll');
    console.log(`[INIT_TRACE] heartbeat nmcogame_loaded=${nmco} module_count=${mods.length}`);
  } catch (e) {
    console.log(`[INIT_TRACE] heartbeat_error=${e}`);
  }
}, 5000);
