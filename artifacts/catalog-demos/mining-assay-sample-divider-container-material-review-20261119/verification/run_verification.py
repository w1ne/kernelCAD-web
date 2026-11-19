#!/usr/bin/env python3
"""Run and retain the focused regression, lint, quality and catalog suite."""

from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
COMMANDS = [
    (
        "eslint.txt",
        ["npx", "eslint", "catalog/kits/mining/", "tests/integration/catalog/assaySampleDividerContainerMaterial.test.ts"],
    ),
    ("quality-kit.txt", ["python3", "scripts/checkCatalogQuality.py", "--kit", "mining"]),
    ("quality-global.txt", ["python3", "scripts/checkCatalogQuality.py"]),
    (
        "test-focused-after.txt",
        ["npx", "vitest", "run", "tests/integration/catalog/assaySampleDividerContainerMaterial.test.ts"],
    ),
    ("catalog-integration.txt", ["npx", "vitest", "run", "tests/integration/catalog/"]),
]

for filename, command in COMMANDS:
    print("Running: " + " ".join(command), flush=True)
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    evidence = (
        "Command: " + " ".join(command) + "\n"
        + f"Exit code: {result.returncode}\n"
        + result.stdout
        + result.stderr
    )
    (BUNDLE / "verification" / filename).write_text(evidence)
    known_global_exceptions = (
        filename == "quality-global.txt"
        and result.returncode == 1
        and "MIXED  standard-components          46/50" in result.stdout
        and "2398/2402 assets pass" in result.stdout
    )
    if result.returncode != 0 and not known_global_exceptions:
        print(evidence)
        raise SystemExit(result.returncode)
    if known_global_exceptions:
        print("known global baseline exceptions recorded in standard-components", flush=True)
        continue
    summary = result.stdout.strip().splitlines()
    print(summary[-1] if summary else "passed", flush=True)
