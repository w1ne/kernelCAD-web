#!/usr/bin/env python3
"""Run and retain the required catalog integration suite."""
import json
import re
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
command = ["npx", "vitest", "run", "tests/integration/catalog/"]
result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
output = result.stdout + result.stderr
(BUNDLE / "catalog-tests-output.txt").write_text(output, encoding="utf-8")
summary_match = re.search(r"Test Files\s+(.+)", output)
tests_match = re.search(r"Tests\s+(.+)", output)
summary = {
    "command": " ".join(command),
    "exitCode": result.returncode,
    "testFiles": summary_match.group(1).strip() if summary_match else None,
    "tests": tests_match.group(1).strip() if tests_match else None,
    "summary": tests_match.group(1).strip() if tests_match else "see retained output",
    "passed": result.returncode == 0,
}
(BUNDLE / "catalog-tests.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
if result.returncode:
    raise SystemExit(result.returncode)
