#!/usr/bin/env python3
"""Record source hashes, preview coverage, triangle budgets, and quality totals."""

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "postal-logistics"]
failures = []
rows = []
for asset in assets:
    source = ROOT / asset["source"]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    preview = ROOT / "catalog/kits/postal-logistics/previews" / f"{asset['id']}.png"
    expected_preview = f"/assets/postal-logistics-{asset['id']}.png"
    if digest != asset["sourceSha256"]:
        failures.append(f"source hash mismatch: {asset['id']}")
    if not preview.is_file() or asset.get("preview") != expected_preview:
        failures.append(f"preview is missing or unindexed: {asset['id']}")
    if asset["stats"]["triangles"] > asset["triangleBudget"]:
        failures.append(f"triangle budget exceeded: {asset['id']}")
    rows.append({
        "id": asset["id"],
        "sha256Matches": digest == asset["sourceSha256"],
        "previewPath": asset.get("preview"),
        "previewExists": preview.is_file(),
        "triangleCount": asset["stats"]["triangles"],
        "triangleBudget": asset["triangleBudget"],
        "materialControls": [param["name"] for param in asset["params"] if param["type"] == "color"],
        "presets": sorted((asset.get("presets") or {}).keys()),
    })

quality = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py"],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    check=False,
)
(BUNDLE / "catalog-quality-output.txt").write_text(quality.stdout)
kit_quality = subprocess.run(
    ["python3", "scripts/checkCatalogQuality.py", "--kit", "postal-logistics"],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    check=False,
)
(BUNDLE / "postal-logistics-quality-output.txt").write_text(kit_quality.stdout)
summary = [line.strip() for line in quality.stdout.splitlines() if "assets pass" in line or "thin assets" in line]
before_output_path = BUNDLE / "catalog-quality-before-round-output.txt"
before_summary = []
quality_delta = None
if before_output_path.is_file():
    before_output = before_output_path.read_text()
    before_summary = [line.strip() for line in before_output.splitlines() if "assets pass" in line or "thin assets" in line]
    before_pass = re.search(r"(\d+)/(\d+) assets pass", before_output)
    after_pass = re.search(r"(\d+)/(\d+) assets pass", quality.stdout)
    before_thin = re.search(r"(\d+) thin assets", before_output)
    after_thin = re.search(r"(\d+) thin assets", quality.stdout)
    if before_pass and after_pass and before_thin and after_thin:
        quality_delta = {
            "assetsPromotedToPass": int(after_pass.group(1)) - int(before_pass.group(1)),
            "thinAssetsReduced": int(before_thin.group(1)) - int(after_thin.group(1)),
            "beforePassingAssets": int(before_pass.group(1)),
            "afterPassingAssets": int(after_pass.group(1)),
        }
report = {
    "catalogAssetCount": len(index["assets"]),
    "kit": "postal-logistics",
    "assets": len(assets),
    "indexedSourceHashesMatch": sum(row["sha256Matches"] for row in rows),
    "indexedPreviewsExist": sum(row["previewExists"] and row["previewPath"] is not None for row in rows),
    "triangleMinimum": min(row["triangleCount"] for row in rows),
    "triangleMaximum": max(row["triangleCount"] for row in rows),
    "catalogQualityGate": "passed" if quality.returncode == 0 else "thin assets remain in other kits",
    "kitQualityGate": "passed" if kit_quality.returncode == 0 else "failed",
    "catalogQualitySummary": summary,
    "catalogQualityBeforeRoundSummary": before_summary,
    "catalogQualityDeltaThisRound": quality_delta,
    "sourceAndPreviewChecksPassed": not failures,
    "failures": failures,
    "assetsAudit": rows,
}
report["passed"] = not failures and kit_quality.returncode == 0 and len(assets) == 52 and report["indexedSourceHashesMatch"] == 52 and report["indexedPreviewsExist"] == 52
(BUNDLE / "promotion-audit.json").write_text(json.dumps(report, indent=2) + "\n")

test_output_path = BUNDLE / "catalog-test-output.txt"
test_status_path = BUNDLE / "catalog-test-status.json"
if test_output_path.is_file() and test_status_path.is_file():
    test_output = test_output_path.read_text()
    test_status = json.loads(test_status_path.read_text())
    files_match = re.search(r"Test Files\s+(\d+) passed", test_output)
    tests_match = re.search(r"Tests\s+(\d+) passed", test_output)
    if files_match and tests_match:
        test_status["summary"] = f"{tests_match.group(1)} tests passed across {files_match.group(1)} files"
        test_status_path.write_text(json.dumps(test_status, indent=2) + "\n")

print(json.dumps({key: value for key, value in report.items() if key != "assetsAudit"}, indent=2))
if not report["passed"]:
    raise SystemExit(1)
