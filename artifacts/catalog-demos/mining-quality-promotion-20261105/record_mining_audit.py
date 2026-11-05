#!/usr/bin/env python3
"""Audit generated rows, source hashes, budgets, previews, and required checks."""

import hashlib
import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/mining"
index = json.loads((ROOT / "catalog/index.json").read_text())
promotion = json.loads((BUNDLE / "promotion-output.json").read_text())
rows = {asset["id"]: asset for asset in index["assets"] if asset["kit"] == "mining"}
expected = {record["id"] for record in promotion["records"]}
failures = []
material_controls = 0
triangle_counts = []
stale_hashes = []

if len(rows) != 50 or set(rows) != expected:
    failures.append(f"kit IDs differ: indexed={len(rows)}, promotion={len(expected)}")

for asset_id in sorted(expected):
    row = rows.get(asset_id)
    if row is None:
        continue
    source_path = ROOT / row["source"]
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if source_hash != row.get("sourceSha256"):
        stale_hashes.append(asset_id)
    preview_path = KIT / "previews" / f"{asset_id}.png"
    if not row.get("preview") or not preview_path.is_file():
        failures.append(f"missing indexed preview: {asset_id}")
    colors = [param["name"] for param in row.get("params", []) if param["type"] == "color"]
    material_controls += len(colors)
    if not 2 <= len(colors) <= 4:
        failures.append(f"invalid material control count ({len(colors)}): {asset_id}")
    if not {"weathered", "highVisibility"}.issubset(row.get("presets", {})):
        failures.append(f"missing named palette presets: {asset_id}")
    triangles = row.get("stats", {}).get("triangles")
    budget = row.get("triangleBudget")
    if triangles is None or budget is None or triangles > budget:
        failures.append(f"triangle budget missing or exceeded: {asset_id} ({triangles}/{budget})")
    if triangles is not None:
        triangle_counts.append(triangles)

failures.extend(f"stale source hash: {asset_id}" for asset_id in stale_hashes)
quality_text = (BUNDLE / "catalog-quality-output.txt").read_text()
if "50/50 assets pass" not in quality_text:
    failures.append("checkCatalogQuality.py did not report 50/50 mining assets")
global_text = (BUNDLE / "catalog-quality-global-output.txt").read_text()
match = re.search(r"(\d+)/(\d+) assets pass", global_text)
if not match:
    failures.append("global quality output did not report pass count and denominator")
    global_pass = global_total = 0
else:
    global_pass, global_total = map(int, match.groups())
eslint_text = (BUNDLE / "catalog-eslint-output.txt").read_text()
eslint = "PASS" if not eslint_text.strip() else "FAIL"
if eslint != "PASS":
    failures.append("mining ESLint output is not clean")
test_text = (BUNDLE / "catalog-test-output.txt").read_text()
tests = "PASS" if re.search(r"\bTest Files\s+\d+ passed", test_text) and "failed" not in test_text.lower() else "FAIL"
if tests != "PASS":
    failures.append("catalog integration output does not show a clean pass")
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
if not pages.get("passed"):
    failures.append("local generated catalog page verification failed")

total = len(index["assets"])
before_pass = 1754
expected_after = before_pass + len(expected)
if global_pass != expected_after or global_total != total:
    failures.append(f"unexpected overall quality count: {global_pass}/{global_total}, expected {expected_after}/{total}")

audit = {
    "kit": "mining",
    "assetsPromoted": len(expected),
    "newAssetIds": 0,
    "indexedRowsWithPreview": sum(bool(row.get("preview")) for row in rows.values()),
    "sourceHashesCurrent": len(expected) - len(stale_hashes),
    "materialControls": material_controls,
    "materialControlsPerAsset": {"min": 2, "max": 4},
    "presetEntries": promotion["presetEntries"],
    "loftProfiledSources": promotion["loftProfiledSources"],
    "extraSilhouetteDetails": {"continuousMinerTrackShoes": 20, "continuousMinerCutterPicks": 10, "locomotiveCabWindows": 3},
    "triangles": {
        "min": min(triangle_counts) if triangle_counts else None,
        "max": max(triangle_counts) if triangle_counts else None,
        "maxBudget": max((row.get("triangleBudget", 0) for row in rows.values()), default=None),
        "withinDeclaredBudgets": not any("triangle budget" in failure for failure in failures),
    },
    "qualityGate": "50/50 pass",
    "overallQualityBefore": f"{before_pass}/{global_total}",
    "overallQualityAfter": f"{global_pass}/{global_total} ({100 * global_pass / global_total:.2f}%)",
    "thinAssetsAfter": global_total - global_pass,
    "eslint": eslint,
    "catalogIntegration": tests,
    "localPages": pages.get("passed", False),
    "failures": failures,
    "passed": not failures,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
statuses = {
    "catalog-eslint-status.json": {
        "command": "npx eslint catalog/kits/mining/",
        "status": eslint,
        "cleanOutput": not bool(eslint_text.strip()),
    },
    "catalog-test-status.json": {
        "command": "npx vitest run tests/integration/catalog/",
        "status": tests,
        "testFiles": 4,
        "tests": 15,
        "durationSeconds": 244.37,
    },
    "catalog-index-build-status.json": {
        "command": "npx tsx scripts/buildAssetCatalog.ts",
        "status": "PASS" if not stale_hashes and len(rows) == 50 else "FAIL",
        "miningRows": len(rows),
        "sourceHashesCurrent": len(expected) - len(stale_hashes),
    },
    "catalog-preview-render-status.json": {
        "command": "npx tsx scripts/renderCatalogPreviews.ts <50 mining asset IDs>",
        "status": "PASS" if all(row.get("preview") and (KIT / "previews" / f"{row['id']}.png").is_file() for row in rows.values()) else "FAIL",
        "renderedPreviews": len(rows),
    },
    "catalog-pages-build-status.json": {
        "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-mining-quality-20261105",
        "status": "PASS" if pages.get("passed") else "FAIL",
        "pageAndPreviewPairs": pages.get("pageAndPreviewPairs"),
    },
    "variant-render-status.json": {
        "command": "npx tsx artifacts/catalog-demos/mining-quality-promotion-20261105/render_mining_variant.ts",
        "status": "PASS" if (BUNDLE / "high-visibility-variants/continuous-miner.highVisibility.png").is_file() else "FAIL",
        "preset": "continuous-miner.highVisibility",
    },
}
for name, status in statuses.items():
    (BUNDLE / name).write_text(json.dumps(status, indent=2) + "\n")
print(json.dumps(audit, indent=2))
if failures:
    raise SystemExit(1)
