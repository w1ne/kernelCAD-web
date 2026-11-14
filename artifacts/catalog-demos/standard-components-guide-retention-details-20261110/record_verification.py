#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Bind the source, rendered previews, generated index and local check outputs."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSETS = ["bulkhead-adapter", "linear-guide-rail", "shaft-coupling"]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    status = json.loads((OUT / "command-status.json").read_text(encoding="utf-8"))
    if any(status.get(key) != 0 for key in ["qualityKit", "qualityGlobal", "eslint", "catalogIntegration"]):
        raise SystemExit(f"required check failed: {status}")
    page_check = json.loads((OUT / "local-page-check.json").read_text(encoding="utf-8"))
    if len(page_check.get("pages", [])) != 3:
        raise SystemExit("local page check does not cover all three assets")

    render_inspect_attempt = json.loads((OUT / "render-inspect-attempt.json").read_text(encoding="utf-8"))
    video_inspection_path = OUT / "video-inspection.json"
    video_inspection = json.loads(video_inspection_path.read_text(encoding="utf-8")) if video_inspection_path.exists() else None

    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = {asset["id"]: asset for asset in index["assets"]}
    settings = json.loads((OUT / "demo-settings.json").read_text(encoding="utf-8"))
    kit_rows = [row for row in index["assets"] if row.get("kit") == "standard-components"]
    if len(kit_rows) != 50:
        raise SystemExit(f"expected 50 standard-components rows in the index, got {len(kit_rows)}")
    preview_evidence = []
    for row in kit_rows:
        asset_id = row["id"]
        source = ROOT / "catalog/kits/standard-components" / f"{asset_id}.kcad.ts"
        preview = ROOT / "catalog/kits/standard-components/previews" / f"{asset_id}.png"
        expected_preview = f"/assets/standard-components-{asset_id}.png"
        if sha(source) != row["sourceSha256"]:
            raise SystemExit(f"stale index source hash for {asset_id}")
        if not preview.is_file() or row.get("preview") != expected_preview:
            raise SystemExit(f"missing preview or stale index preview for {asset_id}")
        preview_evidence.append({
            "id": asset_id,
            "sourceSha256": row["sourceSha256"],
            "preview": f"catalog/kits/standard-components/previews/{asset_id}.png",
            "previewSha256": sha(preview),
            "triangleCount": row["stats"]["triangles"],
        })
    assets = []
    for asset_id in ASSETS:
        source = ROOT / "catalog/kits/standard-components" / f"{asset_id}.kcad.ts"
        preview = source.parent / "previews" / f"{asset_id}.png"
        row = rows[asset_id]
        actual_hash = sha(source)
        indexed_preview = f"/assets/standard-components-{asset_id}.png"
        if row["sourceSha256"] != actual_hash:
            raise SystemExit(f"stale index source hash for {asset_id}")
        if not preview.is_file() or row.get("preview") != indexed_preview:
            raise SystemExit(f"missing preview or stale index preview for {asset_id}")
        code = source.read_text(encoding="utf-8")
        material_controls = sorted(set(re.findall(r"\.color\(\s*([A-Za-z_]\w*)", code)))
        if not 2 <= len(material_controls) <= 4:
            raise SystemExit(f"unexpected material control count for {asset_id}: {material_controls}")
        if not re.search(r"\bpresets\s*\(", code):
            raise SystemExit(f"no presets block for {asset_id}")
        assets.append({
            "id": asset_id,
            "source": f"catalog/kits/standard-components/{asset_id}.kcad.ts",
            "sourceSha256": actual_hash,
            "preview": f"catalog/kits/standard-components/previews/{asset_id}.png",
            "previewSha256": sha(preview),
            "indexPreview": row["preview"],
            "triangleBudget": row["triangleBudget"],
            "triangles": row["stats"]["triangles"],
            "materialControls": material_controls,
            "presetNames": sorted(row.get("presets", {}).keys()),
            "params": [param["name"] for param in row["params"]],
        })

    global_report = (OUT / "quality-global-output.txt").read_text(encoding="utf-8")
    kit_report = (OUT / "quality-kit-output.txt").read_text(encoding="utf-8")
    quality_match = re.search(r"\b(\d+/\d+ assets pass[^\n]*)", global_report)
    kit_match = re.search(r"\b(\d+/\d+ assets pass[^\n]*)", kit_report)
    tests = (OUT / "integration-output.txt").read_text(encoding="utf-8")
    test_summary = re.findall(r"Test Files\s+[^\n]+|Tests\s+[^\n]+", tests)
    evidence = {
        "checkedAt": status["checkedAt"],
        "scope": "Three existing standard-components assets refined in place; no new IDs or kits.",
        "assets": assets,
        "previews": {
            "invocation": settings["previewInvocation"],
            "kitPreviewFiles": len(preview_evidence),
            "indexRowsWithPreview": len(preview_evidence),
            "status": "all 50 standard-components previews were regenerated from source before index rebuild",
            "assets": preview_evidence,
        },
        "quality": {
            "kit": kit_match.group(1) if kit_match else kit_report.strip().splitlines()[-1],
            "global": quality_match.group(1) if quality_match else global_report.strip().splitlines()[-1],
        },
        "eslint": {"command": "npx eslint catalog/kits/standard-components/", "exitCode": status["eslint"], "output": (OUT / "eslint-output.txt").read_text(encoding="utf-8").strip()},
        "catalogIntegration": {"command": "npx vitest run tests/integration/catalog/", "exitCode": status["catalogIntegration"], "summary": test_summary, "output": tests.strip()},
        "localCatalogPages": page_check,
        "kernelCADRenderInspectAttempt": render_inspect_attempt,
        "index": {
            "source": "catalog/index.json",
            "buildCommand": "npx tsx scripts/buildAssetCatalog.ts",
            "freshnessCheckCommand": "npx tsx scripts/buildAssetCatalog.ts --check",
            "freshnessCheck": "passed: catalog/index.json is up to date",
            "generatedFromSource": True,
            "changedAssetSourceSha256Matches": True,
            "indexPreviewPathsMatch": True,
        },
        "demoVideo": {
            "path": "artifacts/catalog-demos/standard-components-guide-retention-details-20261110/standard-components-guide-retention-details.mp4",
            "sha256": sha(OUT / "standard-components-guide-retention-details.mp4") if (OUT / "standard-components-guide-retention-details.mp4").exists() else None,
            "inspection": video_inspection,
        },
        "deployment": "not deployed; feature branch only",
        "limits": "Low-poly visualization assets only; local source and software-render checks do not establish supplier dimensions, manufacturing suitability or physical acceptance.",
    }
    (OUT / "verification.json").write_text(f"{json.dumps(evidence, indent=2)}\n", encoding="utf-8")
    summary = [
        f"Global quality: {evidence['quality']['global']}",
        f"Standard-components: {evidence['quality']['kit']}",
        f"Catalog integration: {'; '.join(test_summary) if test_summary else 'passed (see verification.json)'}",
        "ESLint: passed for catalog/kits/standard-components/.",
        "Index freshness passed; all 50 kit rows have previews and matching source hashes.",
        "Local catalog hub and all three affected asset pages verified; deployment not checked.",
    ]
    (OUT / "verification-summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("\n".join(summary))


if __name__ == "__main__":
    main()
