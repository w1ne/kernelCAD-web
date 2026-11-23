#!/usr/bin/env python3
"""Verify retained before snapshots against the published catalog hashes."""

import hashlib
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
PUBLIC_HASHES = {
    "forklift-truck": {
        "source": "2b3513bf26b526d5f017469e6d1cf6013e9f063a60e8b866df502277bc22ebfe",
        "preview": "a9bec1aa7dfd806d7a521537e3cc4d44f56464408defa02e80cf02eec141dd90",
    },
    "belt-conveyor": {
        "source": "346071e15bd2b01041454c8aff453cd65ea9e0e638b8ce2dbfe6ab5c7cc3ef90",
        "preview": "8354c91d9032bbe31e6cc3b42f7da45d3b7668f97d897f83caa5d0a4a6fb9074",
    },
    "air-compressor": {
        "source": "573901ca9935afe44dee9ae23c5ecd736996a6ac3bfb06cc3c77bd9a3bf93b08",
        "preview": "689b18cd368ee8457dd746c3ffa58ad627ef92257e02d445c3ff7695d53e221c",
    },
    "centrifugal-pump": {
        "source": "8bf1d5846b374fd4a2e750bfbbd9d43e60967e88278b5f6576ec28f58414382c",
        "preview": "e17189d23e03daf4c2c4bac7e9749ab5c0af6608cadcfd0e898352f43ac2dbd9",
    },
    "roller-conveyor-line": {
        "source": "df91b1dc1be2b892c78187077ba2d0d1afe2697baf24bc8089b1563d296f8275",
        "preview": "7ea3053af89825d920e70b0be7448cc76dd5b040773b57ee16b88e7c3920a8c6",
    },
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assets = {}
for asset_id, public in PUBLIC_HASHES.items():
    before_source = BUNDLE / "before" / f"{asset_id}.kcad.ts"
    before_preview = BUNDLE / "before" / f"{asset_id}.png"
    source_hash = sha(before_source)
    preview_hash = sha(before_preview)
    if source_hash != public["source"] or preview_hash != public["preview"]:
        raise SystemExit(f"retained before snapshot does not match the published hash for {asset_id}")
    assets[asset_id] = {
        "sourceUrl": f"https://kernelcad.com/assets/industrial-plant-{asset_id}.kcad.ts",
        "previewUrl": f"https://kernelcad.com/assets/industrial-plant-{asset_id}.png",
        "sourceSha256": {"public": public["source"], "localBefore": source_hash},
        "previewSha256": {"public": public["preview"], "localBefore": preview_hash},
        "publicMatchesLocalBefore": True,
    }

after_source = BUNDLE / "after" / "roller-conveyor-line.kcad.ts"
after_preview = BUNDLE / "after" / "roller-conveyor-line.png"
current_source = ROOT / "catalog/kits/industrial-plant/roller-conveyor-line.kcad.ts"
current_preview = ROOT / "catalog/kits/industrial-plant/previews/roller-conveyor-line.png"
if sha(after_source) != sha(current_source) or sha(after_preview) != sha(current_preview):
    raise SystemExit("retained after snapshot does not match the current source and preview")
assets["roller-conveyor-line"]["sourceSha256"]["localAfter"] = sha(after_source)
assets["roller-conveyor-line"]["previewSha256"]["localAfter"] = sha(after_preview)
assets["roller-conveyor-line"]["publicMatchesLocalBefore"] = True
report = {
    "capturedOn": "2026-11-16",
    "method": "curl of the published asset source and PNG; SHA-256 compared with retained pre-edit local snapshots",
    "allPublishedBeforeBytesMatch": True,
    "assets": assets,
}
(BUNDLE / "preview-review" / "hashes.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Verified public source and preview hashes for {len(assets)} assets.")
