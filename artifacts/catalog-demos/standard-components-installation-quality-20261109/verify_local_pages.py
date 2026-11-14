#!/usr/bin/env python3
"""Verify generated local asset pages and copied previews for changed assets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
SITE = ROOT / "site-build"
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
ids = ["base-mounting-plate", "blind-flange", "pipe-coupling", "pipe-flange", "rubber-bumper"]
checks: dict[str, dict[str, bool]] = {}

for asset_id in ids:
    asset = next(row for row in index["assets"] if row["kit"] == "standard-components" and row["id"] == asset_id)
    page_dir = SITE / "catalog" / asset["kit"] / asset_id
    page_path = page_dir / "index.html"
    page = page_path.read_text(encoding="utf-8") if page_path.is_file() else ""
    original_preview = ROOT / "catalog/kits/standard-components/previews" / f"{asset_id}.png"
    copied_preview = page_dir / "preview.png"
    source_hash = hashlib.sha256((ROOT / asset["source"]).read_bytes()).hexdigest()
    checks[asset_id] = {
        "sourceShaMatchesIndex": source_hash == asset["sourceSha256"],
        "previewRouteMatches": asset.get("preview") == f"/assets/standard-components-{asset_id}.png",
        "pageExists": bool(page),
        "previewCopied": copied_preview.is_file(),
        "previewCopiedExactly": copied_preview.is_file() and copied_preview.read_bytes() == original_preview.read_bytes(),
        "titleVisible": f"<h1>{asset['title']}</h1>" in page,
        "previewImageVisible": '<img src="preview.png"' in page,
        "studioLinkVisible": "Open in Studio" in page,
        "parameterLabelsVisible": all((param.get("label") or param["name"]) in page for param in asset["params"]),
        "choicesVisible": all(str(choice) in page for param in asset["params"] for choice in param.get("choices", [])),
        "presetsVisible": all(f"<strong>{name}</strong>" in page for name in asset["presets"]),
    }

all_passed = all(all(checks_for_asset.values()) for checks_for_asset in checks.values())
report = {"outputDirectory": str(SITE), "assets": checks, "allPassed": all_passed, "deploymentVerified": False}
(BUNDLE / "local-page-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not all_passed:
    raise SystemExit(1)
