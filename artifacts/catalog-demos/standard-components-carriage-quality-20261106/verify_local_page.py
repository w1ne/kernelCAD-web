#!/usr/bin/env python3
"""Check the generated local page and index for the carriage source update."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PAGE_PATH = ROOT / "site-build/catalog/standard-components/linear-guide-carriage/index.html"
HUB_PATH = ROOT / "site-build/catalog/index.html"
page = PAGE_PATH.read_text()
hub = HUB_PATH.read_text()
checks = {
    "asset page exists": PAGE_PATH.is_file(),
    "updated asset description": "four top fastener wells" in page and "brass grease fitting" in page,
    "preview linked": "preview.png" in page,
    "size selector exposed": "Model size" in page,
    "steel material control": "Steel" in page,
    "polymer material control": "Engineering polymer" in page,
    "brass material control": "Brass" in page,
    "named presets exposed": all(name in page for name in ("dark", "brass", "weathered")),
    "asset appears on kit hub": "standard-components/linear-guide-carriage/" in hub,
}
report = {"page": str(PAGE_PATH.relative_to(ROOT)), "checks": checks, "passed": all(checks.values())}
out = ROOT / "artifacts/catalog-demos/standard-components-carriage-quality-20261106/local-page-check.json"
out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit(1)
