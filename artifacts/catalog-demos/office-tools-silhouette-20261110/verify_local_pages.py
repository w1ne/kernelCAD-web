#!/usr/bin/env python3
"""Check the generated local catalog hub, changed asset pages, and copied previews."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
hub = (out / "catalog/index.html").read_text(encoding="utf-8")
assert 'href="/catalog/office/highlighter/"' in hub
assert 'href="/catalog/office/mechanical-pencil/"' in hub

checks = []
for asset_id, labels in {
    "highlighter": ["Barrel polymer", "Cap polymer", "Felt nib", "Fluorescent ink", "professional", "classroom"],
    "mechanical-pencil": ["Barrel aluminum", "Grip rubber", "Accent polymer", "Graphite lead", "professional", "classroom"],
}.items():
    source_row = next(a for a in index["assets"] if a["kit"] == "office" and a["id"] == asset_id)
    page_path = out / "catalog/office" / asset_id / "index.html"
    preview_path = out / "catalog/office" / asset_id / "preview.png"
    html = page_path.read_text(encoding="utf-8")
    for label in labels:
        assert label in html, f"{asset_id} local page omits {label}"
    source_preview = ROOT / "catalog/kits/office/previews" / f"{asset_id}.png"
    assert hashlib.sha256(preview_path.read_bytes()).hexdigest() == hashlib.sha256(source_preview.read_bytes()).hexdigest()
    assert source_row["preview"]
    checks.append({
        "id": asset_id,
        "page": str(page_path.relative_to(out)),
        "preview": str(preview_path.relative_to(out)),
        "checkedLabels": labels,
        "previewSha256": hashlib.sha256(preview_path.read_bytes()).hexdigest(),
    })

page_count = sum(1 for _ in (out / "catalog").glob("*/*/index.html"))
assert page_count == len(index["assets"]), f"generated {page_count} asset pages for {len(index['assets'])} index rows"
report = {
    "verified": True,
    "hub": "catalog/index.html",
    "assetPageCount": page_count,
    "catalogAssetCount": len(index["assets"]),
    "changedPages": checks,
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
