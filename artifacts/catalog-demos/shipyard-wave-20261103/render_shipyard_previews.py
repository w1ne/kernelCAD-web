#!/usr/bin/env python3
"""Render the shipyard kit's catalog PNG previews."""
import json
import subprocess
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / "catalog" / "index.json").read_text())
ids = [row["id"] for row in index["assets"] if row["kit"] == "shipyard"]
if len(ids) != 70:
    raise SystemExit(f"expected 70 shipyard index rows, found {len(ids)}")
command = [
    sys.executable, str(BUNDLE / "run_with_occt_cjs_compat.py"), "--output",
    "catalog-preview-render-output.txt", "--", "npx", "tsx",
    "scripts/renderCatalogPreviews.ts", *ids,
]
subprocess.run(command, cwd=ROOT, check=True)
missing = [asset_id for asset_id in ids if not (ROOT / "catalog" / "kits" / "shipyard" / "previews" / f"{asset_id}.png").is_file()]
if missing:
    raise SystemExit(f"missing rendered previews: {missing}")
print(f"rendered {len(ids)} shipyard previews")
