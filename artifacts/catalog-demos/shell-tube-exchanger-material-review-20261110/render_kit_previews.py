#!/usr/bin/env python3
"""Re-render the industrial-plant kit's catalog previews."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
asset_ids = [asset["id"] for asset in index["assets"] if asset["kit"] == "industrial-plant"]
if len(asset_ids) != 60:
    raise SystemExit(f"expected 60 industrial-plant assets, found {len(asset_ids)}")
command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *asset_ids]
result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
(BUNDLE / "preview-render-output.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
if result.returncode:
    raise SystemExit(result.returncode)
print(f"Rendered {len(asset_ids)} industrial-plant previews.")
