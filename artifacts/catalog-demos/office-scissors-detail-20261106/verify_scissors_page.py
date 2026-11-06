#!/usr/bin/env python3
"""Check the generated local catalog page, preview and source hash."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
SITE = Path("/tmp/kernelcad-office-scissors-20261106")
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
asset = next(row for row in INDEX["assets"] if row["kit"] == "office" and row["id"] == "scissors")
source_sha = hashlib.sha256((ROOT / asset["source"]).read_bytes()).hexdigest()
page_path = SITE / "catalog/office/scissors/index.html"
preview_path = SITE / "catalog/office/scissors/preview.png"
page = page_path.read_text(encoding="utf-8") if page_path.is_file() else ""

checks = {
    "pageGenerated": page_path.is_file(),
    "previewCopied": preview_path.is_file(),
    "indexSourceHashMatches": source_sha == asset["sourceSha256"],
    "previewIndexed": asset.get("preview") == "/assets/office-scissors.png",
    "materialControlsVisible": all(label in page for label in ("Stainless steel", "Handle polymer", "Pivot brass")),
    "namedPresetsVisible": all(name in page for name in ("professional", "classroom")),
    "triangleBudgetVisible": "316 (budget 360)" in page,
}
result = {
    "kind": "generated local catalog page check; no deployment performed",
    "page": str(page_path),
    "asset": "office/scissors",
    "checks": checks,
    "passed": sum(checks.values()),
    "total": len(checks),
    "pass": all(checks.values()),
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["pass"]:
    raise SystemExit(1)
