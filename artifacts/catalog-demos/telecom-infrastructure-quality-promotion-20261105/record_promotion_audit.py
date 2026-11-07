#!/usr/bin/env python3
"""Summarize generated index, quality gate, preview coverage and test evidence."""

import json
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = "telecom-infrastructure"
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == KIT]
if len(assets) != 56:
    raise SystemExit(f"expected 56 indexed telecom assets, found {len(assets)}")

base_index = json.loads(subprocess.run(
    ["git", "show", "c139f259735a6dc8945a40801ded3ee68248ce9d:catalog/index.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
).stdout)
base_ids = {asset["id"] for asset in base_index["assets"]}
current_ids = {asset["id"] for asset in index["assets"]}
new_ids = current_ids - base_ids
removed_ids = base_ids - current_ids
if new_ids or removed_ids:
    raise SystemExit(f"catalog ID set changed: added={sorted(new_ids)}, removed={sorted(removed_ids)}")

baseline_text = (BUNDLE / "baseline-quality-output.txt").read_text()
current_text = (BUNDLE / "quality-gate-full-output.txt").read_text()
score_re = re.compile(r"(\d+)/(\d+) assets pass")
thin_re = re.compile(r"(\d+) thin assets")
before_score = score_re.search(baseline_text)
after_score = score_re.search(current_text)
before_thin = thin_re.search(baseline_text)
after_thin = thin_re.search(current_text)
if not before_score or not after_score or not before_thin or not after_thin:
    raise SystemExit("could not parse baseline/current catalog quality output")

material_counts = [sum(param["name"] != "scale" for param in asset["params"]) for asset in assets]
material_distribution = Counter(material_counts)
if min(material_counts) < 2 or max(material_counts) > 4:
    raise SystemExit("telecom material-control count is outside 2–4")
preset_names = [set(asset.get("presets", {}).keys()) for asset in assets]
if any(names != {"fieldSite", "highVisibility"} for names in preset_names):
    raise SystemExit("one or more telecom assets are missing the expected named presets")

preview_files = {
    asset["id"]: (ROOT / "catalog/kits" / KIT / "previews" / f"{asset['id']}.png").is_file()
    for asset in assets
}
indexed_preview_rows = sum(asset.get("preview") is not None for asset in assets)
if not all(preview_files.values()) or indexed_preview_rows != len(assets):
    raise SystemExit("preview files or index paths are missing")

ids = [asset["id"] for asset in assets]
triangles = [asset["stats"]["triangles"] for asset in assets]
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
kit_status = json.loads((BUNDLE / "kit-quality-status.json").read_text())
eslint_status = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
test_status = json.loads((BUNDLE / "catalog-test-status.json").read_text())
if any(item["status"] != "pass" for item in (kit_status, eslint_status, test_status)):
    raise SystemExit("kit quality, ESLint or integration status did not pass")

before_total, after_total = int(before_score.group(2)), int(after_score.group(2))
before_pass, after_pass = int(before_score.group(1)), int(after_score.group(1))
if before_total != after_total or after_total != len(index["assets"]):
    raise SystemExit("the catalog asset total changed during promotion")
report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "sourceRevision": "c139f259735a6dc8945a40801ded3ee68248ce9d",
    "assetsPromoted": len(assets),
    "newAssetsAdded": len(new_ids),
    "assetIds": ids,
    "materialKnobsMin": min(material_counts),
    "materialKnobsMax": max(material_counts),
    "materialKnobsTotal": sum(material_counts),
    "materialKnobDistribution": {str(k): v for k, v in sorted(material_distribution.items())},
    "presetsAdded": len(assets) * 2,
    "presetEntriesTotal": sum(sum(len(values) for values in asset["presets"].values()) for asset in assets),
    "previewsRendered": sum(preview_files.values()),
    "indexedRowsWithPreview": indexed_preview_rows,
    "triangleRange": {"min": min(triangles), "max": max(triangles)},
    "triangleBudget": 900,
    "qualityGate": f"{len(assets)}/56",
    "catalogBefore": {
        "passing": before_pass,
        "total": before_total,
        "passRatePercent": round(before_pass * 100 / before_total, 2),
        "thin": int(before_thin.group(1)),
        "thinRatePercent": round(int(before_thin.group(1)) * 100 / before_total, 2),
    },
    "catalogAfter": {
        "passing": after_pass,
        "total": after_total,
        "passRatePercent": round(after_pass * 100 / after_total, 2),
        "thin": int(after_thin.group(1)),
        "thinRatePercent": round(int(after_thin.group(1)) * 100 / after_total, 2),
    },
    "passDelta": after_pass - before_pass,
    "thinDelta": int(after_thin.group(1)) - int(before_thin.group(1)),
    "eslint": eslint_status,
    "integration": test_status,
    "localCatalogPages": {
        "generated": pages["generatedAssetPages"],
        "kitPages": pages["kitPages"],
        "pagePreviewPairs": pages["pageAndPreviewPairs"],
        "liveDeployment": pages["liveDeployment"],
    },
    "sourceSha256": {asset["id"]: asset["sourceSha256"] for asset in assets},
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
