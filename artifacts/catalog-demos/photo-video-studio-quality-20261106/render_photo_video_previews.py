#!/usr/bin/env python3
"""Render only the 40 existing photo/video studio catalog previews."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/photo-video-studio"

ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
if len(ids) != 40:
    raise SystemExit(f"expected 40 photo/video IDs, found {len(ids)}")

command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids]
result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
(BUNDLE / "preview-render-output.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
settings = {
    "invocation": "python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_previews.py",
    "command": command,
    "ids": ids,
    "exitCode": result.returncode,
    "startedAtUtc": datetime.now(timezone.utc).isoformat(),
    "output": "preview-render-output.txt",
}
(BUNDLE / "preview-render-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
print(result.stdout, end="")
if result.stderr:
    print(result.stderr, end="")
if result.returncode:
    raise SystemExit(result.returncode)
