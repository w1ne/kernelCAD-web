#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Record source/index/preview evidence after the required local checks."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSETS = ["flange-bearing-housing", "jaw-coupling", "pipe-union"]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = {asset["id"]: asset for asset in index["assets"]}
    assets = []
    for asset_id in ASSETS:
        source = ROOT / "catalog/kits/standard-components" / f"{asset_id}.kcad.ts"
        preview = source.parent / "previews" / f"{asset_id}.png"
        row = rows[asset_id]
        actual_hash = sha(source)
        if row["sourceSha256"] != actual_hash:
            raise SystemExit(f"stale index hash for {asset_id}")
        if not preview.is_file() or row.get("preview") != f"/assets/standard-components-{asset_id}.png":
            raise SystemExit(f"missing or stale preview index row for {asset_id}")
        code = source.read_text(encoding="utf-8")
        color_knobs = sorted(set(re.findall(r"\.color\(\s*([A-Za-z_]\w*)", code)))
        if not 2 <= len(color_knobs) <= 4:
            raise SystemExit(f"unexpected material count for {asset_id}: {color_knobs}")
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
            "materials": row["stats"]["materials"],
            "materialControls": color_knobs,
            "presetNames": sorted(row.get("presets", {}).keys()),
        })

    status = json.loads((OUT / "command-status.json").read_text(encoding="utf-8"))
    kit_report = (OUT / "quality-kit-output.txt").read_text(encoding="utf-8")
    global_report = (OUT / "quality-global-output.txt").read_text(encoding="utf-8")
    lint = (OUT / "eslint-output.txt").read_text(encoding="utf-8")
    tests = (OUT / "integration-output.txt").read_text(encoding="utf-8")
    quality_match = re.search(r"\b(\d+/\d+ assets pass[^\n]*)", global_report)
    kit_match = re.search(r"\b(\d+/\d+ assets pass[^\n]*)", kit_report)
    test_summary = re.findall(r"Test Files\s+[^\n]+|Tests\s+[^\n]+", tests)
    if any(status.get(key) != 0 for key in ["qualityKit", "qualityGlobal", "eslint", "catalogIntegration", "indexCheck"]):
        raise SystemExit(f"required check failed: {status}")
    evidence = {
        "checkedAt": status.get("checkedAt"),
        "scope": "Three existing standard-components models refined in place; no new IDs or kits.",
        "assets": assets,
        "quality": {
            "kit": kit_match.group(1) if kit_match else kit_report.strip().splitlines()[-1],
            "global": quality_match.group(1) if quality_match else global_report.strip().splitlines()[-1],
        },
        "eslint": {"command": "npx eslint catalog/kits/standard-components/", "exitCode": status["eslint"], "output": lint.strip()},
        "catalogIntegration": {"command": "npx vitest run tests/integration/catalog/", "exitCode": status["catalogIntegration"], "summary": test_summary, "output": tests.strip()},
        "indexCheck": {"command": "npx tsx scripts/buildAssetCatalog.ts --check", "exitCode": status["indexCheck"], "output": (OUT / "catalog-index-check-output.txt").read_text(encoding="utf-8").strip()},
        "index": {"source": "catalog/index.json", "generated": True, "sourceSha256Matches": True},
        "deployment": "not deployed; feature branch only",
        "limits": "Low-poly visualization assets only; local source and software-render checks do not establish supplier dimensions, manufacturing suitability or physical acceptance.",
    }
    (OUT / "verification.json").write_text(f"{json.dumps(evidence, indent=2)}\n", encoding="utf-8")
    summary = [
        f"Global quality: {evidence['quality']['global']}",
        f"Standard-components: {evidence['quality']['kit']}",
        f"Catalog integration: {'; '.join(test_summary) if test_summary else 'passed (see verification.json)'}",
        "Three edited source hashes match regenerated index rows and rendered preview files.",
    ]
    (OUT / "verification-summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("\n".join(summary))


if __name__ == "__main__":
    main()
