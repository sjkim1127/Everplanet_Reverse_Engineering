# EverPlanet SyncTick Handler Finder
# x64dbg Python script to trace what happens after receiving PrSyncTick
# Usage: exec(open(r"C:\Reversecore_Workspace\x64dbg\find_synctick.py").read())

import x64dbg

# Constants
OPCODE_PR_SYNCTICK = 0x5501  # Server -> Client response
OPCODE_PQ_LOGIN = 0x0100     # Client -> Server (expected next)
LENGTH_XOR_RX = 0xF834A608

class SyncTickTracer:
    def __init__(self):
        self.recv_buffer = 0
        self.recv_len = 0
        self.tracing = False
        self.trace_log = []
        
    def log(self, msg):
        print(f"[SyncTick] {msg}")
        
    def setup_recv_breakpoint(self):
        """Set breakpoint on recv to catch incoming packets"""
        # Clear existing breakpoints on recv
        x64dbg.DbgCmdExec("bc ws2_32.recv")
        
        # Set new breakpoint
        x64dbg.DbgCmdExec("bp ws2_32.recv")
        self.log("Breakpoint set on ws2_32.recv")
        self.log("Run the client and connect to server")
        
    def on_recv_entry(self):
        """Call this when BP hits at recv entry"""
        esp = x64dbg.DbgValFromString("esp")
        self.recv_buffer = x64dbg.DbgValFromString(f"[{esp}+8]")
        req_len = x64dbg.DbgValFromString(f"[{esp}+0xC]")
        self.log(f"recv() called: buffer=0x{self.recv_buffer:08X}, requested_len={req_len}")
        self.log("Step over (F8) to see result, then call on_recv_return()")
        
    def on_recv_return(self):
        """Call this after recv returns"""
        eax = x64dbg.DbgValFromString("eax")
        
        if eax <= 0:
            self.log(f"recv returned {eax} (error or no data)")
            return
            
        self.recv_len = eax
        self.log(f"recv returned {eax} bytes")
        
        # Read received data
        data = bytes([x64dbg.ReadByte(self.recv_buffer + i) for i in range(min(eax, 64))])
        self.log(f"Data: {data.hex()}")
        
        # Parse packet header
        if len(data) >= 8:
            enc_len = int.from_bytes(data[0:2], 'little')
            dec_len = enc_len ^ (LENGTH_XOR_RX & 0xFFFF)
            opcode = int.from_bytes(data[2:4], 'little')
            hash_val = int.from_bytes(data[4:8], 'little')
            
            self.log(f"Packet: len={dec_len}, opcode=0x{opcode:04X}, hash=0x{hash_val:08X}")
            
            if opcode == OPCODE_PR_SYNCTICK:
                self.log("*** PrSyncTick DETECTED! ***")
                self.log("This is the packet we need to trace!")
                self.log("Call start_trace() to begin tracing execution")
                return True
        
        return False
        
    def start_trace(self):
        """Start tracing execution after PrSyncTick is received"""
        self.tracing = True
        self.trace_log = []
        
        self.log("Starting trace...")
        self.log("Using step-into to follow execution path")
        
        # Get return address
        esp = x64dbg.DbgValFromString("esp")
        ret_addr = x64dbg.DbgValFromString(f"[{esp}]")
        self.log(f"recv will return to: 0x{ret_addr:08X}")
        
        # Set breakpoint on return address to catch where recv returns
        x64dbg.DbgCmdExec(f"bp 0x{ret_addr:08X}")
        self.log(f"Breakpoint set at return address 0x{ret_addr:08X}")
        self.log("Press F9 to continue, will stop at return address")
        
    def analyze_current_location(self):
        """Analyze where we are in the code"""
        eip = x64dbg.DbgValFromString("eip")
        
        # Disassemble current instruction
        x64dbg.DbgCmdExec(f"dis {eip}")
        
        # Check if we're in a known module
        self.log(f"Current EIP: 0x{eip:08X}")
        
        # Look for opcode comparisons nearby
        self.log("Searching for opcode comparisons...")
        x64dbg.DbgCmdExec(f"findall {eip}, 3D 01 55 00 00, 1000")  # CMP EAX, 5501
        
    def find_packet_dispatch(self):
        """Try to find the packet dispatch function"""
        self.log("Searching for packet dispatch patterns...")
        
        # Common patterns in packet handlers:
        # 1. Switch table with opcode
        # 2. CMP + JE/JNE chains
        # 3. Function pointer table indexed by opcode
        
        # Search for 0x5501 (PrSyncTick opcode) references
        x64dbg.DbgCmdExec("findall 0x400000, 01 55, 0x400000")
        self.log("Check References window for 0x5501 occurrences")
        
        # Also search for dispatch table patterns
        # Usually: mov eax, [opcode]; call [table + eax*4]
        x64dbg.DbgCmdExec("findall 0x400000, FF 24 85")  # jmp [reg*4 + table]
        self.log("Potential switch tables found (check References)")

    def quick_trace(self, max_steps=100):
        """Quick trace execution for N steps, logging calls"""
        self.log(f"Quick tracing {max_steps} steps...")
        
        for i in range(max_steps):
            eip = x64dbg.DbgValFromString("eip")
            
            # Read instruction bytes to detect CALL
            instr = x64dbg.ReadByte(eip)
            
            if instr == 0xE8:  # CALL rel32
                target_offset = int.from_bytes(
                    bytes([x64dbg.ReadByte(eip + j) for j in range(1, 5)]),
                    'little', signed=True
                )
                target = eip + 5 + target_offset
                self.log(f"  CALL 0x{target:08X} @ 0x{eip:08X}")
                
            elif instr == 0xFF:  # Could be CALL reg or CALL [mem]
                modrm = x64dbg.ReadByte(eip + 1)
                if (modrm & 0x38) == 0x10:  # CALL reg/mem
                    self.log(f"  CALL indirect @ 0x{eip:08X}")
            
            # Step into
            x64dbg.DbgCmdExec("sti")
            
        self.log(f"Trace complete after {max_steps} steps")


# Global instance
tracer = SyncTickTracer()

def setup():
    """Setup for tracing"""
    tracer.setup_recv_breakpoint()

def recv_hit():
    """Call when recv breakpoint is hit"""
    tracer.on_recv_entry()

def recv_done():
    """Call after stepping over recv"""
    return tracer.on_recv_return()

def trace():
    """Start tracing after PrSyncTick"""
    tracer.start_trace()

def where():
    """Analyze current location"""
    tracer.analyze_current_location()

def find_dispatch():
    """Find packet dispatch function"""
    tracer.find_packet_dispatch()

def qtrace(n=100):
    """Quick trace N steps"""
    tracer.quick_trace(n)

print("""
=== SyncTick Handler Finder Loaded ===

Workflow:
1. setup()        - Set breakpoint on recv
2. F9             - Run until recv is called
3. recv_hit()     - Log recv parameters  
4. F8             - Step over recv
5. recv_done()    - Check if PrSyncTick received
6. trace()        - Set BP on return address
7. F9             - Continue to return
8. where()        - Analyze current location
9. qtrace(100)    - Quick trace 100 steps

Other commands:
- find_dispatch() - Search for packet dispatcher
""")
