#!/usr/bin/env python3
"""Verify source/index freshness and that only the PLC row changed."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BASELINE = json.loads(subprocess.check_output(["git", "show", "HEAD:catalog/index.json"], cwd=ROOT))
CURRENT = json.loads((ROOT / "catalog/index.json").read_text())
TARGET = ("industrial-plant", "plc-control-rack")


def keyed(index: dict) -> dict[tuple[str, str], dict]:
    return {(row["kit"], row["id"]): row for row in index["assets"]}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


before_rows = keyed(BASELINE)
after_rows = keyed(CURRENT)
changed = sorted(f"{kit}/{asset}" for (kit, asset), row in after_rows.items() if before_rows.get((kit, asset)) != row)
before_row = before_rows[TARGET]
after_row = after_rows[TARGET]
before_source = ROOT / "artifacts/catalog-demos/industrial-plant-plc-control-rack-status-led-material-review-20261117/before/plc-control-rack.kcad.ts"
after_source = ROOT / "catalog/kits/industrial-plant/plc-control-rack.kcad.ts"
preview = ROOT / "catalog/kits/industrial-plant/previews/plc-control-rack.png"

out = ROOT / "artifacts/catalog-demos/industrial-plant-plc-control-rack-status-led-material-review-20261117/verification"
(out / "index-row-before.json").write_text(json.dumps(before_row, indent=2) + "\n")
(out / "index-row-after.json").write_text(json.dumps(after_row, indent=2) + "\n")
(out / "before/index-row.json").parent.mkdir(parents=True, exist_ok=True)
(out / "before/index-row.json").write_text(json.dumps(before_row, indent=2) + "\n")
(out / "after/index-row.json").parent.mkdir(parents=True, exist_ok=True)
(out / "after/index-row.json").write_text(json.dumps(after_row, indent=2) + "\n")

report = {
    "target": f"{TARGET[0]}/{TARGET[1]}",
    "baselineSourceSha256": sha(before_source),
    "baselineIndexSourceSha256": before_row["sourceSha256"],
    "afterSourceSha256": sha(after_source),
    "afterIndexSourceSha256": after_row["sourceSha256"],
    "baselineSourceHashMatchesIndex": sha(before_source) == before_row["sourceSha256"],
    "afterSourceHashMatchesIndex": sha(after_source) == after_row["sourceSha256"],
    "previewPath": after_row.get("preview"),
    "previewExists": preview.is_file(),
    "triangleCount": after_row.get("stats", {}).get("triangles"),
    "baselineAssetCount": len(BASELINE["assets"]),
    "afterAssetCount": len(CURRENT["assets"]),
    "baselineKitCount": len(BASELINE["kits"]),
    "afterKitCount": len(CURRENT["kits"]),
    "changedRows": changed,
    "onlyTargetRowChanged": changed == [f"{TARGET[0]}/{TARGET[1]}"],
}
(out / "index-verification.json").write_text(json.dumps(report, indent=2) + "\n")
(out / "index-diff-summary.json").write_text(json.dumps({"changedRows": changed, "count": len(changed), "onlyTargetRowChanged": report["onlyTargetRowChanged"]}, indent=2) + "\n")
print(json.dumps(report, indent=2))
