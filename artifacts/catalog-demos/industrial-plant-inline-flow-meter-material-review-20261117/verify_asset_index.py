#!/usr/bin/env python3
"""Prove the generated catalog index changed only for the target asset."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
TARGET = "inline-flow-meter"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def row_bytes(rows):
    return "\n".join(json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows).encode()


baseline_manifest = json.loads((BUNDLE / "before/index-manifest.json").read_text())
before = json.loads((BUNDLE / "before/index-row.json").read_text())
current_text = (ROOT / "catalog/index.json").read_bytes()
current = json.loads(current_text)
after_rows = current["assets"]
after_ids = [row["id"] for row in after_rows]
after = next(row for row in after_rows if row["id"] == TARGET)
changed_fields = sorted(key for key in before if before.get(key) != after.get(key))
after_other = [row for row in after_rows if row["id"] != TARGET]
after_ids_sha = sha256("\n".join(after_ids).encode())
after_other_sha = sha256(row_bytes(after_other))
source = ROOT / after["source"]
preview = ROOT / "catalog/kits" / after["kit"] / "previews" / f"{TARGET}.png"
source_hash = sha256(source.read_bytes())
steel_parts = next(zone["parts"] for zone in after["palette"] if zone["name"] == "steel")
paint_parts = next(zone["parts"] for zone in after["palette"] if zone["name"] == "safetyPaint")

checks = {
    "assetCountUnchanged": baseline_manifest["assetCount"] == len(after_rows),
    "assetIdsUnchanged": baseline_manifest["assetIdsSha256"] == after_ids_sha,
    "targetSourceHashCurrent": after["sourceSha256"] == source_hash,
    "targetPreviewPathPresent": after["preview"] == "/assets/industrial-plant-inline-flow-meter.png",
    "targetPreviewFilePresent": preview.is_file(),
    "nonTargetRowsUnchanged": baseline_manifest["nonTargetRowsSha256"] == after_other_sha,
    "onlyTargetRowChanged": baseline_manifest["nonTargetRowsSha256"] == after_other_sha and changed_fields != [],
    "targetFieldsChangedOnlyForPaletteAndSourceHash": changed_fields == ["palette", "sourceSha256"],
    "controlsPresetsAndStatsUnchanged": all(before[key] == after[key] for key in ["params", "presets", "stats", "triangleBudget"]),
    "bothFlangesListedAsSteel": all(name in steel_parts for name in ["flange--1", "flange-1"]),
    "flangesRemovedFromSafetyPaint": all(name not in paint_parts for name in ["flange--1", "flange-1"]),
}
report = {
    "assetCount": len(after_rows),
    "assetIdsSha256BeforeAndAfter": {"before": baseline_manifest["assetIdsSha256"], "after": after_ids_sha},
    "nonTargetRowsSha256BeforeAndAfter": {"before": baseline_manifest["nonTargetRowsSha256"], "after": after_other_sha},
    "changedAssetRows": [TARGET] if changed_fields else [],
    "changedTargetFields": changed_fields,
    "target": {
        "id": f"{after['kit']}/{TARGET}",
        "sourceSha256": {"index": after["sourceSha256"], "source": source_hash},
        "preview": after["preview"],
        "previewSha256": sha256(preview.read_bytes()) if preview.is_file() else None,
        "baselinePreviewSha256": baseline_manifest["previewSha256"],
        "params": [param["name"] for param in after["params"]],
        "presets": list(after["presets"]),
        "triangles": after["stats"]["triangles"],
        "triangleBudget": after["triangleBudget"],
    },
    "checks": checks,
    "allChecksPass": all(checks.values()),
}
(BUNDLE / "index-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
if not report["allChecksPass"]:
    raise SystemExit(json.dumps(checks, indent=2))
print(json.dumps({"assetCount": report["assetCount"], "changedAssetRows": report["changedAssetRows"], "changedTargetFields": changed_fields, "allChecksPass": True}, indent=2))
