"""Run and retain the long catalog integration check with a final status file."""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
OUTPUT = BUNDLE / "catalog-test-output-final.txt"
STATUS = BUNDLE / "catalog-test-process-final.json"
COMMAND = ["npx", "vitest", "run", "tests/integration/catalog/"]

started = time.time()
with OUTPUT.open("w", encoding="utf-8") as output:
    proc = subprocess.Popen(
        COMMAND,
        cwd=ROOT,
        stdout=output,
        stderr=subprocess.STDOUT,
        start_new_session=True,
        text=True,
    )
    STATUS.write_text(
        json.dumps(
            {
                "command": " ".join(COMMAND),
                "pid": proc.pid,
                "processEnded": False,
                "status": "running",
                "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started)),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    exit_code = proc.wait()

text = OUTPUT.read_text(encoding="utf-8", errors="replace")
duration = round(time.time() - started, 2)
status = {
    "command": " ".join(COMMAND),
    "pid": proc.pid,
    "processEnded": True,
    "exitCode": exit_code,
    "status": "passed" if exit_code == 0 else "failed",
    "durationSeconds": duration,
    "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "testFilesPassed": 4 if exit_code == 0 and "Test Files  4 passed" in text else None,
    "testsPassed": 15 if exit_code == 0 and "Tests  15 passed" in text else None,
}
STATUS.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
raise SystemExit(exit_code)
