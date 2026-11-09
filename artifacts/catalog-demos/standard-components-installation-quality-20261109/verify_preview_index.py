#!/usr/bin/env python3
"""Check every standard-components source hash and generated preview path."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == "standard-components"]
rows = []
for asset in assets:
    source_path = ROOT / asset["source"]
    preview_path = ROOT / "catalog/kits/standard-components/previews" / f"{asset['id']}.png"
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    expected_route = f"/assets/standard-components-{asset['id']}.png"
    rows.append({
        "id": asset["id"],
        "sourceSha256": source_hash,
        "sourceShaMatches": source_hash == asset["sourceSha256"],
        "previewRouteMatches": asset.get("preview") == expected_route,
        "previewExists": preview_path.is_file(),
        "previewSha256": hashlib.sha256(preview_path.read_bytes()).hexdigest() if preview_path.is_file() else None,
    })

expected_ids = {"base-mounting-plate", "blind-flange", "pipe-coupling", "pipe-flange", "rubber-bumper"}
changed = [row for row in assets if row["id"] in expected_ids]
index_hash = hashlib.sha256((ROOT / "catalog/index.json").read_bytes()).hexdigest()
report = {
    "kit": "standard-components",
    "kitAssetCount": len(assets),
    "catalogIndexSha256": index_hash,
    "allPreviewRoutesAndFilesPass": len(rows) == 50 and all(row["previewRouteMatches"] and row["previewExists"] for row in rows),
    "allKitSourcesMatchIndex": len(rows) == 50 and all(row["sourceShaMatches"] for row in rows),
    "changedAssets": [
        {
            **next(check for check in rows if check["id"] == asset["id"]),
            "params": asset["params"],
            "presetNames": sorted(asset["presets"]),
        }
        for asset in changed
    ],
    "assets": rows,
}
report["changedAssetsAllPass"] = len(changed) == 5 and all(
    row["sourceShaMatches"] and row["previewRouteMatches"] and row["previewExists"] for row in report["changedAssets"]
)
(BUNDLE / "preview-index-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
hash_lines = [f"{index_hash}  catalog/index.json"]
for row in report["changedAssets"]:
    hash_lines.append(f"{row['sourceSha256']}  catalog/kits/standard-components/{row['id']}.kcad.ts")
    hash_lines.append(f"{row['previewSha256']}  catalog/kits/standard-components/previews/{row['id']}.png")
(BUNDLE / "source-preview-sha256.txt").write_text("\n".join(hash_lines) + "\n", encoding="utf-8")
print(json.dumps({key: report[key] for key in ["kit", "kitAssetCount", "allPreviewRoutesAndFilesPass", "allKitSourcesMatchIndex", "changedAssetsAllPass"]}, indent=2))
if not report["allPreviewRoutesAndFilesPass"] or not report["allKitSourcesMatchIndex"] or not report["changedAssetsAllPass"]:
    raise SystemExit(1)
