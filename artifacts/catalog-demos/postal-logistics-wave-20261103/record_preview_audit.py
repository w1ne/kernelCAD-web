#!/usr/bin/env python3
"""Prove the full renderer visited and wrote a preview for every index row."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = index["assets"]
render_lines = (BUNDLE / "catalog-preview-render-output.txt").read_text().splitlines()
rendered = set()
for line in render_lines:
    match = re.match(r"^([^/]+)/([^:]+): (\d+) tris$", line.strip())
    if match:
        rendered.add(f"{match.group(1)}/{match.group(2)}")
expected = {f"{asset['kit']}/{asset['id']}" for asset in rows}
missing_renders = sorted(expected - rendered)
extra_renders = sorted(rendered - expected)
missing_previews = []
missing_index_paths = []
for asset in rows:
    preview_path = ROOT / "catalog" / "kits" / asset["kit"] / "previews" / f"{asset['id']}.png"
    if not preview_path.is_file():
        missing_previews.append(f"{asset['kit']}/{asset['id']}")
    if not asset.get("preview"):
        missing_index_paths.append(f"{asset['kit']}/{asset['id']}")

result = {
    "command": "npx tsx scripts/renderCatalogPreviews.ts",
    "catalogAssets": len(rows),
    "rendererEntries": len(rendered),
    "indexRowsWithPreview": len(rows) - len(missing_index_paths),
    "previewFilesPresent": len(rows) - len(missing_previews),
    "missingRenders": missing_renders,
    "extraRenders": extra_renders,
    "missingPreviewFiles": missing_previews,
    "missingIndexPaths": missing_index_paths,
    "passed": not (missing_renders or extra_renders or missing_previews or missing_index_paths),
}
(BUNDLE / "catalog-preview-render-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
