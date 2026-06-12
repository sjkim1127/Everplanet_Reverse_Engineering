# EverPlanet Client Analysis Script for x64dbg
# Usage: In x64dbg Python console, run: exec(open(r"C:\Reversecore_Workspace\x64dbg\everplanet_analyze.py").read())

import x64dbg

# ============================================================
# Configuration
# ============================================================
BASE_ADDR = 0x00400000  # Default base (adjust if ASLR)

# Patch addresses (relative to base 0x400000)
PATCHES = {
    "ServerChk_Skip": (0x7565AE, bytes([0xE9, 0xD0, 0x00, 0x00, 0x00])),
    "ServerChk_Retry": (0x756682, bytes([0xE9, 0x37, 0x02, 0x00, 0x00])),
    "LaunchArg_Skip": (0x75629F, bytes([0xEB])),
    "Terminate_Hook": (0x755481, bytes([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x14, 0x00])),
    "HackShield_1": (0x7551F0, bytes([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC3])),
    "HackShield_2": (0x755280, bytes([0xB8, 0x01, 0x00, 0x00, 0x00, 0xC2, 0x04, 0x00])),
    "Mutex_Skip": (0x7549D0, bytes([0x31, 0xC0, 0xC3])),
    "Window_Mode": (0x75057B, bytes([0xEB])),
    "CRC_Check": (0x6514A6, bytes([0x33, 0xD2, 0x90])),
}

# Network function addresses to monitor
NETWORK_FUNCS = {
    "ws2_32.send": None,
    "ws2_32.recv": None,
    "ws2_32.connect": None,
    "ws2_32.socket": None,
}

# ============================================================
# Helper Functions
# ============================================================

def log(msg):
    """Print message to x64dbg log"""
    print(f"[EverPlanet] {msg}")

def read_bytes(addr, size):
    """Read bytes from memory"""
    return x64dbg.ReadByte(addr) if size == 1 else bytes([x64dbg.ReadByte(addr + i) for i in range(size)])

def write_bytes(addr, data):
    """Write bytes to memory"""
    for i, b in enumerate(data):
        x64dbg.WriteByte(addr + i, b)
    return True

def get_module_base(name="EverPlanet_KR_v1842_U_DEVM.exe"):
    """Get module base address"""
    # x64dbg의 모듈 기반 주소 가져오기
    return x64dbg.DbgValFromString(f"mod.base({name})")

# ============================================================
# Patch Functions
# ============================================================

def apply_all_patches():
    """Apply all patches to bypass protections"""
    log("Applying all patches...")
    base = get_module_base()
    if base == 0:
        base = BASE_ADDR
        log(f"Using default base: 0x{base:08X}")
    else:
        log(f"Module base: 0x{base:08X}")
    
    for name, (offset, data) in PATCHES.items():
        addr = base + (offset - BASE_ADDR) if offset >= BASE_ADDR else base + offset
        try:
            write_bytes(addr, data)
            log(f"  [OK] {name} @ 0x{addr:08X}")
        except Exception as e:
            log(f"  [FAIL] {name} @ 0x{addr:08X}: {e}")
    
    log("All patches applied!")

def verify_patches():
    """Verify patches are correctly applied"""
    log("Verifying patches...")
    base = get_module_base()
    if base == 0:
        base = BASE_ADDR
    
    for name, (offset, data) in PATCHES.items():
        addr = base + (offset - BASE_ADDR) if offset >= BASE_ADDR else base + offset
        current = read_bytes(addr, len(data))
        if current == data:
            log(f"  [OK] {name}")
        else:
            log(f"  [MISMATCH] {name} @ 0x{addr:08X}")
            log(f"    Expected: {data.hex()}")
            log(f"    Current:  {current.hex() if isinstance(current, bytes) else hex(current)}")

# ============================================================
# Network Analysis
# ============================================================

def setup_network_breakpoints():
    """Set breakpoints on network functions"""
    log("Setting network breakpoints...")
    
    funcs = ["ws2_32.send", "ws2_32.recv", "ws2_32.connect"]
    for func in funcs:
        x64dbg.DbgCmdExec(f"bp {func}")
        log(f"  BP set: {func}")
    
    log("Network breakpoints ready!")

def setup_recv_logging():
    """Set conditional breakpoint on recv to log packet data"""
    log("Setting up recv logging...")
    # recv(SOCKET s, char* buf, int len, int flags)
    # ESP+4 = socket, ESP+8 = buffer, ESP+C = length
    x64dbg.DbgCmdExec("bp ws2_32.recv")
    x64dbg.DbgCmdExec("bpcnd ws2_32.recv, \"log \\\"recv: socket={[esp+4]}, buf={[esp+8]}, len={[esp+c]}\\\"\"")
    log("recv logging enabled")

def dump_recv_buffer():
    """Dump the recv buffer after recv returns (call at return breakpoint)"""
    esp = x64dbg.DbgValFromString("esp")
    buf_addr = x64dbg.DbgValFromString("[esp+8]")
    length = x64dbg.DbgValFromString("eax")  # recv returns bytes received
    
    if length > 0 and length < 0x10000:
        log(f"Recv buffer @ 0x{buf_addr:08X}, len={length}")
        data = read_bytes(buf_addr, min(length, 64))
        log(f"  Data: {data.hex() if isinstance(data, bytes) else hex(data)}")

# ============================================================
# Packet Analysis
# ============================================================

def analyze_packet_at(addr, length=64):
    """Analyze packet structure at given address"""
    log(f"Analyzing packet @ 0x{addr:08X}")
    
    data = read_bytes(addr, length)
    if not isinstance(data, bytes):
        data = bytes([data])
    
    log(f"  Raw ({len(data)} bytes): {data.hex()}")
    
    # EverPlanet packet structure:
    # [0:2] = encrypted length (XOR with 0xF834A608 for RX)
    # [2:4] = opcode
    # [4:8] = hash
    # [8:] = payload (encrypted with Blowfish)
    
    if len(data) >= 8:
        enc_len = int.from_bytes(data[0:2], 'little')
        dec_len = enc_len ^ (0xF834A608 & 0xFFFF)
        opcode = int.from_bytes(data[2:4], 'little')
        hash_val = int.from_bytes(data[4:8], 'little')
        
        log(f"  Encrypted Length: 0x{enc_len:04X}")
        log(f"  Decrypted Length: {dec_len}")
        log(f"  Opcode: 0x{opcode:04X}")
        log(f"  Hash: 0x{hash_val:08X}")

# ============================================================
# Client State Analysis
# ============================================================

def find_packet_handlers():
    """Search for packet handler table"""
    log("Searching for packet handlers...")
    # Look for references to known opcodes
    # PqSyncTick = 0x5500, PqLogin = 0x0100
    x64dbg.DbgCmdExec("findall 0x400000, 00 55 00 00")  # PqSyncTick opcode
    log("Check References window for results")

def trace_after_recv():
    """Start tracing after recv returns to find packet processing"""
    log("Setting up trace after recv...")
    # Trace into to follow packet processing
    x64dbg.DbgCmdExec("TraceIntoConditional 1000, \"eip < 0x400000 || eip > 0x800000\"")
    log("Tracing started (max 1000 instructions)")

# ============================================================
# SyncTick Analysis
# ============================================================

def find_synctick_handler():
    """Find where PqSyncTick (0x5500) is handled"""
    log("Searching for SyncTick handler...")
    # Search for opcode comparison
    x64dbg.DbgCmdExec("findall 0x400000, 3D 00 55 00 00")  # CMP EAX, 5500
    x64dbg.DbgCmdExec("findall 0x400000, 81 F? 00 55 00 00")  # CMP reg, 5500
    log("Check References window for handler location")

def bp_on_synctick_processing():
    """Set breakpoint when SyncTick response is being processed"""
    # This needs to be adjusted based on actual handler address
    log("To find SyncTick handler:")
    log("  1. Set BP on ws2_32.recv")
    log("  2. When recv returns with data, check buffer")
    log("  3. If opcode is 0x5500 (PrSyncTick), trace execution")
    log("  4. Find where opcode is compared and handler is called")

# ============================================================
# Quick Commands
# ============================================================

def setup_all():
    """Complete setup: apply patches and set breakpoints"""
    apply_all_patches()
    setup_network_breakpoints()
    log("\nSetup complete! Press F9 to run.")

def status():
    """Show current analysis status"""
    log("=== EverPlanet Analysis Status ===")
    eip = x64dbg.DbgValFromString("eip")
    esp = x64dbg.DbgValFromString("esp")
    log(f"EIP: 0x{eip:08X}")
    log(f"ESP: 0x{esp:08X}")
    verify_patches()

# ============================================================
# Menu
# ============================================================

def help():
    """Show available commands"""
    print("""
=== EverPlanet Analysis Commands ===

Setup:
  setup_all()              - Apply patches + set network BPs
  apply_all_patches()      - Apply all bypass patches
  verify_patches()         - Verify patches are applied
  setup_network_breakpoints() - Set BPs on send/recv/connect

Analysis:
  analyze_packet_at(addr)  - Analyze packet at address
  find_synctick_handler()  - Search for SyncTick handler
  find_packet_handlers()   - Search for packet handler table
  trace_after_recv()       - Trace packet processing

Status:
  status()                 - Show current state
  help()                   - Show this help

Example workflow:
  1. setup_all()           - Initialize
  2. F9 to run
  3. When BP hits on recv, check ESP+8 for buffer
  4. analyze_packet_at(buffer_addr)
  5. Trace to find handler
""")

# ============================================================
# Auto-run on load
# ============================================================

log("EverPlanet Analysis Script Loaded!")
log("Type help() for available commands")
log("Quick start: setup_all()")
