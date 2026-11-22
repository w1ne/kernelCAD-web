#!/usr/bin/env python3
"""Refresh Alpine Expedition's public kit README from the generated index."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/alpine-expedition"
INDEX = ROOT / "catalog/index.json"


def main() -> None:
    assets = json.loads(INDEX.read_text())["assets"]
    rows = {row["id"]: row for row in assets if row["kit"] == "alpine-expedition"}
    readme = KIT / "README.md"
    lines = readme.read_text().splitlines()
    rebuilt = []
    for line in lines:
        if not line.startswith("| [") or "](previews/" not in line:
            rebuilt.append(line)
            continue
        asset_id = line.split("](", 1)[0].split("[", 1)[1]
        row = rows[asset_id]
        params = ", ".join(param["name"] for param in row["params"])
        description = row["description"].split(" Knobs:", 1)[0].rstrip(" .") + "."
        rebuilt.append(
            "| [" + asset_id + "](" + asset_id + ".kcad.ts) | " + row["title"] + " | "
            + description + " | " + params + " | " + str(row["stats"]["triangles"])
            + " | [PNG](previews/" + asset_id + ".png) |"
        )
    text = "\n".join(rebuilt) + "\n"
    text = text.replace(
        "asset exposes overall scale and asset color controls and has a generated",
        "asset retains overall scale, adds two to four material-named color controls and the stormWorn / highVisibility presets, and has a generated",
    )
    text = text.replace(
        "See the [alpine expedition wave bundle](../../../artifacts/catalog-demos/alpine-expedition-wave-20261103/README.md)\nfor the MP4 demo, source generator, settings, local audit, preview, page,\npackage, and video inspection evidence. Local checks do not establish\ndeployed behavior or physical acceptance.",
        "See the [alpine expedition wave bundle](../../../artifacts/catalog-demos/alpine-expedition-wave-20261103/README.md)\nfor the original source workflow and the [quality promotion handoff](../../../artifacts/catalog-demos/alpine-expedition-quality-promotion-20261105/README.md)\nfor refreshed materials, presets, silhouettes, previews, local checks and the\ninspected MP4. Local checks do not establish deployed behavior or physical\nacceptance.",
    )
    readme.write_text(text)


if __name__ == "__main__":
    main()
