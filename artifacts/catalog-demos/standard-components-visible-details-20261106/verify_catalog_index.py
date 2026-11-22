#!/usr/bin/env python3
"""Verify source hashes and preview paths for all existing kit assets."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
kit = next(row for row in index["kits"] if row["id"] == "standard-components")
rows = [row for row in index["assets"] if row["kit"] == "standard-components"]
checks = {}
for row in rows:
    source = ROOT / row["source"]
    preview = ROOT / f"catalog/kits/standard-components/previews/{row['id']}.png"
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    checks[f"{row['id']}: source hash"] = digest == row["sourceSha256"]
    checks[f"{row['id']}: preview path"] = row.get("preview") == f"/assets/standard-components-{row['id']}.png"
    checks[f"{row['id']}: preview exists"] = preview.is_file()

result = {
    "kitAssets": len(kit["assets"]),
    "indexedKitAssets": len(rows),
    "indexedAndPresent": sum(1 for row in rows if (ROOT / f"catalog/kits/standard-components/previews/{row['id']}.png").is_file()),
    "checks": checks,
    "passed": len(rows) == 50 and len(kit["assets"]) == 50 and all(checks.values()),
}
(BUNDLE / "preview-index-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
