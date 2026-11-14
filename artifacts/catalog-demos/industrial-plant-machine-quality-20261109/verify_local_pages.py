"""Verify generated public catalog pages and copied previews for changed assets."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit("usage: verify_local_pages.py <catalog-pages-out-dir>")
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
targets = ["diesel-generator-set", "belt-conveyor", "industrial-transformer"]
reports = []
for asset_id in targets:
    row = next(asset for asset in index["assets"] if asset["kit"] == "industrial-plant" and asset["id"] == asset_id)
    page = OUT / "catalog/industrial-plant" / asset_id / "index.html"
    copied_preview = OUT / "catalog/industrial-plant" / asset_id / "preview.png"
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits/industrial-plant/previews" / f"{asset_id}.png"
    html = page.read_text(encoding="utf-8")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    preview_hash = hashlib.sha256(preview.read_bytes()).hexdigest()
    copied_hash = hashlib.sha256(copied_preview.read_bytes()).hexdigest()
    labels = [param.get("label", param["name"]) for param in row["params"]]
    choices = [choice for param in row["params"] for choice in param.get("choices", [])]
    checks = {
        "sourceSha256MatchesIndex": source_hash == row["sourceSha256"],
        "pageHasCurrentTitle": f"<h1>{row['title']}</h1>" in html,
        "pageShowsMaterialAndGeometryControls": all(label in html for label in labels if label != "Overall scale"),
        "pageShowsPresets": all(preset in html for preset in row["presets"]),
        "pageShowsGeometryChoices": all(choice in html for choice in choices),
        "previewCopiedFromCurrentRender": preview_hash == copied_hash,
        "pageLinksToStudio": "Open in Studio" in html,
    }
    reports.append({
        "asset": asset_id,
        "page": str(page),
        "sourceSha256": source_hash,
        "indexSourceSha256": row["sourceSha256"],
        "previewSha256": preview_hash,
        "copiedPreviewSha256": copied_hash,
        "checks": checks,
        "allPassed": all(checks.values()),
    })

report = {"outputDirectory": str(OUT), "assets": reports, "allPassed": all(item["allPassed"] for item in reports)}
(BUNDLE / "local-page-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
