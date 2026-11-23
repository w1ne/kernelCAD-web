#!/usr/bin/env python3
"""Verify a generated index rebuild changed only the intended asset row."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
INDEX = REPO / "catalog" / "index.json"
TARGET = ("industrial-plant", "bridge-crane")

baseline_text = subprocess.run(
    ["git", "show", "9e709bc14:catalog/index.json"],
    cwd=REPO,
    check=True,
    capture_output=True,
    text=True,
).stdout
baseline = json.loads(baseline_text)
generated = json.loads(INDEX.read_text(encoding="utf-8"))
key = lambda row: (row["kit"], row["id"])
before_rows = {key(row): row for row in baseline["assets"]}
after_rows = {key(row): row for row in generated["assets"]}
changed = sorted(
    f"{kit}/{asset}"
    for (kit, asset), row in after_rows.items()
    if before_rows.get((kit, asset)) != row
)
target = after_rows[TARGET]
source = REPO / target["source"]
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
preview = REPO / "catalog" / "kits" / TARGET[0] / "previews" / f"{TARGET[1]}.png"

report = {
    "changedRows": changed,
    "expectedChangedRow": f"{TARGET[0]}/{TARGET[1]}",
    "sourceSha256": target["sourceSha256"],
    "sourceSha256Matches": target["sourceSha256"] == source_hash,
    "preview": target.get("preview"),
    "previewExists": preview.is_file(),
    "triangles": target["stats"]["triangles"],
    "triangleBudget": target["triangleBudget"],
    "paletteZones": {
        zone["name"]: zone["parts"]
        for zone in target["palette"]
        if "hoist-motor" in zone["parts"]
    },
}
if changed != [report["expectedChangedRow"]]:
    raise SystemExit(f"unexpected generated index row changes: {changed}")
if not report["sourceSha256Matches"] or not report["previewExists"]:
    raise SystemExit("generated target row has a stale hash or missing preview")

(ROOT / "verification" / "index-diff-summary.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
