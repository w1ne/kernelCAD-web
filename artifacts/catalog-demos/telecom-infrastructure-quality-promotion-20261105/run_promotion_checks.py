#!/usr/bin/env python3
"""Run and capture the telecom promotion quality, lint, integration and page checks."""

import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
COMMANDS = [
    (
        "kit-quality",
        [sys.executable, "scripts/checkCatalogQuality.py", "--kit", "telecom-infrastructure"],
        {},
    ),
    (
        "quality-gate-full",
        [sys.executable, "scripts/checkCatalogQuality.py", "--top", "1"],
        {},
    ),
    (
        "catalog-eslint",
        ["npx", "eslint", "catalog/kits/telecom-infrastructure/"],
        {},
    ),
    (
        "catalog-test",
        ["npx", "vitest", "run", "tests/integration/catalog/", "--maxWorkers=1", "--no-file-parallelism"],
        {"NODE_OPTIONS": "--max-old-space-size=8192"},
    ),
    (
        "catalog-pages",
        ["npx", "tsx", "artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/check_telecom_pages.mts"],
        {},
    ),
]

results = []
failures = []
for name, command, extra_env in COMMANDS:
    env = os.environ.copy()
    env.update(extra_env)
    result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    output = result.stdout + result.stderr
    (BUNDLE / f"{name}-output.txt").write_text(output)
    if name == "quality-gate-full":
        passed = result.returncode in (0, 1)
        status_name = "report" if passed else "fail"
    else:
        passed = result.returncode == 0
        status_name = "pass" if passed else "fail"
    status = {
        "command": " ".join(command),
        "environment": extra_env,
        "exitCode": result.returncode,
        "status": status_name,
    }
    (BUNDLE / f"{name}-status.json").write_text(json.dumps(status, indent=2) + "\n")
    results.append({"name": name, **status})
    if not passed:
        failures.append(name)
    print(f"{name}: {status['status']} (exit {result.returncode})")
    if output.strip():
        print(output[-3000:])

if failures:
    raise SystemExit(f"checks failed: {', '.join(failures)}")

print(json.dumps({"results": results}, indent=2))
