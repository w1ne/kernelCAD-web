#!/usr/bin/env python3
"""Recreate the catalog quality audit at the recorded pre-promotion revision."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
baseline_revision = (BUNDLE / "source-revision.txt").read_text().strip()
source_kits = ROOT / "catalog/kits"

with tempfile.TemporaryDirectory(prefix="kernelcad-catalog-quality-baseline-") as temp:
    baseline_kits = Path(temp) / "kits"
    baseline_kits.mkdir()
    for kit_dir in source_kits.iterdir():
        destination = baseline_kits / kit_dir.name
        if kit_dir.name != "theatre-production":
            os.symlink(kit_dir, destination, target_is_directory=True)
            continue
        destination.mkdir()
        for source in sorted(kit_dir.glob("*.kcad.ts")):
            relative = source.relative_to(ROOT).as_posix()
            restored = subprocess.run(
                ["git", "show", f"{baseline_revision}:{relative}"],
                cwd=ROOT,
                check=True,
                capture_output=True,
            )
            (destination / source.name).write_bytes(restored.stdout)
    result = subprocess.run(
        [sys.executable, "scripts/checkCatalogQuality.py", "--root", str(baseline_kits)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )

(BUNDLE / "baseline-catalog-quality-output.txt").write_text(result.stdout + result.stderr)
status = {
    "command": "python scripts/checkCatalogQuality.py --root <baseline snapshot>",
    "baselineRevision": baseline_revision,
    "exitCode": result.returncode,
    "status": "report-with-thin-assets" if result.returncode == 1 else "pass",
}
(BUNDLE / "baseline-catalog-quality-status.json").write_text(json.dumps(status, indent=2) + "\n")
print(json.dumps(status, indent=2))
