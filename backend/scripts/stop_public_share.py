from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT_DIR / "tmp" / "public-share.json"
URL_PATH = ROOT_DIR / "tmp" / "public-url.txt"


def stop_pid(pid: int | None) -> None:
    if not pid:
        return
    subprocess.run(
        ["taskkill", "/PID", str(pid), "/F"],
        capture_output=True,
        text=True,
        check=False,
    )


def main() -> int:
    if not STATE_PATH.exists():
        print("No public share is currently tracked.")
        return 0

    payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    stop_pid(payload.get("tunnel_pid"))
    stop_pid(payload.get("backend_pid"))

    STATE_PATH.unlink(missing_ok=True)
    URL_PATH.unlink(missing_ok=True)
    print("Public share stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
