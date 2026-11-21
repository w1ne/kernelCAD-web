#!/usr/bin/env python3
"""Record generated-index freshness for the corrected catalog asset."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
VERIFY = Path(__file__).resolve().parent
ASSET_KEY = ("industrial-plant", "process-water-silo")
source_path = ROOT / "catalog/kits/industrial-plant/process-water-silo.kcad.ts"
preview_path = ROOT / "catalog/kits/industrial-plant/previews/process-water-silo.png"
current_index = json.loads((ROOT / "catalog/index.json").read_text())
baseline_text = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout
baseline_index = json.loads(baseline_text)


def by_key(index: dict) -> dict[tuple[str, str], dict]:
    return {(row["kit"], row["id"]): row for row in index["assets"]}


before = by_key(baseline_index)
after = by_key(current_index)
changed = sorted(
    f"{kit}/{asset_id}"
    for (kit, asset_id) in set(before) | set(after)
    if before.get((kit, asset_id)) != after.get((kit, asset_id))
)
target = after[ASSET_KEY]
actual_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
result = {
    "generatedBy": "npx tsx scripts/buildAssetCatalog.ts",
    "changedRowsComparedWithHead": changed,
    "changedRowCount": len(changed),
    "targetRowSourceSha256": target["sourceSha256"],
    "actualSourceSha256": actual_sha,
    "sourceShaMatches": target["sourceSha256"] == actual_sha,
    "preview": target["preview"],
    "previewExists": preview_path.is_file(),
    "triangleBudget": target["triangleBudget"],
    "triangles": target["stats"]["triangles"],
}
(VERIFY / "index-row-after.json").write_text(json.dumps(target, indent=2) + "\n")
(VERIFY / "index-diff-summary.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["sourceShaMatches"] or not result["previewExists"] or changed != ["industrial-plant/process-water-silo"]:
    raise SystemExit(1)
