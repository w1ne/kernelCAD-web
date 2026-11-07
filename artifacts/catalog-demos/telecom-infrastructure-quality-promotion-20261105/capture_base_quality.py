#!/usr/bin/env python3
"""Re-run the catalog quality gate against the exact pre-promotion commit."""

import json
import subprocess
import tarfile
import tempfile
from io import BytesIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
REVISION = "c139f259735a6dc8945a40801ded3ee68248ce9d"
archive = subprocess.run(
    ["git", "archive", REVISION, "catalog/kits"], cwd=ROOT, check=True, capture_output=True
)

with tempfile.TemporaryDirectory(prefix="kcad-telecom-quality-base-") as temp:
    with tarfile.open(fileobj=BytesIO(archive.stdout), mode="r:") as tar:
        tar.extractall(temp, filter="data")
    result = subprocess.run(
        ["python", "scripts/checkCatalogQuality.py", "--root", str(Path(temp) / "catalog/kits")],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )

output = result.stdout + result.stderr
(BUNDLE / "baseline-quality-output.txt").write_text(output)
status = {
    "sourceRevision": REVISION,
    "command": "python scripts/checkCatalogQuality.py --root <archived-base>/catalog/kits",
    "exitCode": result.returncode,
    "reportOnly": True,
}
(BUNDLE / "baseline-quality-status.json").write_text(json.dumps(status, indent=2) + "\n")
print(output, end="")
if result.returncode not in (0, 1):
    raise SystemExit(result.returncode)
