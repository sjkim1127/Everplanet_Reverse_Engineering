#!/usr/bin/env python3
"""Spawn EverPlanet suspended with Frida, load hooks, then observe it for CI.

CI cleanup intentionally avoids synchronous script unload/session detach calls: with
this legacy client those Frida operations can block indefinitely after observation.
The target process is terminated first and the short-lived probe process then exits,
letting the OS tear down the local Frida session.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import sys
import time

import frida


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", required=True, type=pathlib.Path)
    parser.add_argument("--script", required=True, action="append", type=pathlib.Path)
    parser.add_argument("--duration", type=float, default=25.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    exe = args.exe.resolve()
    script_paths = [path.resolve() for path in args.script]

    if not exe.is_file():
        print(f"[ci-frida] executable not found: {exe}", file=sys.stderr, flush=True)
        return 2
    for script_path in script_paths:
        if not script_path.is_file():
            print(f"[ci-frida] script not found: {script_path}", file=sys.stderr, flush=True)
            return 2

    device = frida.get_local_device()
    pid: int | None = None
    session = None
    scripts = []
    detached = {"reason": None}

    def on_message(message, data) -> None:
        message_type = message.get("type")
        if message_type == "log":
            print(message.get("payload", ""), flush=True)
        elif message_type == "error":
            print(f"[frida-js-error] {message}", file=sys.stderr, flush=True)
        else:
            print(f"[frida-message] {message}", flush=True)
        if data:
            print(f"[frida-data] {len(data)} bytes", flush=True)

    def on_detached(reason, crash) -> None:
        detached["reason"] = reason
        print(f"[ci-frida] detached: reason={reason} crash={crash}", file=sys.stderr, flush=True)

    try:
        print(f"[ci-frida] spawning suspended: {exe}", flush=True)
        pid = device.spawn([str(exe)], cwd=str(exe.parent))
        print(f"[ci-frida] spawned pid={pid}", flush=True)

        session = device.attach(pid)
        session.on("detached", on_detached)
        print("[ci-frida] attached", flush=True)

        for script_path in script_paths:
            source = script_path.read_text(encoding="utf-8")
            script = session.create_script(source)
            script.on("message", on_message)
            script.load()
            scripts.append(script)
            print(f"[ci-frida] script loaded: {script_path.name}", flush=True)

        device.resume(pid)
        print("[ci-frida] target resumed", flush=True)

        deadline = time.monotonic() + max(args.duration, 0.0)
        while time.monotonic() < deadline and detached["reason"] is None:
            time.sleep(0.25)

        print(f"[ci-frida] observation complete detached={detached['reason']}", flush=True)
        return 0
    except Exception as exc:
        print(f"[ci-frida] fatal: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        # Do not call script.unload() or session.detach() here. Both are synchronous
        # RPCs and have hung indefinitely with this client on GitHub-hosted Windows.
        # Killing the inferior first is sufficient for this disposable CI probe.
        if pid is not None:
            try:
                print(f"[ci-frida] killing target pid={pid}", file=sys.stderr, flush=True)
                device.kill(pid)
                print("[ci-frida] target kill requested", file=sys.stderr, flush=True)
            except Exception as exc:
                print(f"[ci-frida] target kill failed: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)

        # Frida teardown itself may still block during Python interpreter shutdown.
        # Flush captured diagnostics and terminate the disposable probe process
        # without waiting for extension-module destructors.
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        finally:
            os._exit(0)


if __name__ == "__main__":
    main()
