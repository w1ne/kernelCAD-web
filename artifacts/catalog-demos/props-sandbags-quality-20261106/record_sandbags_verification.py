#!/usr/bin/env python3
"""Verify source hashes, props previews, local pages and retained check results."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/props"
INDEX_PATH = ROOT / "catalog/index.json"
PAGES = Path("/tmp/kernelcad-props-pages-20261106/catalog/props")


def parse_count(text, label):
    match = re.search(r"(\d+)/(\d+) assets pass", text)
    if match is None:
        raise SystemExit(f"{label}: could not parse asset pass count")
    return {"passing": int(match.group(1)), "total": int(match.group(2))}


def main():
    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    catalog_output = (BUNDLE / "catalog-quality-output.txt").read_text(encoding="utf-8")
    kit_output = (BUNDLE / "props-quality-output.txt").read_text(encoding="utf-8")
    rows = {row["id"]: row for row in index["assets"] if row["kit"] == "props"}
    errors = []
    records = []
    for source_path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = source_path.name.removesuffix(".kcad.ts")
        row = rows.get(asset_id)
        if row is None:
            errors.append(f"{asset_id}: missing index row")
            continue
        source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
        preview_file = KIT / "previews" / f"{asset_id}.png"
        expected_preview = f"/assets/props-{asset_id}.png"
        triangles = row.get("stats", {}).get("triangles")
        budget = row.get("triangleBudget")
        if source_hash != row.get("sourceSha256"):
            errors.append(f"{asset_id}: source SHA-256 differs from index")
        if row.get("preview") != expected_preview or not preview_file.is_file():
            errors.append(f"{asset_id}: indexed preview missing or incorrect")
        if triangles is not None and budget is not None and triangles > budget:
            errors.append(f"{asset_id}: {triangles} triangles exceeds budget {budget}")
        records.append({
            "id": asset_id,
            "sourceSha256": source_hash,
            "indexSourceSha256": row.get("sourceSha256"),
            "preview": row.get("preview"),
            "previewFile": str(preview_file.relative_to(ROOT)),
            "triangleCount": triangles,
            "triangleBudget": budget,
        })

    whole_quality = parse_count(catalog_output, "catalog quality")
    kit_quality = parse_count(kit_output, "props quality")
    if whole_quality != {"passing": 2390, "total": 2390}:
        errors.append(f"whole-catalog result differs from 2390/2390: {whole_quality}")
    if kit_quality != {"passing": 45, "total": 45}:
        errors.append(f"props result differs from 45/45: {kit_quality}")
    if len(rows) != 45 or len(records) != 45:
        errors.append(f"expected 45 props assets; found {len(rows)} index rows and {len(records)} source records")
    if len(list(KIT.glob("previews/*.png"))) != 45:
        errors.append(f"expected 45 props previews; found {len(list(KIT.glob('previews/*.png')))}")

    row = rows["sandbags"]
    page = PAGES / "sandbags" / "index.html"
    html = page.read_text(encoding="utf-8") if page.is_file() else ""
    material_names = ["canvasColor", "alternateCanvasColor", "stitchingThreadColor"]
    labels = {param["name"]: param.get("label", param["name"]) for param in row["params"]}
    missing_params = set(material_names).difference(labels)
    missing_page_fields = [value for value in [*(labels[name] for name in material_names if name in labels), *row["presets"]] if value not in html]
    if missing_params:
        errors.append(f"sandbags: missing material parameters {sorted(missing_params)}")
    if missing_page_fields:
        errors.append(f"sandbags local page is missing {missing_page_fields}")
    if not page.is_file() or not (PAGES / "sandbags" / "preview.png").is_file():
        errors.append("sandbags local page or copied preview is missing")

    workspace_pages = sorted(PAGES.parent.glob("*/*/index.html"))
    if len(workspace_pages) != 2390:
        errors.append(f"expected 2,390 generated local pages; found {len(workspace_pages)}")
    if not (PAGES.parent / "index.html").is_file():
        errors.append("local catalog hub is missing")
    if errors:
        raise SystemExit("\n".join(errors))

    page_check = {
        "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-props-pages-20261106",
        "outputRoot": str(PAGES.parent),
        "workspacePages": len(workspace_pages),
        "assetsChecked": 1,
        "hubBuilt": True,
        "deployed": False,
        "pages": [{
            "id": "sandbags",
            "path": str(page),
            "materialLabels": [labels[name] for name in material_names],
            "presets": sorted(row["presets"]),
            "previewCopied": True,
        }],
    }
    (BUNDLE / "local-page-check.json").write_text(json.dumps(page_check, indent=2) + "\n", encoding="utf-8")

    report = {
        "date": "2026-11-06",
        "kit": "props",
        "assetsPromoted": 1,
        "assetIdsAdded": 0,
        "assetIdsRenamed": 0,
        "kitAssetCount": len(rows),
        "materialKnobs": ["canvasColor", "alternateCanvasColor", "stitchingThreadColor"],
        "materialKnobsAdded": 1,
        "materialParamNamesAligned": 2,
        "presetEntriesAdded": 1,
        "presetEntriesUpdated": 2,
        "presetVariantsRendered": 4,
        "previewCount": 45,
        "previewCommand": "npx tsx scripts/renderCatalogPreviews.ts <all 45 props asset ids>",
        "indexCommand": "npx tsx scripts/buildAssetCatalog.ts",
        "kitQuality": {"before": {"passing": 44, "total": 45}, **kit_quality},
        "quality": {
            "before": {"passing": 2389, "total": 2390, "passRate": "99.96%", "thin": 1},
            "after": {
                **whole_quality,
                "passRate": "100.00%",
                "thin": 0,
            },
        },
        "triangleCount": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "sourceSha256": row["sourceSha256"],
        "sourceIndexPreviewRecords": records,
        "localCatalogPages": page_check,
        "checks": checks["commands"],
        "deployed": False,
        "errors": [],
    }
    (BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"verified {len(rows)} sources and previews; sandbags page and source hash; props {kit_quality['passing']}/{kit_quality['total']}; catalog {whole_quality['passing']}/{whole_quality['total']}")


if __name__ == "__main__":
    main()
