#!/usr/bin/env python3
"""Copy the five audited branch source/render pairs and record indexed hashes."""
from hashlib import sha256
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ASSETS = [
    ("wind-energy", "blade-root-protector", "Fiberglass sleeve, steel ring/tabs, and the round sleeve profile read as a blade-root cap; colors match the named composite and steel zones."),
    ("wind-energy", "cable-entry-boot", "Dark insulating boot separates the cable entry from the galvanized plate, collar, riser, and cap; recognizable as a sealed cable pass-through."),
    ("wind-energy", "nacelle-transport-frame", "Nacelle sits on the welded transport frame; steel bed, yellow lift points, hardware, and composite shell are separated plausibly."),
    ("wind-energy", "wind-farm-meter-pedestal", "Cabinet, post, footplate, screen, and status light read as a metering pedestal. The status light floats 18 mm below the cabinet and is recorded for a future geometry review; no material mismatch found."),
    ("wind-energy", "wind-farm-pad-mount-transformer", "Tank, pad, and ceramic bushings are recognizable. The five exposed cooling fins are assigned a separate aluminium material despite the steel tank/radiator construction documented by manufacturers."),
]

index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
by_id = {row["id"]: row for row in index["assets"]}
items = []
for kit, asset, observation in ASSETS:
    source = ROOT / "catalog/kits" / kit / f"{asset}.kcad.ts"
    preview = ROOT / "catalog/kits" / kit / "previews" / f"{asset}.png"
    sample = HERE / "sample"
    sample.mkdir(parents=True, exist_ok=True)
    (sample / source.name).write_bytes(source.read_bytes())
    (sample / preview.name).write_bytes(preview.read_bytes())
    row = by_id[asset]
    source_hash = sha256(source.read_bytes()).hexdigest()
    preview_hash = sha256(preview.read_bytes()).hexdigest()
    assert source_hash == row["sourceSha256"], f"stale source hash for {asset}"
    assert row["preview"] == f"/assets/{kit}-{asset}.png", f"unexpected preview path for {asset}"
    items.append({
        "kit": kit,
        "id": asset,
        "title": row["title"],
        "source": f"catalog/kits/{kit}/{asset}.kcad.ts",
        "preview": row["preview"],
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "sizeM": row["stats"]["sizeM"],
        "localSourceSha256": source_hash,
        "indexSourceSha256": row["sourceSha256"],
        "localPreviewSha256": preview_hash,
        "localSourceMatchesIndex": True,
        "observation": observation,
    })

record = {
    "branchHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "assetCount": len(index["assets"]),
    "kitCount": len(index["kits"]),
    "items": items,
}
(HERE / "sample-ledger.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
before = HERE / "before"
before.mkdir(exist_ok=True)
target = "wind-farm-pad-mount-transformer"
for suffix in [".kcad.ts", ".png"]:
    source = ROOT / "catalog/kits/wind-energy" / (target + suffix)
    if suffix == ".png":
        source = ROOT / "catalog/kits/wind-energy/previews" / (target + suffix)
    (before / source.name).write_bytes(source.read_bytes())
print(json.dumps(record, indent=2))
