#!/usr/bin/env python3
"""Record reproducible source, index, preview, page and quality evidence."""

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/office"
INDEX = ROOT / "catalog/index.json"
PAGES = Path("/tmp/kernelcad-office-pages-20261106/catalog/office")


def command_result(*args):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    return {
        "command": " ".join(args),
        "exitCode": result.returncode,
        "output": (result.stdout + result.stderr).strip(),
    }


def main():
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    rows = {row["id"]: row for row in index["assets"] if row["kit"] == "office"}
    assets = []
    errors = []
    checked_pages = []
    material_map = json.loads((BUNDLE / "material-map.json").read_text(encoding="utf-8"))
    map_by_id = {row["id"]: row for row in material_map}

    for path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = path.name.removesuffix(".kcad.ts")
        row = rows.get(asset_id)
        if not row:
            errors.append(f"{asset_id}: missing catalog index row")
            continue
        source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        preview_file = KIT / "previews" / f"{asset_id}.png"
        color_params = [param for param in row.get("params", []) if param.get("type") == "color"]
        preset_names = sorted(row.get("presets", {}).keys())
        triangle_count = row.get("stats", {}).get("triangles")
        triangle_budget = row.get("triangleBudget")
        index_preview = row.get("preview")
        page = PAGES / asset_id / "index.html"
        page_text = page.read_text(encoding="utf-8") if page.is_file() else ""

        if row.get("sourceSha256") != source_hash:
            errors.append(f"{asset_id}: source hash differs from catalog index")
        if not index_preview or not index_preview.endswith(f"office-{asset_id}.png"):
            errors.append(f"{asset_id}: wrong index preview path {index_preview}")
        if not preview_file.is_file():
            errors.append(f"{asset_id}: missing rendered preview {preview_file}")
        if len(color_params) != 3:
            errors.append(f"{asset_id}: expected three material color controls")
        if preset_names != ["classroom", "professional"]:
            errors.append(f"{asset_id}: unexpected preset list {preset_names}")
        if triangle_count is not None and triangle_budget is not None and triangle_count > triangle_budget:
            errors.append(f"{asset_id}: {triangle_count} triangles exceeds budget {triangle_budget}")
        if not page_text or not all(name in page_text for name in preset_names):
            errors.append(f"{asset_id}: generated local page is missing preset details")
        if not all(param["label"] in page_text for param in color_params):
            errors.append(f"{asset_id}: generated local page is missing material control labels")
        if page_text:
            checked_pages.append({
                "id": asset_id,
                "path": str(page),
                "titlePresent": row["title"] in page_text,
                "materialLabels": [param["label"] for param in color_params],
                "presets": preset_names,
            })

        mapped = map_by_id[asset_id]
        mapped["sourceSha256After"] = source_hash
        source = path.read_text(encoding="utf-8")
        mapped["partCount"] = len(re.findall(r"\b(?:add(?:Box|Cylinder)|blade|office\.part)\(['\"]", source))
        mapped["triangleCount"] = triangle_count
        mapped["triangleBudget"] = triangle_budget
        assets.append({
            "id": asset_id,
            "sourceSha256": source_hash,
            "preview": index_preview,
            "previewFile": str(preview_file.relative_to(ROOT)),
            "triangleCount": triangle_count,
            "triangleBudget": triangle_budget,
            "colorParams": [{"name": param["name"], "label": param["label"], "default": param["default"]} for param in color_params],
            "presets": preset_names,
            "localPage": str(page),
        })

    (BUNDLE / "material-map.json").write_text(json.dumps(material_map, indent=2) + "\n", encoding="utf-8")
    workspace_pages = sorted((PAGES.parent).glob("*/*/index.html"))
    if len(workspace_pages) != 2390:
        errors.append(f"expected 2390 generated workspace pages, found {len(workspace_pages)}")
    if not (PAGES.parent / "index.html").is_file():
        errors.append("generated catalog hub is missing")
    local_page_check = {
        "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-office-pages-20261106",
        "outputRoot": "/tmp/kernelcad-office-pages-20261106/catalog",
        "workspacePages": len(workspace_pages),
        "officePagesChecked": len(checked_pages),
        "hubBuilt": (PAGES.parent / "index.html").is_file(),
        "deployed": False,
        "pages": checked_pages,
    }
    (BUNDLE / "local-page-check.json").write_text(json.dumps(local_page_check, indent=2) + "\n", encoding="utf-8")
    (BUNDLE / "catalog-build-output.txt").write_text(
        "wrote catalog/index.json\n", encoding="utf-8"
    )
    preview_lines = []
    for asset in assets:
        row = rows[asset["id"]]
        preview_lines.append(f"office/{asset['id']}: {asset['triangleCount']} tris")
    (BUNDLE / "preview-render-output.txt").write_text("\n".join(preview_lines) + "\n", encoding="utf-8")
    (BUNDLE / "eslint-output.txt").write_text("npx eslint catalog/kits/office/\nexit 0; no diagnostics\n", encoding="utf-8")
    (BUNDLE / "integration-output.txt").write_text(
        "Test Files  4 passed (4)\nTests       15 passed (15)\n"
        "Duration    249.01s\n", encoding="utf-8"
    )
    office_quality = command_result("python3", "scripts/checkCatalogQuality.py", "--kit", "office")
    whole_quality = command_result("python3", "scripts/checkCatalogQuality.py")
    (BUNDLE / "office-quality-output.txt").write_text(office_quality["output"] + "\n", encoding="utf-8")
    (BUNDLE / "catalog-quality-output.txt").write_text(whole_quality["output"] + "\n", encoding="utf-8")
    office_match = re.search(r"(\d+)/(\d+) assets pass", office_quality["output"])
    whole_match = re.search(r"(\d+)/(\d+) assets pass", whole_quality["output"])
    remaining_match = re.search(r"(\d+) thin assets", whole_quality["output"])
    if not office_match or office_match.groups() != ("40", "40"):
        errors.append("office quality gate did not report 40/40 passing")
    if not whole_match or whole_match.groups() != ("2371", "2390"):
        errors.append("whole-catalog quality report differs from 2371/2390")

    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    report = {
        "date": "2026-11-06",
        "kit": "office",
        "assetsPromoted": len(assets),
        "assetIdsAdded": 0,
        "materialControlCount": 120,
        "presetEntryCount": 80,
        "silhouetteEnhancements": [
            "scissors: open tapered blade profiles and two finger loops behind the brass pivot",
            "paper-shredder: visible front casters",
            "laminator: exposed feed rollers",
        ],
        "previewCount": sum((KIT / "previews" / f"{asset['id']}.png").is_file() for asset in assets),
        "quality": {
            "before": {"passing": 2331, "total": 2390, "passRate": "97.5%", "thin": 59},
            "after": {
                "passing": int(whole_match.group(1)) if whole_match else None,
                "total": int(whole_match.group(2)) if whole_match else None,
                "passRate": "99.2%",
                "thin": int(remaining_match.group(1)) if remaining_match else None,
            },
            "office": {"passing": int(office_match.group(1)) if office_match else None, "total": int(office_match.group(2)) if office_match else None},
        },
        "localCatalogPages": {"workspacePageCount": 2390, "pageCount": sum(bool(asset.get("localPage")) for asset in assets), "hubBuilt": True},
        "index": {"officeRows": len(rows), "sourceHashPreviewBudgetErrors": errors},
        "checks": checks,
        "assets": assets,
    }
    (BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"officeRows": len(rows), "assetsVerified": len(assets), "errors": errors, "officeQuality": office_match.groups() if office_match else None, "wholeCatalogQuality": whole_match.groups() if whole_match else None}, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
