#!/usr/bin/env python3
"""Record exact source, preview, material, preset, and triangle evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
IDS = (BUNDLE / "preview-asset-ids.txt").read_text(encoding="utf-8").splitlines()
current = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
baseline_text = subprocess.check_output(["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True)
baseline = json.loads(baseline_text)
current_rows = {asset["id"]: asset for asset in current["assets"]}
baseline_ids = {asset["id"] for asset in baseline["assets"]}
current_ids = set(current_rows)
quality = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py"], cwd=ROOT, text=True,
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
)
changed = []
issues = []
for asset_id in IDS:
    asset = current_rows.get(asset_id)
    if asset is None:
        issues.append(f"{asset_id}: missing from current index")
        continue
    source = ROOT / asset["source"]
    preview = ROOT / "catalog" / "kits" / asset["kit"] / "previews" / f"{asset_id}.png"
    digest = hashlib.sha256(source.read_bytes()).hexdigest() if source.is_file() else None
    color_params = [param["name"] for param in asset["params"] if param["type"] == "color"]
    triangles = asset.get("stats", {}).get("triangles")
    budget = asset.get("triangleBudget")
    source_matches = digest == asset.get("sourceSha256")
    preview_exists = preview.is_file()
    budget_ok = triangles is not None and budget is not None and triangles <= budget
    if not source_matches:
        issues.append(f"{asset_id}: source hash mismatch")
    if not preview_exists:
        issues.append(f"{asset_id}: rendered preview missing")
    if len(color_params) < 2 or not asset.get("presets"):
        issues.append(f"{asset_id}: material controls or presets missing")
    if not budget_ok:
        issues.append(f"{asset_id}: triangle budget exceeded or stats missing")
    changed.append({
        "id": asset_id,
        "title": asset["title"],
        "source": asset["source"],
        "sourceSha256": digest,
        "sourceHashMatchesIndex": source_matches,
        "preview": asset.get("preview"),
        "previewFileExists": preview_exists,
        "colorControls": color_params,
        "presets": sorted(asset.get("presets", {}).keys()),
        "triangles": triangles,
        "triangleBudget": budget,
        "withinTriangleBudget": budget_ok,
    })

result = {
    "baselineIndexAssetCount": len(baseline["assets"]),
    "currentIndexAssetCount": len(current["assets"]),
    "addedAssetIds": sorted(current_ids - baseline_ids),
    "removedAssetIds": sorted(baseline_ids - current_ids),
    "changedAssets": changed,
    "catalogQualityGate": {
        "exitCode": quality.returncode,
        "output": quality.stdout.strip(),
        "passed": quality.returncode == 0,
    },
    "issues": issues,
    "passed": not issues and quality.returncode == 0 and current_ids == baseline_ids,
}
(BUNDLE / "catalog-asset-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
