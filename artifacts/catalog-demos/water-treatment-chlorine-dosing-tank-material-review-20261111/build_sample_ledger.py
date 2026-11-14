#!/usr/bin/env python3
"""Build a reproducible five-preview ledger from retained source and image snapshots."""

from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
REPO = BUNDLE.parents[2]
BASE_INDEX = json.loads(
    subprocess.run(
        ["git", "show", "HEAD:catalog/index.json"],
        cwd=REPO,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
)
SAMPLES = [
    {
        "id": "ballistic-separator",
        "kit": "recycling-facility",
        "sourceSnapshot": "source/samples/ballistic-separator.kcad.ts",
        "previewSnapshot": "sample-previews/ballistic-separator.png",
        "observation": "Inclined paddle deck, feed and fraction chutes, fines hopper, crank discs and access rail read as a ballistic separator; painted frame, steel deck, dark chutes and yellow guards are coherent.",
        "result": "No material mismatch found.",
    },
    {
        "id": "wind-turbine-blade",
        "kit": "wind-energy",
        "sourceSnapshot": "source/samples/wind-turbine-blade.kcad.ts",
        "previewSnapshot": "sample-previews/wind-turbine-blade.png",
        "observation": "A tapered twisted composite blade stands on its bolted root and steel stand; pale composite, darker leading-edge strip, red warning band and yellow stand are visually separated.",
        "result": "No material mismatch found.",
    },
    {
        "id": "chlorine-dosing-skid",
        "kit": "water-treatment",
        "sourceSnapshot": "source/before/chlorine-dosing-skid.kcad.ts",
        "previewSnapshot": "previews/before/chlorine-dosing-skid.png",
        "observation": "Tank, metering-pump body, controls, stainless tube rack and spill tray are visible. Before: the chemical day tank shared coated-steel color with the pump and cabinet.",
        "result": "Material mismatch corrected: the day tank now has an independent polyethylene color control.",
    },
    {
        "id": "substation-oil-cooling-pump-skid",
        "kit": "grid-substation",
        "sourceSnapshot": "source/samples/substation-oil-cooling-pump-skid.kcad.ts",
        "previewSnapshot": "sample-previews/substation-oil-cooling-pump-skid.png",
        "observation": "A skid base, pump and motor pair, and raised suction/discharge pipe runs are visible; galvanized and stainless steel finishes are plausible.",
        "result": "No material mismatch found.",
    },
    {
        "id": "continuous-miner",
        "kit": "mining",
        "sourceSnapshot": "source/samples/continuous-miner.kcad.ts",
        "previewSnapshot": "sample-previews/continuous-miner.png",
        "observation": "Low crawler body, cutter drum and pick rows, loading pan, conveyor, tail boom and operator canopy read as a continuous miner; machine paint, track steel, wear surfaces and rubber/cable are separated.",
        "result": "No material mismatch found.",
    },
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


ledger = []
for item in SAMPLES:
    base = next(
        row for row in BASE_INDEX["assets"]
        if row["id"] == item["id"] and row["kit"] == item["kit"]
    )
    source_snapshot = BUNDLE / item["sourceSnapshot"]
    preview_snapshot = BUNDLE / item["previewSnapshot"]
    ledger.append(
        {
            **item,
            "sourcePath": base["source"],
            "previewPath": base["preview"],
            "baselineSourceSha256": sha256(source_snapshot),
            "baselinePreviewSha256": sha256(preview_snapshot),
            "baselineTriangleCount": base["stats"]["triangles"],
            "triangleBudget": base["triangleBudget"],
            "baselineEnvelopeM": base["stats"]["sizeM"],
        }
    )

output = {
    "reviewedAt": datetime.now(timezone.utc).isoformat(),
    "samples": ledger,
}
(BUNDLE / "sample-ledger.json").write_text(
    json.dumps(output, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(output, indent=2))
