#!/usr/bin/env python3
"""Run the exact 50-ID preview invocation stored in demo-settings.json."""

import json
import shlex
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
settings = json.loads((BUNDLE / "demo-settings.json").read_text())
command = shlex.split(settings["previewInvocation"])
run = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
output = f"COMMAND: {' '.join(command)}\nEXIT CODE: {run.returncode}\n{run.stdout}{run.stderr}"
(BUNDLE / "preview-render-output.txt").write_text(output)
print(output)
raise SystemExit(run.returncode)
