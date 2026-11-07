#!/usr/bin/env python3
"""Retain machine-readable evidence for the catalog ESLint gate."""

import json
import subprocess
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
run = subprocess.run(["npx", "eslint", "catalog/", "--format", "json"], capture_output=True, text=True)
if not run.stdout.strip():
    raise SystemExit(f"ESLint produced no JSON output: {run.stderr}")
files = json.loads(run.stdout)
errors = sum(item["errorCount"] for item in files)
warnings = sum(item["warningCount"] for item in files)
result = {
    "command": "npx eslint catalog/",
    "status": "passed" if run.returncode == 0 and errors == 0 and warnings == 0 else "failed",
    "sourceFilesChecked": len(files),
    "errorCount": errors,
    "warningCount": warnings,
}
(BUNDLE / "catalog-eslint.json").write_text(json.dumps(result, indent=2) + "\n")
(BUNDLE / "catalog-eslint-raw.json").write_text(json.dumps(files, indent=2) + "\n")
print(json.dumps(result, indent=2))
if result["status"] != "passed":
    raise SystemExit(run.returncode or 1)
