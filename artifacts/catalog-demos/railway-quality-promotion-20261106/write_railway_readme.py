#!/usr/bin/env python3
"""Refresh the railway kit README table from source params and preview renders."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/railway"
README = KIT / "README.md"
BUNDLE = Path(__file__).resolve().parent

INTRO = (
    "Forty low-poly railway assets for locomotives, rolling stock, track and station scenes. "
    "Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. "
    "Each model keeps its editable `scale` control and adds two to four material-named color controls "
    "with `weathered` and `freshService` presets. Parts distinguish painted metal, glazing, rail steel, "
    "rubber, timber, concrete, ballast, enamel and high-visibility finishes. The diesel and electric "
    "locomotives have refined noses and glazed cabs; the steam locomotive has a heritage livery. "
    "All assets remain within their existing triangle budgets. These stylized scene props do not claim "
    "track fit, operational signaling, transport safety or hardware acceptance."
)


def main() -> None:
    render_counts = {}
    for line in (BUNDLE / "catalog-preview-render-output.txt").read_text().splitlines():
        match = re.match(r"railway/([^:]+): (\d+) tris$", line)
        if match:
            render_counts[match.group(1)] = int(match.group(2))
    if len(render_counts) != 40:
        raise ValueError(f"expected 40 rendered asset counts, found {len(render_counts)}")

    lines = README.read_text().splitlines()
    lines[2] = INTRO
    lines[4] = (
        "The [quality-promotion demo bundle](../../../artifacts/catalog-demos/railway-quality-promotion-20261106/README.md) "
        "retains the source promotion, capture settings, before/after previews, local verification evidence and an inspected MP4. "
        "The [original railway wave bundle](../../../artifacts/catalog-demos/railway-wave-20261102/README.md) "
        "retains the initial source and preview workflow."
    )

    output = []
    for line in lines:
        if line.startswith("| --- |"):
            continue
        if line.startswith("| id | asset | description | knobs | presets | triangles |"):
            output.append("| id | asset | description | knobs | presets | triangles |")
            output.append("| --- | --- | --- | --- | --- | ---: |")
            continue
        if line.startswith("| `") and line.endswith("|"):
            asset_id = line.split("|", 2)[1].strip().strip("`")
            source = (KIT / f"{asset_id}.kcad.ts").read_text()
            title_match = re.search(r'title:\s*"([^"]+)"', source)
            description_match = re.search(r'description:\s*"([^"]+)"', source)
            if title_match is None or description_match is None:
                raise ValueError(f"missing title or description for {asset_id}")
            description = description_match.group(1).split(" Editable material controls:", 1)[0]
            labels = []
            for source_line in source.splitlines():
                if "param(" not in source_line:
                    continue
                label_match = re.search(r"label: '([^']+)'", source_line)
                if label_match:
                    label = label_match.group(1)
                    labels.append("scale" if label == "Overall scale" else label.lower())
            if not 3 <= len(labels) <= 5:
                raise ValueError(f"expected scale plus 2-4 materials for {asset_id}, got {labels}")
            output.append(
                f"| `{asset_id}` | {title_match.group(1)} | {description} | "
                f"{' · '.join(labels)} | weathered · freshService | {render_counts[asset_id]} |"
            )
            continue
        output.append(line)

    if sum(line.startswith("| `") for line in output) != 40:
        raise ValueError("README must contain exactly 40 asset rows")
    README.write_text("\n".join(output) + "\n")
    print(f"updated {README} from 40 source descriptions, parameter labels, and rendered triangle counts")


if __name__ == "__main__":
    main()
