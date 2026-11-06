#!/usr/bin/env python3
"""Summarize source hashes, quality, previews, lint, tests and local pages."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "music"]
if len(assets) != 40:
    raise SystemExit(f"expected 40 indexed music assets, got {len(assets)}")

records = []
material_controls = 0
for asset in assets:
    source = ROOT / asset["source"]
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != asset["sourceSha256"]:
        raise SystemExit(f"{asset['id']}: index sourceSha256 mismatch")
    material_names = [param["name"] for param in asset["params"] if param["name"] != "scale"]
    if not 2 <= len(material_names) <= 4 or {"color", "color2", "colour"} & set(material_names):
        raise SystemExit(f"{asset['id']}: invalid material controls {material_names}")
    if set(asset["presets"]) != {"concert", "vintage"}:
        raise SystemExit(f"{asset['id']}: missing named presets {asset['presets']}")
    preview_path = ROOT / "catalog/kits/music/previews" / f"{asset['id']}.png"
    if not preview_path.is_file() or not asset.get("preview"):
        raise SystemExit(f"{asset['id']}: missing generated preview or index preview path")
    if not 0 < asset["stats"]["triangles"] <= asset["triangleBudget"]:
        raise SystemExit(f"{asset['id']}: triangle count exceeds budget")
    material_controls += len(material_names)
    records.append({
        "id": asset["id"],
        "source": asset["source"],
        "sourceSha256": source_hash,
        "materialControls": material_names,
        "presets": asset["presets"],
        "preview": asset["preview"],
        "triangles": asset["stats"]["triangles"],
        "triangleBudget": asset["triangleBudget"],
    })

kit_output = (BUNDLE / "kit-quality-output.txt").read_text()
kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_output)
full_output = (BUNDLE / "catalog-quality-output.txt").read_text()
catalog_match = re.search(r"(\d+)/(\d+) assets pass", full_output)
thin_match = re.search(r"(\d+) thin assets", full_output)
if not kit_match or not catalog_match or not thin_match:
    raise SystemExit("could not parse quality gate outputs")

results = {item["name"]: item for item in json.loads((BUNDLE / "check-results.json").read_text())}
eslint = results["eslint"]
integration_output = (BUNDLE / "catalog-integration-output.txt").read_text()
files_match = re.search(r"Test Files\s+(\d+) passed", integration_output)
tests_match = re.search(r"Tests\s+(\d+) passed", integration_output)
if not files_match or not tests_match:
    raise SystemExit("could not parse passing catalog integration summary")
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
passing, total = map(int, catalog_match.groups())
report = {
    "kit": "music",
    "assetCount": len(assets),
    "musicPassing": int(kit_match.group(1)),
    "musicTotal": int(kit_match.group(2)),
    "materialControls": material_controls,
    "presetEntries": sum(len(asset["presets"]) for asset in assets),
    "previewCount": sum(bool(asset.get("preview")) for asset in assets),
    "catalogPassing": passing,
    "catalogTotal": total,
    "catalogPassRate": f"{100 * passing / total:.1f}%",
    "catalogThin": int(thin_match.group(1)),
    "eslint": "pass" if eslint["exitCode"] == 0 else "fail",
    "integrationFiles": int(files_match.group(1)),
    "integrationTests": int(tests_match.group(1)),
    "localPages": pages["musicPages"],
    "localPagesDeploymentVerified": pages["deploymentVerified"],
    "indexSourceHashesMatch": True,
    "assets": records,
    "commands": [item["command"] for item in results.values()],
}
(BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"{report['musicPassing']}/{report['musicTotal']} music assets; {material_controls} material controls; {report['presetEntries']} preset entries")
print(f"Catalog: {passing}/{total} passing ({report['catalogPassRate']}), {report['catalogThin']} thin remain")
print(f"Previews: {report['previewCount']}/40; integration: {report['integrationFiles']} files, {report['integrationTests']} tests")
