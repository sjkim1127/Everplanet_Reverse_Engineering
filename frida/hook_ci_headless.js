// CI-only startup instrumentation for headless GitHub Actions runs.
// Logs DLL loads/window creation, dismisses hidden MessageBox dialogs,
// and records early blocking wait call stacks.

(function () {
  const PREFIX = "[ci-headless]";
  let waitTraces = 0;
  const MAX_WAIT_TRACES = 16;

  function log(msg) {
    console.log(PREFIX + " " + msg);
  }

  function readAnsi(p) {
    try { return p.isNull() ? "" : p.readCString(); } catch (_) { return "<unreadable>"; }
  }

  function readWide(p) {
    try { return p.isNull() ? "" : p.readUtf16String(); } catch (_) { return "<unreadable>"; }
  }

  function formatBacktrace(context) {
    try {
      return Thread.backtrace(context, Backtracer.FUZZY)
        .slice(0, 12)
        .map(DebugSymbol.fromAddress)
        .join(" <- ");
    } catch (e) {
      return "<backtrace failed: " + e + ">";
    }
  }

  function hookLoaders() {
    const kernel32 = Process.getModuleByName("kernel32.dll");
    const getLastError = new NativeFunction(kernel32.getExportByName("GetLastError"), "uint", []);

    function attach(name, wide) {
      try {
        const fn = kernel32.getExportByName(name);
        Interceptor.attach(fn, {
          onEnter(args) {
            this.path = wide ? readWide(args[0]) : readAnsi(args[0]);
          },
          onLeave(retval) {
            if (!this.path) return;
            if (retval.isNull()) {
              log(name + " FAIL path=" + this.path + " gle=" + getLastError());
            } else {
              log(name + " OK path=" + this.path + " base=" + retval);
            }
          }
        });
      } catch (e) {
        log("hook " + name + " failed: " + e);
      }
    }

    attach("LoadLibraryA", false);
    attach("LoadLibraryW", true);
    attach("LoadLibraryExA", false);
    attach("LoadLibraryExW", true);
  }

  function hookKernelWaits() {
    const kernel32 = Process.getModuleByName("kernel32.dll");

    function traceWait(name, timeoutIndex) {
      try {
        const addr = kernel32.getExportByName(name);
        Interceptor.attach(addr, {
          onEnter(args) {
            if (waitTraces >= MAX_WAIT_TRACES) return;
            const timeout = args[timeoutIndex].toUInt32();
            if (timeout !== 0xffffffff && timeout < 5000) return;
            waitTraces++;
            log(name + " timeout=" + timeout + " stack=" + formatBacktrace(this.context));
          }
        });
      } catch (e) {
        log("hook " + name + " failed: " + e);
      }
    }

    traceWait("WaitForSingleObject", 1);
    traceWait("WaitForSingleObjectEx", 1);
    traceWait("WaitForMultipleObjects", 3);
    traceWait("WaitForMultipleObjectsEx", 3);
  }

  function installUser32Hooks() {
    let user32;
    try {
      user32 = Process.getModuleByName("user32.dll");
    } catch (e) {
      log("user32.dll not loaded yet: " + e);
      return false;
    }

    function replaceMessageBox(name, wide, extended) {
      try {
        const addr = user32.getExportByName(name);
        const argTypes = extended
          ? ["pointer", "pointer", "pointer", "uint", "uint"]
          : ["pointer", "pointer", "pointer", "uint"];
        Interceptor.replace(addr, new NativeCallback(function (hwnd, text, caption, type, lang) {
          const body = wide ? readWide(text) : readAnsi(text);
          const title = wide ? readWide(caption) : readAnsi(caption);
          log(name + " AUTO-DISMISS title=" + JSON.stringify(title) + " text=" + JSON.stringify(body) + " type=0x" + type.toString(16));
          return 1; // IDOK
        }, "int", argTypes));
        log(name + " auto-dismiss installed");
      } catch (e) {
        if (!String(e).includes("already replaced")) {
          log("hook " + name + " failed: " + e);
        }
      }
    }

    function hookCreateWindow(name, wide) {
      try {
        const addr = user32.getExportByName(name);
        Interceptor.attach(addr, {
          onEnter(args) {
            this.className = wide ? readWide(args[1]) : readAnsi(args[1]);
            this.title = wide ? readWide(args[2]) : readAnsi(args[2]);
          },
          onLeave(retval) {
            log(name + " hwnd=" + retval + " class=" + JSON.stringify(this.className) + " title=" + JSON.stringify(this.title));
          }
        });
      } catch (e) {
        log("hook " + name + " failed: " + e);
      }
    }

    function hookBlockingMessageCall(name) {
      try {
        const addr = user32.getExportByName(name);
        Interceptor.attach(addr, {
          onEnter() {
            if (waitTraces >= MAX_WAIT_TRACES) return;
            waitTraces++;
            log(name + " stack=" + formatBacktrace(this.context));
          }
        });
      } catch (e) {
        log("hook " + name + " failed: " + e);
      }
    }

    replaceMessageBox("MessageBoxA", false, false);
    replaceMessageBox("MessageBoxW", true, false);
    replaceMessageBox("MessageBoxExA", false, true);
    replaceMessageBox("MessageBoxExW", true, true);
    hookCreateWindow("CreateWindowExA", false);
    hookCreateWindow("CreateWindowExW", true);
    hookBlockingMessageCall("GetMessageA");
    hookBlockingMessageCall("GetMessageW");
    hookBlockingMessageCall("WaitMessage");
    hookBlockingMessageCall("MsgWaitForMultipleObjects");
    hookBlockingMessageCall("MsgWaitForMultipleObjectsEx");
    return true;
  }

  log("installing CI headless startup hooks");
  hookLoaders();
  hookKernelWaits();
  installUser32Hooks();
  setTimeout(function () {
    installUser32Hooks();
  }, 1000);
})();
