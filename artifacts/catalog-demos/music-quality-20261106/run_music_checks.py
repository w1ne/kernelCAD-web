#!/usr/bin/env python3
"""Run the required music quality/lint/catalog checks and save their exact output."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGES = Path("/tmp/kernelcad-music-quality-pages")
checks = [
    ("kit-quality", ["python3", "scripts/checkCatalogQuality.py", "--kit", "music"], 0),
    ("catalog-quality", ["python3", "scripts/checkCatalogQuality.py", "--top", "1"], 1),
    ("eslint", ["npx", "eslint", "catalog/kits/music/"], 0),
    ("catalog-integration", ["npx", "vitest", "run", "tests/integration/catalog/"], 0),
    ("catalog-pages", ["npx", "tsx", "scripts/buildCatalogPages.ts", str(PAGES)], 0),
    ("catalog-pages-verify", ["python3", "artifacts/catalog-demos/music-quality-20261106/verify_music_pages.py", str(PAGES)], 0),
]
results = []
for name, command, expected in checks:
    completed = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output_path = BUNDLE / f"{name}-output.txt"
    output_path.write_text(completed.stdout)
    result = {
        "name": name,
        "command": " ".join(command),
        "exitCode": completed.returncode,
        "expectedExitCode": expected,
        "output": str(output_path.relative_to(ROOT)),
        "passedExpectedStatus": completed.returncode == expected,
    }
    results.append(result)
    print(f"{name}: exit {completed.returncode} (expected {expected})")
    if completed.returncode != expected:
        print(completed.stdout)

(BUNDLE / "check-results.json").write_text(json.dumps(results, indent=2) + "\n")
if any(not result["passedExpectedStatus"] for result in results if result["name"] != "catalog-quality"):
    sys.exit(1)
