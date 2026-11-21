#!/usr/bin/env python3
"""Check that the generated index tracks the reviewed source and preview."""

from hashlib import sha256
import json
from pathlib import Path
import subprocess


REPO = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSET_ID = "tower-base-flange"
INDEX = REPO / "catalog/index.json"


def by_id(document: dict) -> dict[str, dict]:
    return {row["id"]: row for row in document["assets"]}


current = json.loads(INDEX.read_text(encoding="utf-8"))
baseline_text = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"],
    cwd=REPO,
    check=True,
    capture_output=True,
    text=True,
).stdout
baseline = json.loads(baseline_text)
current_rows = by_id(current)
baseline_rows = by_id(baseline)
row = current_rows[ASSET_ID]
source_path = REPO / row["source"]
source_hash = sha256(source_path.read_bytes()).hexdigest()
preview_path = REPO / "catalog/kits/wind-energy/previews/tower-base-flange.png"
changed_ids = sorted(
    asset_id
    for asset_id in set(current_rows) | set(baseline_rows)
    if current_rows.get(asset_id) != baseline_rows.get(asset_id)
)
before = json.loads((BUNDLE / "before/index-row.json").read_text(encoding="utf-8"))
checks = {
    "sourceSha256Matches": row["sourceSha256"] == source_hash,
    "previewPathMatches": row.get("preview") == "/assets/wind-energy-tower-base-flange.png",
    "previewExists": preview_path.is_file(),
    "onlyTargetIndexRowChanged": changed_ids == [ASSET_ID],
    "triangleCountMatchesStudsAndNuts": before["stats"]["triangles"] == 440 and row["stats"]["triangles"] == 792,
    "triangleCountWithinBudget": row["stats"]["triangles"] <= row["triangleBudget"] == 1100,
    "boundsUnchanged": row["stats"]["sizeM"] == before["stats"]["sizeM"] == [0.62, 0.63, 0.62],
    "colorControlsReplaced": [p["name"] for p in before["params"] if p["type"] == "color"]
    == ["structuralSteel", "stainlessSteel"]
    and [p["name"] for p in row["params"] if p["type"] == "color"] == ["structuralSteel", "anchorSteel"],
    "descriptionNamesGalvanizedAnchors": "galvanized anchor studs" in row["description"]
    and "stainless" not in row["description"],
}
result = {
    "asset": ASSET_ID,
    "sourceSha256": row["sourceSha256"],
    "preview": row.get("preview"),
    "changedIndexRows": changed_ids,
    "triangleCount": row["stats"]["triangles"],
    "boundsM": row["stats"]["sizeM"],
    "checks": checks,
    "passed": all(checks.values()),
}
output = BUNDLE / "verification/index-row-check.json"
output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
