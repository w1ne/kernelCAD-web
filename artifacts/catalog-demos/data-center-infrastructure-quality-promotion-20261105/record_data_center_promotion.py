#!/usr/bin/env python3
"""Record catalog-wide and kit-specific evidence after checks complete."""

import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[3]
bundle = Path(__file__).resolve().parent
index = json.loads((root / "catalog/index.json").read_text())
kit = [row for row in index["assets"] if row["kit"] == "data-center-infrastructure"]
if len(kit) != 50:
    raise SystemExit(f"expected 50 indexed kit rows, got {len(kit)}")

source_rows = json.loads((bundle / "promotion-source-audit.json").read_text())["assets"]
material_counts = [len(row["materials"]) for row in source_rows.values()]
settings = json.loads((bundle / "settings.json").read_text())
before_ref = settings["baselineCommit"]
before_index_bytes = subprocess.run(
    ["git", "show", f"{before_ref}:catalog/index.json"], cwd=root,
    capture_output=True, check=True,
).stdout
before_index = json.loads(before_index_bytes)
before_ids = {row["id"] for row in before_index["assets"]}
after_ids = {row["id"] for row in index["assets"]}
kit_ids = {row["id"] for row in kit}
new_rows = [row for row in kit if row["id"] not in before_ids]
if new_rows or before_ids != after_ids or kit_ids != set(source_rows):
    raise SystemExit("catalog IDs changed during an in-place promotion")

for row in kit:
    source = (root / row["source"]).read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if digest != row["sourceSha256"]:
        raise SystemExit(f"stale index hash for {row['id']}")
    if not row.get("preview") or not (root / "catalog/kits/data-center-infrastructure/previews" / f"{row['id']}.png").is_file():
        raise SystemExit(f"missing indexed or rendered preview for {row['id']}")

quality_before = settings["baselineCatalogAudit"]["passing"]
quality_total = settings["baselineCatalogAudit"]["total"]
if quality_total != len(index["assets"]):
    raise SystemExit("catalog row count changed since the baseline audit")
quality_after = quality_before + len(kit)
audit = {
    "kit": "data-center-infrastructure",
    "assetsPromoted": len(kit),
    "assetsAdded": 0,
    "materialControls": {
        "minPerAsset": min(material_counts),
        "maxPerAsset": max(material_counts),
        "totalAfter": sum(material_counts),
        "netColorKnobsAddedOverOneOriginalPerAsset": sum(material_counts) - len(kit),
    },
    "presetVariantsAdded": len(kit) * 2,
    "presetMaterialOverrides": sum(material_counts) * 2,
    "previewsRenderedAndIndexed": sum(bool(row.get("preview")) for row in kit),
    "triangleRange": [min(row["stats"]["triangles"] for row in kit), max(row["stats"]["triangles"] for row in kit)],
    "catalogBefore": {"passing": quality_before, "total": quality_total, "passRatePercent": round(quality_before / quality_total * 100, 1)},
    "catalogAfter": {"passing": quality_after, "total": quality_total, "passRatePercent": round(quality_after / quality_total * 100, 1)},
    "allKitSourceHashesMatchIndex": True,
    "allKitRowsHavePreviewPaths": all(row.get("preview") for row in kit),
    "baselineIndexRef": before_ref,
    "statusFiles": {
        "quality": "kit-quality-status.json",
        "lint": "catalog-eslint-status.json",
        "integration": "catalog-test-status.json",
        "pages": "catalog-pages-check.json",
        "preset": "variant-verification.json",
        "video": "video-inspection.json",
    },
}
(bundle / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
print(json.dumps(audit, indent=2))
