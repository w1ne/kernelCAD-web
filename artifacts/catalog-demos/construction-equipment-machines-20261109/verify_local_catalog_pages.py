#!/usr/bin/env python3
"""Verify the four generated local catalog pages and their copied previews."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/kernelcad-construction-equipment-pages-20261109")
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
checks: dict[str, dict[str, bool]] = {}

for asset_id in [
    "walk-behind-power-trowel",
    "vibrating-concrete-screed",
    "rebar-bending-machine",
    "portable-material-hoist",
]:
    asset = next(row for row in index["assets"] if row["kit"] == "construction-equipment" and row["id"] == asset_id)
    source = ROOT / asset["source"]
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    page_dir = OUT / "catalog" / asset["kit"] / asset_id
    page = (page_dir / "index.html").read_text(encoding="utf-8") if (page_dir / "index.html").is_file() else ""
    source_preview = ROOT / "catalog" / "kits" / asset["kit"] / "previews" / f"{asset_id}.png"
    copied_preview = page_dir / "preview.png"
    checks[asset_id] = {
        "sourceShaMatchesIndex": source_hash == asset["sourceSha256"],
        "pageExists": bool(page),
        "previewCopied": copied_preview.is_file(),
        "previewCopiedExactly": copied_preview.is_file() and copied_preview.read_bytes() == source_preview.read_bytes(),
        "titleVisible": f"<h1>{asset['title']}</h1>" in page,
        "previewImageVisible": '<img src="preview.png"' in page,
        "studioLinkVisible": "Open in Studio" in page,
        "knobLabelsVisible": all((param.get("label") or param["name"]) in page for param in asset["params"]),
        "choicesVisible": all(str(choice) in page for param in asset["params"] for choice in param.get("choices", [])),
        "presetsVisible": all(f"<strong>{name}</strong>" in page for name in asset["presets"]),
    }

all_passed = all(all(asset_checks.values()) for asset_checks in checks.values())
report = {"outputDirectory": str(OUT), "assets": checks, "allPassed": all_passed, "deploymentVerified": False}
report_path = Path(__file__).resolve().parent / "local-page-check.json"
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not all_passed:
    raise SystemExit(1)
