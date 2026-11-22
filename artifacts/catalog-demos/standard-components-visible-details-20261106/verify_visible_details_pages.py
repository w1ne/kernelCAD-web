#!/usr/bin/env python3
"""Check the generated local catalog pages and hub for the three updated assets."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSETS = {
    "timing-belt-pulley": {
        "description": "faceted tooth crown",
        "controls": ["Aluminum", "Steel", "Flange hardware"],
    },
    "door-hinge": {
        "description": "alternating barrel knuckles",
        "controls": ["Steel", "Brass", "Fasteners"],
    },
    "din-rail-terminal-block": {
        "description": "exposed copper clamp windows",
        "controls": ["Engineering polymer", "Steel", "Copper contacts"],
    },
}
hub_path = ROOT / "site-build/catalog/index.html"
hub = hub_path.read_text()
checks = {"catalog hub exists": hub_path.is_file()}
for asset_id, expected in ASSETS.items():
    page_path = ROOT / f"site-build/catalog/standard-components/{asset_id}/index.html"
    page = page_path.read_text() if page_path.exists() else ""
    checks[f"{asset_id}: page exists"] = page_path.is_file()
    checks[f"{asset_id}: updated description"] = expected["description"] in page
    checks[f"{asset_id}: preview linked"] = "preview.png" in page
    checks[f"{asset_id}: material controls"] = all(name in page for name in expected["controls"])
    checks[f"{asset_id}: named presets"] = all(name in page for name in ("dark", "brass", "weathered"))
    checks[f"{asset_id}: linked from hub"] = f"standard-components/{asset_id}/" in hub

report = {"scope": "local generated pages only", "checks": checks, "passed": all(checks.values())}
(BUNDLE / "local-page-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit(1)
