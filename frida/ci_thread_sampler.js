console.log('[THREAD_TRACE] script_loaded');

function describeAddress(addr) {
  try {
    const mod = Process.findModuleByAddress(addr);
    if (mod) {
      return `${mod.name}+0x${addr.sub(mod.base).toString(16)}`;
    }
  } catch (e) {}
  return addr.toString();
}

function sampleThreads() {
  try {
    const threads = Process.enumerateThreads();
    console.log(`[THREAD_TRACE] sample thread_count=${threads.length}`);
    for (const t of threads) {
      try {
        const pc = t.context.pc;
        const sp = t.context.sp;
        const bt = Thread.backtrace(t.context, Backtracer.ACCURATE)
          .slice(0, 12)
          .map(describeAddress)
          .join(' <- ');
        console.log(`[THREAD_TRACE] tid=${t.id} state=${t.state} pc=${describeAddress(pc)} sp=${sp} bt=${bt}`);
      } catch (e) {
        console.log(`[THREAD_TRACE] tid=${t.id} sample_error=${e}`);
      }
    }
  } catch (e) {
    console.log(`[THREAD_TRACE] enumerate_error=${e}`);
  }
}

setTimeout(sampleThreads, 1000);
setInterval(sampleThreads, 2000);
