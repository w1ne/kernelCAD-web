#!/usr/bin/env python3
"""Record city-street source, preview, index and local-page evidence."""

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/city-street"
INDEX_PATH = ROOT / "catalog/index.json"
PAGES = Path("/tmp/kernelcad-city-street-pages-20261106/catalog/city-street")
TARGETS = {
    "crosswalk-tile": {"params": ["asphalt", "stripePaint", "edgePaint"], "presets": ["fresh", "worn"]},
    "road-tile": {"params": ["asphalt", "edgePaint", "centrePaint", "style"], "presets": ["worn", "yellowCentre"]},
    "sidewalk-tile": {"params": ["kerbConcrete", "pavingStone", "accentBrick", "grid"], "presets": ["brick", "granite"]},
    "playground-slide": {"params": ["galvanizedSteel", "hdpe", "stainlessSteel", "roofPolyethylene", "roofed"], "presets": ["coastal", "park"]},
}


def run(*args):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    return {
        "command": " ".join(args),
        "exitCode": result.returncode,
        "output": (result.stdout + result.stderr).strip(),
    }


def main():
    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    rows = {row["id"]: row for row in index["assets"] if row["kit"] == "city-street"}
    assets = []
    errors = []
    for source_path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = source_path.name.removesuffix(".kcad.ts")
        row = rows.get(asset_id)
        if row is None:
            errors.append(f"{asset_id}: missing index row")
            continue
        source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
        preview_file = KIT / "previews" / f"{asset_id}.png"
        triangle_count = row.get("stats", {}).get("triangles")
        budget = row.get("triangleBudget")
        expected_preview = f"/assets/city-street-{asset_id}.png"
        if source_hash != row.get("sourceSha256"):
            errors.append(f"{asset_id}: source SHA-256 does not match the index")
        if row.get("preview") != expected_preview or not preview_file.is_file():
            errors.append(f"{asset_id}: indexed rendered preview missing or wrong")
        if triangle_count is not None and budget is not None and triangle_count > budget:
            errors.append(f"{asset_id}: {triangle_count} tris exceeds budget {budget}")
        assets.append({
            "id": asset_id,
            "sourceSha256": source_hash,
            "indexSourceSha256": row.get("sourceSha256"),
            "preview": row.get("preview"),
            "previewFile": str(preview_file.relative_to(ROOT)),
            "triangleCount": triangle_count,
            "triangleBudget": budget,
        })

    workspace_pages = sorted(PAGES.parent.glob("*/*/index.html"))
    checked_pages = []
    for asset_id, expected in TARGETS.items():
        row = rows[asset_id]
        page = PAGES / asset_id / "index.html"
        text = page.read_text(encoding="utf-8") if page.is_file() else ""
        labels = {param["name"]: param.get("label", param["name"]) for param in row["params"]}
        preset_names = sorted(row["presets"])
        target_params = set(expected["params"])
        missing_names = target_params.difference(labels)
        if missing_names:
            errors.append(f"{asset_id}: missing expected params {sorted(missing_names)}")
        if sorted(preset_names) != expected["presets"]:
            errors.append(f"{asset_id}: unexpected presets {preset_names}")
        missing_page_fields = [value for value in [*preset_names, *labels.values()] if value not in text]
        if not text or missing_page_fields:
            errors.append(f"{asset_id}: generated local page missing {missing_page_fields}")
        expected_preview = f"/assets/city-street-{asset_id}.png"
        checked_pages.append({
            "id": asset_id,
            "path": str(page),
            "materialLabels": [labels[name] for name in expected["params"] if name in labels and name not in {"style", "grid", "roofed"}],
            "allParameterLabels": list(labels.values()),
            "presets": preset_names,
            "previewPresent": row.get("preview") == expected_preview,
        })

    catalog_quality = run("python3", "scripts/checkCatalogQuality.py")
    kit_quality = run("python3", "scripts/checkCatalogQuality.py", "--kit", "city-street")
    (BUNDLE / "catalog-quality-output.txt").write_text(catalog_quality["output"] + "\n", encoding="utf-8")
    (BUNDLE / "city-street-quality-output.txt").write_text(kit_quality["output"] + "\n", encoding="utf-8")
    whole_match = re.search(r"(\d+)/(\d+) assets pass", catalog_quality["output"])
    kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_quality["output"])
    thin_match = re.search(r"(\d+) thin assets", catalog_quality["output"])
    if whole_match is None or whole_match.groups() != ("2386", "2390"):
        errors.append("whole-catalog quality output differs from 2386/2390")
    if kit_match is None or kit_match.groups() != ("65", "65"):
        errors.append("city-street quality output differs from 65/65")
    if len(rows) != 65:
        errors.append(f"expected 65 city-street assets, found {len(rows)}")
    if len(assets) != 65:
        errors.append(f"expected 65 city-street source records, found {len(assets)}")
    if len(workspace_pages) != 2390:
        errors.append(f"expected 2,390 local catalog pages, found {len(workspace_pages)}")
    if not (PAGES.parent / "index.html").is_file():
        errors.append("local catalog hub is missing")
    if len(checked_pages) != 4:
        errors.append(f"expected four reviewed local pages, found {len(checked_pages)}")
    if errors:
        raise SystemExit("\n".join(errors))

    local_page_check = {
        "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-city-street-pages-20261106",
        "outputRoot": str(PAGES.parent),
        "workspacePages": len(workspace_pages),
        "assetsChecked": len(checked_pages),
        "hubBuilt": (PAGES.parent / "index.html").is_file(),
        "deployed": False,
        "pages": checked_pages,
    }
    (BUNDLE / "local-page-check.json").write_text(json.dumps(local_page_check, indent=2) + "\n", encoding="utf-8")

    integration = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))["commands"]["catalogIntegration"]
    eslint = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))["commands"]["eslint"]
    report = {
        "date": "2026-11-06",
        "kit": "city-street",
        "assetsPromoted": 4,
        "assetIdsAdded": 0,
        "kitAssetCount": len(rows),
        "materialControlCount": 13,
        "presetEntryCount": 8,
        "presetsNetAdded": 0,
        "previewCount": sum((KIT / "previews" / f"{asset_id}.png").is_file() for asset_id in rows),
        "previewCommand": "python3 artifacts/catalog-demos/city-street-quality-20261106/rerender_city_street.py",
        "indexCommand": "npx tsx scripts/buildAssetCatalog.ts",
        "kitQuality": {"before": {"passing": 61, "total": 65}, "passing": int(kit_match.group(1)), "total": int(kit_match.group(2))},
        "quality": {
            "before": {"passing": 2382, "total": 2390, "passRate": "99.7%", "thin": 8},
            "after": {
                "passing": int(whole_match.group(1)),
                "total": int(whole_match.group(2)),
                "passRate": f"{100 * int(whole_match.group(1)) / int(whole_match.group(2)):.1f}%",
                "thin": int(thin_match.group(1)) if thin_match else 0,
            },
        },
        "sourceIndexPreviewRecords": assets,
        "localCatalogPages": local_page_check,
        "checks": {
            "catalogKitQualityExitCode": kit_quality["exitCode"],
            "wholeCatalogQualityExitCode": catalog_quality["exitCode"],
            "eslintExitCode": eslint["exitCode"],
            "catalogIntegration": integration,
            "errors": [],
        },
        "deployed": False,
    }
    (BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"verified {len(rows)} sources and previews; {len(checked_pages)} local pages; catalog {whole_match.group(1)}/{whole_match.group(2)}")


if __name__ == "__main__":
    main()
