from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
checked = 0
mismatches: list[dict[str, str]] = []
for asset in index["assets"]:
    source = ROOT / asset["source"]
    actual = hashlib.sha256(source.read_bytes()).hexdigest()
    checked += 1
    if actual != asset["sourceSha256"]:
        mismatches.append({"asset": f"{asset['kit']}/{asset['id']}", "source": asset["source"]})

target = next(asset for asset in index["assets"] if asset["kit"] == "mining" and asset["id"] == "crusher-discharge-conveyor")
preview = ROOT / "catalog/kits/mining/previews/crusher-discharge-conveyor.png"
report = {
    "catalogAssetsChecked": checked,
    "sourceShaMismatches": mismatches,
    "selectedAsset": {
        "sourceShaMatches": target["sourceSha256"] == hashlib.sha256((ROOT / target["source"]).read_bytes()).hexdigest(),
        "previewPath": target.get("preview"),
        "previewExists": preview.is_file(),
        "triangleCount": target["stats"]["triangles"],
        "triangleBudget": target["triangleBudget"],
    },
    "result": "PASS" if not mismatches and preview.is_file() else "FAIL",
}
(BUNDLE / "verification" / "index-source-hash-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if report["result"] != "PASS":
    raise SystemExit(1)
