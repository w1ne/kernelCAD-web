#!/usr/bin/env python3
"""Prove the focused regression detects the original container assignment."""

from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "catalog/kits/mining/assay-sample-divider.kcad.ts"
BEFORE = BUNDLE / "before/assay-sample-divider.kcad.ts"
OUTPUT = BUNDLE / "verification/test-before.txt"
TEST = "tests/integration/catalog/assaySampleDividerContainerMaterial.test.ts"

after = SOURCE.read_bytes()
try:
    SOURCE.write_bytes(BEFORE.read_bytes())
    command = ["npx", "vitest", "run", TEST]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
finally:
    SOURCE.write_bytes(after)

OUTPUT.write_text(
    "Command: " + " ".join(command) + "\n"
    + f"Exit code: {result.returncode}\n"
    + result.stdout
    + result.stderr
)
if result.returncode == 0:
    raise SystemExit("The focused regression unexpectedly passed on the original source")
print(f"Baseline regression failed as expected; evidence: {OUTPUT.relative_to(ROOT)}")
