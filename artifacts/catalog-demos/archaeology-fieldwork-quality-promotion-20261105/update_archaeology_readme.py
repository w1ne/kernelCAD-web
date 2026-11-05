#!/usr/bin/env python3
"""Refresh the archaeology kit README table from the generated catalog index."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/archaeology-fieldwork"
INDEX = ROOT / "catalog/index.json"


def main() -> None:
    assets = json.loads(INDEX.read_text())["assets"]
    rows = {row["id"]: row for row in assets if row["kit"] == "archaeology-fieldwork"}
    readme = KIT / "README.md"
    text = readme.read_text()
    text = text.replace(
        "Low-poly, single-material scene props for excavation layout, surveying, careful soil removal, screening, sample handling, site records, and field photography. Models are original kernelCAD sources at approximate real-world scale; each exposes overall scale and asset color controls.",
        "Original low-poly field visualization assets for excavation layout, surveying, careful soil removal, screening, sample handling, site records, and field photography. Each source retains an overall scale control, exposes two to four material-named color controls, and includes fieldReady and weathered appearance presets.",
    )

    rebuilt = []
    for line in text.splitlines():
        if not line.startswith("| " + chr(96)) or "| [PNG](" not in line:
            rebuilt.append(line)
            continue
        asset_id = line.split(chr(96), 2)[1]
        row = rows[asset_id]
        params = ", ".join(param["name"] for param in row["params"])
        description = row["description"].split(" Material controls:")[0].rstrip(".") + "."
        rebuilt.append(
            "| " + chr(96) + asset_id + chr(96) + " | " + row["title"] + " | " + description + " | "
            + params + " | " + str(row["stats"]["triangles"]) + " | [PNG](previews/"
            + asset_id + ".png) |"
        )
    text = "\n".join(rebuilt) + "\n"
    old = "See the [archaeology fieldwork wave bundle](../../../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md) for the MP4 walkthrough, retained source generator and settings, audit results, catalog pages, preview checks, package boundary review, and video inspection. Local checks do not establish deployed behavior or field acceptance."
    new = (
        "See the [archaeology fieldwork wave bundle](../../../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md) "
        "for the original source workflow, and the [quality promotion handoff](../../../artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/README.md) "
        "for material controls, palette variants, regenerated previews, checks and the inspected MP4. These are visualization props; local checks do not establish deployed behavior or field acceptance."
    )
    if old in text:
        text = text.replace(old, new, 1)
    elif "quality promotion handoff" not in text:
        text += "\n" + new + "\n"
    readme.write_text(text)


if __name__ == "__main__":
    main()
