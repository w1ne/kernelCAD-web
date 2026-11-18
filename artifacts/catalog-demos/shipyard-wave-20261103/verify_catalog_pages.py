#!/usr/bin/env python3
"""Build the repository's static catalog pages and verify the shipyard kit."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
OUTPUT = Path("/tmp/kernelcad-shipyard-pages-20261103")
shutil.rmtree(OUTPUT, ignore_errors=True)
command = [
    sys.executable, str(BUNDLE / "run_with_occt_cjs_compat.py"), "--output",
    "catalog-pages-build-output.txt", "--", "npx", "tsx", "scripts/buildCatalogPages.ts", str(OUTPUT),
]
subprocess.run(command, cwd=ROOT, check=True)
index = json.loads((ROOT / "catalog" / "index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == "shipyard"]
hub = OUTPUT / "catalog" / "index.html"
kit_pages = OUTPUT / "catalog" / "shipyard"
pages = list(kit_pages.glob("*/index.html"))
preview_copies = list(kit_pages.glob("*/preview.png"))
sample = (kit_pages / "shipyard-block-transporter" / "index.html").read_text(encoding="utf-8")
hub_text = hub.read_text(encoding="utf-8")
checks = {
    "assetCount": len(assets), "detailPageCount": len(pages), "previewCopyCount": len(preview_copies),
    "hubExists": hub.is_file(), "hubListsKit": "Shipyard" in hub_text,
    "samplePageHasPreview": "preview.png" in sample,
    "samplePageHasScaleParam": "Overall scale" in sample,
    "samplePageHasColorParam": "Asset color" in sample,
    "allPreviewsCopied": len(preview_copies) == len(assets) == 70,
}
checks["passed"] = all(value for key, value in checks.items() if isinstance(value, bool)) and checks["assetCount"] == 70 and checks["detailPageCount"] == 70
target = BUNDLE / "catalog-pages-check.json"
target.write_text(json.dumps(checks, indent=2) + "\n")
print(json.dumps(checks, indent=2))
if not checks["passed"]:
    raise SystemExit(f"static catalog page checks failed; see {target}")
