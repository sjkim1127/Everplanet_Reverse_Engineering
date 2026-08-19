# EverPlanet Reverse Engineering

Reverse-engineering workspace for the discontinued **EverPlanet KR** Windows client, focused on reconstructing client behavior, proprietary network protocol state, resource/container formats, launcher/authentication flow, and the minimum server-side behavior required for local emulation experiments.

> **Project status:** research / work in progress. Several subsystems are partially reconstructed, but this repository does **not** claim a complete KR server implementation or a complete independent recovery of every protocol primitive.

## Scope

The project combines static analysis, dynamic instrumentation, binary patching, protocol reconstruction, and small analysis tools around the original 32-bit Windows client.

Primary areas of work include:

- Client startup, launcher, PIN validation, and Nexon/NMCO authentication paths
- TCP connection and packet-processing flow on the original client
- Packet framing, OpHash identifiers, IV/session state, and encoder/decoder behavior
- Runtime tracing with Frida (`connect`, `send`, `recv`, internal handlers, call sites/backtraces)
- Targeted static analysis and xref extraction with Ghidra / Radare2
- `.pin` / `.chi` container and metadata analysis
- Reconstruction of table-based decode/decryption routines from client code
- Experimental KR server-emulation and client redirection
- Repeatable launch / attach / test workflows for RE experiments

## Methodology

The project generally follows an evidence-driven RE loop:

```text
Static analysis
    ↓
Candidate function / data-flow / protocol hypothesis
    ↓
Dynamic instrumentation
    ↓
Runtime evidence (calls, packets, state, backtraces)
    ↓
Executable reconstruction / patch / emulator model
    ↓
Client-side behavioral validation
    ↓
Refine the model
```

A recurring goal is to avoid treating decompiler output as ground truth. Static observations are cross-checked against runtime behavior where practical.

## Repository Layout

```text
.
├── analysis/       # Targeted Radare2/r2pipe analysis helpers
├── cheatengine/    # Cheat Engine material used during client-state experiments
├── docs/           # Analysis reports, progress logs, handover notes
├── frida/          # Runtime hooks and instrumentation
├── scripts/        # Launch, attach, redirect, and test automation
├── tools/          # PIN/CHI and table-analysis utilities
├── x64dbg/         # Debugger-related working material
├── EverPlanet/     # Local client-side research material
└── droopl          # External/reference server implementation (submodule)
```

## Static + Dynamic Analysis

### Targeted static analysis

`analysis/r2_targeted.py` uses `r2pipe` to automate repeated inspection of known strings, xrefs, ports, code locations, and containing functions. This is used to reduce repetitive manual navigation while iterating on hypotheses discovered in Ghidra or runtime traces.

Examples of targets include:

- `isPatchFirst`
- `loginServer`
- `-loginserveraddr:`
- code paths associated with ports `3431` / `3432`
- specific functions reached from packet / authentication flows

### Runtime instrumentation

The Frida scripts instrument both WinSock and selected client-internal functions. Depending on the script, they can collect:

- TCP destination IP / port
- raw `send` / `recv` buffers
- caller offsets relative to the client image
- short backtraces
- selected internal send/receive handlers
- memory searches for strings or protocol-related constants
- controlled function interception for startup/authentication experiments

This lets static findings be checked against the behavior of the running client.

## Network / Protocol Reconstruction

The KR client uses a stateful custom protocol built around packet identifiers (OpHash), framing, and evolving IV/session state.

Work in this repository has included:

- identifying the initial `PcFirstMessage` handshake path
- observing/reconstructing world-list / world-select / reconnect behavior
- decoding `PqSyncTick` traffic and generating `PrSyncTick`
- tracking send/receive IV state across reconnects
- separating packet payload construction from transport framing
- reproducing enough of the framing/encryption layer to progress the original client beyond a raw TCP connection

One observed experimental flow was:

```text
Client                 Local server
  │                         │
  ├──── TCP connect ────────>│
  │<── PcFirstMessage ──────┤
  ├──── PqWorldList ────────>│
  │<── PrWorldList ─────────┤
  ├──── PqWorldSelect ──────>│
  │<── PrWorldSelect ───────┤
  │                         │
  ├──── reconnect ──────────>│
  │<── PcFirstMessage ──────┤
  ├──── PqSyncTick ─────────>│
  │<── PrSyncTick ──────────┤
  │                         │
  └── next login state under investigation
```

The project records failures as competing hypotheses rather than assuming a single cause. Examples have included malformed framing, incorrect IV evolution, missing prerequisite packets, authentication state, and client UI/state-machine dependencies.

## PIN / CHI Analysis

`tools/pin_unpacker.py` is an experimental reconstruction of routines identified during Ghidra analysis of the client.

The current prototype includes:

- loading four 256-entry lookup tables from an unpacked client image
- reproducing a table-based XOR/decode routine
- parsing the `Ch layer spec 1.2` signature and metadata region
- testing recovered metadata against expected structural values
- iterating over fixed-size entries for further analysis

This tooling should be treated as an **RE prototype**, not as a claim that the entire PIN/CHI format has been completely recovered.

## Client Patching and Authentication Research

The repository also contains experiments around startup, launcher, server-check, PIN-validation, and authentication paths.

Typical techniques used during this work include:

- conditional-branch patching
- replacing small functions with controlled return values
- preserving calling-convention stack cleanup (`ret` vs `ret N`)
- runtime interception rather than permanent patching where useful
- quick-attach workflows when early process initialization prevents reliable spawn-mode instrumentation

The purpose of these patches is to isolate client state transitions and understand what conditions are required to reach later network/game states.

## Automation

Reverse engineering this client requires many repeated launch/attach/test cycles, so the repository includes scripts for:

- starting the local test server
- launching the client in different modes
- attaching Frida shortly after process startup
- launching suspended for early analysis
- redirecting legacy server destinations to localhost
- running reduced/minimal instrumentation configurations

The automation exists primarily to make experiments reproducible and to shorten the hypothesis → test → evidence loop.

## External Reference: droopl

`droopl` is included as an **external/reference implementation**, not as code independently reconstructed in this repository.

It provides a Scala-based EverPlanet server implementation whose protocol structures are useful for comparison. Work here uses it as a reference/oracle while checking behavior against the KR client and adapting or validating differences where required.

Accordingly, protocol constants or packet structures that originate from `droopl` should **not** be interpreted as independently recovered solely from the KR binary.

The reverse-engineering work in this repository is instead centered on:

- validating behavior against the KR client
- locating corresponding client-side functions and state
- identifying KR-specific differences
- instrumenting the live client
- reconstructing/porting the required behavior into local experiments

## Tools Used

- **Ghidra** — static analysis and decompilation
- **Radare2 / r2pipe** — targeted scripted analysis
- **Frida** — runtime instrumentation and function/network tracing
- **x64dbg** — interactive Windows debugging
- **Cheat Engine** — controlled runtime patch/state experiments
- **Python / JavaScript / PowerShell** — analysis and workflow automation

## Current Limitations

This repository is a working research tree, so some documents represent different stages of understanding. In particular:

- early reports may contain hypotheses that were later refined or disproved
- some packet/protocol knowledge comes from the external `droopl` reference
- the KR server emulator is incomplete
- PIN/CHI reconstruction is incomplete
- advanced anti-tamper / anti-cheat internals are not fully reconstructed
- some binaries and local research artifacts are present because this began as a personal RE workspace rather than a polished library

When evaluating a claim, prefer later progress/issue reports and the accompanying scripts/code over early reconnaissance notes.

## Selected Documentation

Useful starting points in `docs/` include:

- `EVERPLANET_SERVER_EMULATOR_HANDOVER.md`
- `EverPlanet_Bypass_Progress.md`
- `EverPlanet_Issue_Report_20251204.md`
- `PIN_CHI_File_Analysis.md`
- `CURRENT_DEBUG_STATUS.md`

## Purpose

EverPlanet is a discontinued game, and this repository is maintained as a software-preservation and reverse-engineering research project. The focus is understanding legacy client behavior and reconstructing enough surrounding infrastructure to study the original software in a controlled local environment.
