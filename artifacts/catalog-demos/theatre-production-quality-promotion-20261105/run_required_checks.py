#!/usr/bin/env python3
"""Capture the required kit quality, ESLint and catalog integration checks."""

import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
COMMANDS = [
    ("kit-quality", [sys.executable, "scripts/checkCatalogQuality.py", "--kit", "theatre-production"], {}),
    ("catalog-eslint", ["npx", "eslint", "catalog/kits/theatre-production/"], {}),
    (
        "catalog-test",
        ["npx", "vitest", "run", "tests/integration/catalog/", "--maxWorkers=1", "--no-file-parallelism"],
        {"NODE_OPTIONS": "--max-old-space-size=8192"},
    ),
]

failures = []
for name, command, extra_env in COMMANDS:
    env = os.environ.copy()
    env.update(extra_env)
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    output = result.stdout + result.stderr
    (BUNDLE / f"{name}-output.txt").write_text(output)
    status = {
        "command": " ".join(command),
        "environment": extra_env,
        "exitCode": result.returncode,
        "status": "pass" if result.returncode == 0 else "fail",
    }
    (BUNDLE / f"{name}-status.json").write_text(json.dumps(status, indent=2) + "\n")
    print(f"{name}: {status['status']} (exit {result.returncode})")
    if output.strip():
        print(output[-2500:])
    if result.returncode != 0:
        failures.append(name)

if failures:
    raise SystemExit(f"checks failed: {', '.join(failures)}")
