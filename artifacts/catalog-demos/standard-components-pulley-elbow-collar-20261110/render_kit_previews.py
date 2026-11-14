#!/usr/bin/env python3
"""Refresh every existing standard-components catalog preview."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_SETTINGS = ROOT / "catalog/kits/standard-components/demo/settings.json"

settings = json.loads(KIT_SETTINGS.read_text(encoding="utf-8"))
asset_ids = settings["previewAssetIDs"]
if len(asset_ids) != 50 or len(set(asset_ids)) != 50:
    raise SystemExit(f"Expected 50 unique standard-components preview IDs, got {len(asset_ids)}")

command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *asset_ids]
(BUNDLE / "preview-render-invocation.json").write_text(
    json.dumps({"command": command, "kit": "standard-components", "assetCount": len(asset_ids)}, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Rendering {len(asset_ids)} standard-components previews")
subprocess.run(command, cwd=ROOT, check=True)
