#!/usr/bin/env python3
"""Check source hashes, nature previews, generated pages and quality evidence."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/nature"
INDEX_PATH = ROOT / "catalog/index.json"
PAGES = Path("/tmp/kernelcad-nature-pages-20261106/catalog/nature")
TARGETS = {
    "cairn": {"params": ["stoneColor", "accentColor"], "presets": ["dark", "sandstone"]},
    "pebble-cluster": {"params": ["stoneColor", "accentColor"], "presets": ["beach", "dark", "red"]},
    "dead-tree": {"params": ["bark", "heartwood"], "presets": ["bleached", "charred"]},
}


def parse_count(text, label):
    match = re.search(r"(\d+)/(\d+) assets pass", text)
    if match is None:
        raise SystemExit(f"{label}: could not parse asset pass count")
    return {"passing": int(match.group(1)), "total": int(match.group(2))}


def main():
    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    catalog_output = (BUNDLE / "catalog-quality-output.txt").read_text(encoding="utf-8")
    kit_output = (BUNDLE / "nature-quality-output.txt").read_text(encoding="utf-8")
    rows = {row["id"]: row for row in index["assets"] if row["kit"] == "nature"}
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
        expected_preview = f"/assets/nature-{asset_id}.png"
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

    workspace_pages = sorted(PAGES.parent.glob("*/*/index.html"))
    checked_pages = []
    for asset_id, expected in TARGETS.items():
        row = rows[asset_id]
        page = PAGES / asset_id / "index.html"
        html = page.read_text(encoding="utf-8") if page.is_file() else ""
        labels = {param["name"]: param.get("label", param["name"]) for param in row["params"]}
        params = expected["params"]
        presets = sorted(row["presets"])
        missing_params = set(params).difference(labels)
        missing_page_fields = [value for value in [*labels.values(), *presets] if value not in html]
        if missing_params:
            errors.append(f"{asset_id}: missing parameters {sorted(missing_params)}")
        if missing_page_fields:
            errors.append(f"{asset_id}: local page is missing {missing_page_fields}")
        if not page.is_file() or not (PAGES / asset_id / "preview.png").is_file():
            errors.append(f"{asset_id}: generated local page or preview copy missing")
        checked_pages.append({
            "id": asset_id,
            "path": str(page),
            "materialLabels": [labels[name] for name in params if name in labels],
            "presets": presets,
            "previewCopied": (PAGES / asset_id / "preview.png").is_file(),
        })

    whole_quality = parse_count(catalog_output, "catalog quality")
    kit_quality = parse_count(kit_output, "nature quality")
    thin_match = re.search(r"(\d+) thin assets", catalog_output)
    if whole_quality != {"passing": 2389, "total": 2390}:
        errors.append(f"whole-catalog result differs from 2389/2390: {whole_quality}")
    if kit_quality != {"passing": 66, "total": 66}:
        errors.append(f"nature result differs from 66/66: {kit_quality}")
    if len(rows) != 66 or len(records) != 66:
        errors.append(f"expected 66 nature assets; found {len(rows)} rows and {len(records)} source records")
    if len(workspace_pages) != 2390:
        errors.append(f"expected 2,390 generated local pages; found {len(workspace_pages)}")
    if not (PAGES.parent / "index.html").is_file():
        errors.append("local catalog hub is missing")
    if len(checked_pages) != 3:
        errors.append(f"expected three reviewed local pages; found {len(checked_pages)}")
    if errors:
        raise SystemExit("\n".join(errors))

    page_check = {
        "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-nature-pages-20261106",
        "outputRoot": str(PAGES.parent),
        "workspacePages": len(workspace_pages),
        "assetsChecked": len(checked_pages),
        "hubBuilt": (PAGES.parent / "index.html").is_file(),
        "deployed": False,
        "pages": checked_pages,
    }
    (BUNDLE / "local-page-check.json").write_text(json.dumps(page_check, indent=2) + "\n", encoding="utf-8")

    report = {
        "date": "2026-11-06",
        "kit": "nature",
        "assetsPromoted": 3,
        "assetIdsAdded": 0,
        "assetIdsRenamed": 0,
        "kitAssetCount": len(rows),
        "materialKnobsAdded": 1,
        "materialParamNamesAligned": 4,
        "presetEntriesAdded": 0,
        "presetEntriesUpdated": 2,
        "presetVariantsRendered": 6,
        "previewCount": len(records),
        "previewCommand": "npx tsx scripts/renderCatalogPreviews.ts <all 66 nature asset ids>",
        "indexCommand": "npx tsx scripts/buildAssetCatalog.ts",
        "kitQuality": {"before": {"passing": 63, "total": 66}, **kit_quality},
        "quality": {
            "before": {"passing": 2386, "total": 2390, "passRate": "99.83%", "thin": 4},
            "after": {
                **whole_quality,
                "passRate": f"{100 * whole_quality['passing'] / whole_quality['total']:.2f}%",
                "thin": int(thin_match.group(1)) if thin_match else 0,
            },
        },
        "remainingFailure": "props/sandbags",
        "sourceIndexPreviewRecords": records,
        "localCatalogPages": page_check,
        "checks": checks["commands"],
        "deployed": False,
        "errors": [],
    }
    (BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"verified {len(rows)} sources and previews; {len(checked_pages)} local pages; nature {kit_quality['passing']}/{kit_quality['total']}; catalog {whole_quality['passing']}/{whole_quality['total']}")


if __name__ == "__main__":
    main()
