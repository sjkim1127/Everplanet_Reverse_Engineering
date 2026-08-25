console.log('[CI_PROBE] script_loaded');

try {
  const main = Process.mainModule;
  console.log(`[CI_PROBE] main_module=${main.name} base=${main.base}`);
} catch (e) {
  console.log(`[CI_PROBE] main_module_error=${e}`);
}

try {
  const ws2 = Process.getModuleByName('ws2_32.dll');
  console.log(`[CI_PROBE] ws2_32=${ws2.base}`);
  const connect = ws2.getExportByName('connect');
  console.log(`[CI_PROBE] connect=${connect}`);
  Interceptor.attach(connect, {
    onEnter(args) {
      try {
        const sockaddr = args[1];
        const family = sockaddr.readU16();
        const port = ((sockaddr.add(2).readU8() << 8) | sockaddr.add(3).readU8()) >>> 0;
        let ip = 'unknown';
        if (family === 2) {
          ip = [4, 5, 6, 7].map(i => sockaddr.add(i).readU8()).join('.');
        }
        console.log(`[CI_PROBE] connect_call family=${family} dst=${ip}:${port}`);
      } catch (e) {
        console.log(`[CI_PROBE] connect_parse_error=${e}`);
      }
    }
  });
  console.log('[CI_PROBE] connect_hook_installed');
} catch (e) {
  console.log(`[CI_PROBE] connect_hook_error=${e}`);
}

setInterval(function () {
  console.log('[CI_PROBE] heartbeat');
}, 5000);
