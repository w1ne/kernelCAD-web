#!/usr/bin/env python3
"""Record this target's quality-gate result and unchanged baseline failures."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score


target_path = "catalog/kits/industrial-plant/palletizer-robot-cell.kcad.ts"
target = score(str(ROOT / target_path))
kit = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py", "--kit", "industrial-plant"],
    cwd=ROOT,
    capture_output=True,
    text=True,
)
catalog = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py"],
    cwd=ROOT,
    capture_output=True,
    text=True,
)
bad = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py", "--fix-list"],
    cwd=ROOT,
    capture_output=True,
    text=True,
)
bad_paths = [line for line in bad.stdout.splitlines() if line.strip()]
baseline_matches = {}
for path in bad_paths:
    baseline = subprocess.run(
        ["git", "show", f"origin/develop:{path}"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    ).stdout
    baseline_matches[path] = baseline == (ROOT / path).read_bytes()

(BUNDLE / "verification/catalog-quality.log").write_text(catalog.stdout + catalog.stderr, encoding="utf-8")
(BUNDLE / "verification/industrial-plant-quality.log").write_text(kit.stdout + kit.stderr, encoding="utf-8")
result = {
    "invocations": {
        "target": "python3 scripts/checkCatalogQuality.py --kit industrial-plant --fix-list",
        "kit": "python3 scripts/checkCatalogQuality.py --kit industrial-plant",
        "catalog": "python3 scripts/checkCatalogQuality.py",
    },
    "target": {
        "path": target_path,
        "materialNamedControls": target.colours,
        "presetsBlocks": target.presets,
        "passes": passes(target, 2),
    },
    "kitExitCode": kit.returncode,
    "catalogExitCode": catalog.returncode,
    "failingAssets": baseline_matches,
    "allReportedFailuresMatchOriginDevelop": all(baseline_matches.values()),
    "summary": "The selected asset passes. Other gate failures are retained from origin/develop and are outside this change.",
}
result["pass"] = result["target"]["passes"] and result["allReportedFailuresMatchOriginDevelop"]
(BUNDLE / "verification/quality-gate.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("selected asset failed the quality gate or a reported baseline failure changed")
print(f"Selected asset passes with {target.colours} material-named controls and {target.presets} presets.")
print(f"Kit checker exit={kit.returncode}; catalog checker exit={catalog.returncode}; all failing assets match origin/develop.")
