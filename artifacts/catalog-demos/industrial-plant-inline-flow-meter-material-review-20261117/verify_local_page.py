#!/usr/bin/env python3
"""Check the generated local detail page and the current rendered preview."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/kernelcad-inline-flow-meter-pages")
PAGE = OUT / "catalog/industrial-plant/inline-flow-meter/index.html"
PREVIEW = PAGE.parent / "preview.png"
SOURCE = ROOT / "catalog/kits/industrial-plant/inline-flow-meter.kcad.ts"
CURRENT_PREVIEW = ROOT / "catalog/kits/industrial-plant/previews/inline-flow-meter.png"
html = PAGE.read_text(encoding="utf-8") if PAGE.is_file() else ""
checks = {
    "pageExists": PAGE.is_file(),
    "titlePresent": "Inline flow meter" in html,
    "steelControlPresent": "steel" in html,
    "safetyPaintControlPresent": "safetyPaint" in html,
    "gaugeGlassControlPresent": "gaugeGlass" in html,
    "weatheredPresetPresent": "weathered" in html,
    "highVisibilityPresetPresent": "highVisibility" in html,
    "previewMatchesRenderedSource": PREVIEW.is_file() and hashlib.sha256(PREVIEW.read_bytes()).digest() == hashlib.sha256(CURRENT_PREVIEW.read_bytes()).digest(),
}
report = {
    "mode": "local generated page; not a deployment check",
    "page": str(PAGE),
    "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "previewSha256": hashlib.sha256(CURRENT_PREVIEW.read_bytes()).hexdigest(),
    "checks": checks,
    "allChecksPass": all(checks.values()),
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
if not report["allChecksPass"]:
    raise SystemExit(json.dumps(checks, indent=2))
print("local inline-flow-meter detail page contains its controls, presets and current preview")
