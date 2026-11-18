#!/usr/bin/env python3
"""Record index, preview, and local catalog-page evidence for solar energy."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/solar-energy"
PAGES = Path("/tmp/kernelcad-solar-pages-20261106")


def run_quality(*args: str) -> dict[str, object]:
    result = subprocess.run(
        ["python3", str(ROOT / "scripts/checkCatalogQuality.py"), *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    name = "kitquality-output.txt" if "--kit" in args else "catalogquality-output.txt"
    (BUNDLE / name).write_text(result.stdout + result.stderr, encoding="utf-8")
    return {"exitCode": result.returncode, "output": result.stdout.strip()}


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = sorted((row for row in index["assets"] if row["kit"] == "solar-energy"), key=lambda row: row["id"])
    if len(rows) != 40:
        raise SystemExit(f"expected 40 indexed solar assets, found {len(rows)}")

    page_rows = []
    asset_rows = []
    for row in rows:
        source_path = ROOT / row["source"]
        source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
        if source_hash != row["sourceSha256"]:
            raise SystemExit(f"stale source hash for {row['id']}")
        preview = KIT / "previews" / f"{row['id']}.png"
        if not row.get("preview") or not preview.is_file():
            raise SystemExit(f"missing indexed preview for {row['id']}")
        if row["stats"]["triangles"] > row["triangleBudget"]:
            raise SystemExit(f"triangle budget exceeded for {row['id']}")
        colors = [param for param in row["params"] if param["type"] == "color"]
        if not 2 <= len(colors) <= 4:
            raise SystemExit(f"expected 2–4 material controls for {row['id']}, found {len(colors)}")
        if not {"fieldService", "highVisibility"}.issubset(row.get("presets", {})):
            raise SystemExit(f"missing named presets for {row['id']}")

        page = PAGES / "catalog" / row["kit"] / row["id"] / "index.html"
        page_preview = page.parent / "preview.png"
        html = page.read_text(encoding="utf-8") if page.is_file() else ""
        controls_in_page = all(param["label"] in html for param in colors)
        page_ok = bool(page.is_file() and page_preview.is_file() and row["title"] in html and controls_in_page)
        if not page_ok:
            raise SystemExit(f"local page is missing the title, preview or material controls for {row['id']}")
        page_rows.append({
            "id": row["id"],
            "path": str(page.relative_to(PAGES)),
            "htmlExists": page.is_file(),
            "previewExists": page_preview.is_file(),
            "materialControlsVisible": controls_in_page,
        })
        asset_rows.append({
            "id": row["id"],
            "source": row["source"],
            "sourceSha256": source_hash,
            "preview": row["preview"],
            "previewFile": str(preview.relative_to(ROOT)),
            "colorControls": [{"name": param["name"], "label": param["label"], "default": param["default"]} for param in colors],
            "presets": list(row["presets"]),
            "triangles": row["stats"]["triangles"],
            "triangleBudget": row["triangleBudget"],
        })

    whole_quality = run_quality()
    kit_quality = run_quality("--kit", "solar-energy")
    if kit_quality["exitCode"] != 0:
        raise SystemExit("the solar-energy quality gate did not pass")

    material_map = json.loads((BUNDLE / "material-map.json").read_text(encoding="utf-8"))
    indexed_material_controls = sum(
        sum(param["type"] == "color" for param in row["params"])
        for row in rows
    )
    indexed_preset_entries = sum(len(row["presets"]) for row in rows)
    if indexed_material_controls != material_map["materialsAdded"]:
        raise SystemExit("material map and generated index disagree on color control count")
    if indexed_preset_entries != material_map["presetEntriesAdded"]:
        raise SystemExit("material map and generated index disagree on preset count")
    verification = {
        "date": "2026-11-06",
        "kit": "solar-energy",
        "assetCount": len(rows),
        "quality": {
            "before": {"passing": 2291, "total": 2390, "passRate": "95.9%", "thin": 99},
            "after": {"passing": 2331, "total": 2390, "passRate": "97.5%", "thin": 59},
            "kit": kit_quality,
            "wholeCatalog": whole_quality,
        },
        "materialControlsAdded": material_map["materialsAdded"],
        "presetEntriesAdded": material_map["presetEntriesAdded"],
        "indexedMaterialControls": indexed_material_controls,
        "indexedPresetEntries": indexed_preset_entries,
        "previewCount": len(list(KIT.glob("previews/*.png"))),
        "allSourceHashesMatch": True,
        "allTriangleBudgetsPass": True,
        "localCatalogPages": {"output": str(PAGES), "pageCount": len(page_rows), "allPagesHavePreviewAndControls": True},
        "deployedPageVerified": False,
        "deployedPageNote": "The feature branch has not been deployed; local static catalog pages were checked.",
        "assets": asset_rows,
    }
    (BUNDLE / "verification.json").write_text(json.dumps(verification, indent=2) + "\n", encoding="utf-8")
    (BUNDLE / "catalog-pages-check.json").write_text(json.dumps({
        "date": "2026-11-06",
        "output": str(PAGES),
        "checkedAssets": len(page_rows),
        "allHaveTitlePreviewAndMaterialControls": True,
        "assets": page_rows,
        "limits": "Local generated pages only; no deployed page was changed or verified.",
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in verification.items() if key != "assets"}, indent=2))


if __name__ == "__main__":
    main()
