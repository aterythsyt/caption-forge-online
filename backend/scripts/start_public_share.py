from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib import request as urllib_request


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
TMP_DIR = ROOT_DIR / "tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)

BACKEND_PYTHON = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
CLOUDFLARED_PATH = TMP_DIR / "cloudflared.exe"
CLOUDFLARED_URL = (
    "https://github.com/cloudflare/cloudflared/releases/latest/download/"
    "cloudflared-windows-amd64.exe"
)
STATE_PATH = TMP_DIR / "public-share.json"
URL_PATH = TMP_DIR / "public-url.txt"
BACKEND_LOG_PATH = TMP_DIR / "public-backend.log"
TUNNEL_LOG_PATH = TMP_DIR / "public-tunnel.log"
PUBLIC_URL_RE = re.compile(r"https://[-a-z0-9]+\.trycloudflare\.com", re.IGNORECASE)


def download_cloudflared() -> None:
    if CLOUDFLARED_PATH.exists():
        return
    urllib_request.urlretrieve(CLOUDFLARED_URL, CLOUDFLARED_PATH)


def detached_flags() -> int:
    return (
        getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        | getattr(subprocess, "DETACHED_PROCESS", 0)
    )


def healthcheck_ok() -> bool:
    try:
        with urllib_request.urlopen("http://127.0.0.1:8000/api/health", timeout=4) as response:
            return response.status == 200
    except Exception:
        return False


def wait_for_local_server(timeout_seconds: int = 45) -> None:
    started = time.time()
    while time.time() - started < timeout_seconds:
        if healthcheck_ok():
            return
        time.sleep(1)
    raise RuntimeError("Local FastAPI server did not become healthy on port 8000.")


def wait_for_tunnel_url(timeout_seconds: int = 60) -> str:
    started = time.time()
    while time.time() - started < timeout_seconds:
        if TUNNEL_LOG_PATH.exists():
            content = TUNNEL_LOG_PATH.read_text(encoding="utf-8", errors="ignore")
            match = PUBLIC_URL_RE.search(content)
            if match:
                return match.group(0)
        time.sleep(1)
    raise RuntimeError("Cloudflare quick tunnel did not return a public URL in time.")


def main() -> int:
    download_cloudflared()

    backend_pid: int | None = None
    if not healthcheck_ok():
        backend_log = BACKEND_LOG_PATH.open("w", encoding="utf-8")
        backend_process = subprocess.Popen(
            [
                str(BACKEND_PYTHON),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=str(BACKEND_DIR),
            stdout=backend_log,
            stderr=subprocess.STDOUT,
            creationflags=detached_flags(),
        )
        backend_pid = backend_process.pid
        wait_for_local_server()

    tunnel_log = TUNNEL_LOG_PATH.open("w", encoding="utf-8")
    tunnel_process = subprocess.Popen(
        [
            str(CLOUDFLARED_PATH),
            "tunnel",
            "--url",
            "http://127.0.0.1:8000",
            "--no-autoupdate",
        ],
        cwd=str(ROOT_DIR),
        stdout=tunnel_log,
        stderr=subprocess.STDOUT,
        creationflags=detached_flags(),
    )

    public_url = wait_for_tunnel_url()
    URL_PATH.write_text(public_url, encoding="utf-8")
    STATE_PATH.write_text(
        json.dumps(
            {
                "backend_pid": backend_pid,
                "tunnel_pid": tunnel_process.pid,
                "public_url": public_url,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(public_url)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Public share failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
