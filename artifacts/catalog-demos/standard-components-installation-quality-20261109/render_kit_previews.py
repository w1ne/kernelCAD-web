#!/usr/bin/env python3
"""Regenerate every standard-components catalog preview from the committed IDs."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
settings = json.loads((BUNDLE / "demo-settings.json").read_text())
ids = settings["previewAssetIDs"]
command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids]
with (BUNDLE / "preview-render-output.txt").open("w") as output:
    output.write("$ " + " ".join(command) + "\n")
    output.flush()
    subprocess.run(command, cwd=ROOT, stdout=output, stderr=subprocess.STDOUT, check=True)
print(f"Rendered {len(ids)} standard-components previews; output is in {BUNDLE / 'preview-render-output.txt'}")
