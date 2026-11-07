#!/usr/bin/env python3
"""Refresh mining kit documentation from the rebuilt generated catalog index."""

import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT_README = ROOT / "catalog/kits/mining/README.md"
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
assets = sorted((row for row in INDEX["assets"] if row["kit"] == "mining"), key=lambda row: row["id"])
if len(assets) != 50:
    raise SystemExit(f"expected 50 existing mining assets in generated index, found {len(assets)}")

triangle_counts = [row["stats"]["triangles"] for row in assets]
if any(not row.get("preview") for row in assets):
    raise SystemExit("a mining asset is missing its indexed preview path")
if any(not {"weathered", "highVisibility"}.issubset(row.get("presets", {})) for row in assets):
    raise SystemExit("a mining asset is missing its named palette presets")
if any(not 2 <= sum(param["type"] == "color" for param in row["params"]) <= 4 for row in assets):
    raise SystemExit("a mining asset does not have 2–4 material color controls")

current = KIT_README.read_text()
table_start = current.index("| id | asset | description |")
table_end = current.index("\n## License and scope", table_start)
rows = [
    "| id | asset | description | controls | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for row in assets:
    controls = [param["name"] for param in row["params"]]
    rows.append(
        f"| `{row['id']}` | {row['title']} | {row['description']} | "
        f"{' · '.join(controls)} | {row['stats']['triangles']} |"
    )

paragraphs = current.split("\n\n")
if len(paragraphs) < 3 or not paragraphs[0].startswith("# Mining and mineral-processing kit"):
    raise SystemExit("unexpected mining README structure")
paragraphs[1] = (
    "Fifty original low-poly props cover underground equipment, mine-site handling, and representative "
    "mineral-processing stages. Each source keeps its editable `scale` input and has two to four "
    "material-named color controls for the visible coated steel, structural steel, stainless steel, "
    "and rubber parts. The `weathered` and `highVisibility` presets offer distinct equipment palettes. "
    "Rotating drums, rollers, sheaves and shafts use faceted loft profiles; frames, chutes, conveyors "
    "and vehicles retain their separate named components. The regenerated meshes range from "
    f"{min(triangle_counts)} to {max(triangle_counts)} triangles under their declared 1,800-triangle budgets."
)
paragraphs[2] = (
    "The generated index gives all 50 assets a homepage preview URL. This branch is not deployed, "
    "so the updated public page behavior has not been verified after deployment. The [quality promotion "
    "demo bundle](../../../artifacts/catalog-demos/mining-quality-promotion-20261105/README.md) "
    "retains the source transformation, before and after previews, indexed preset render, verification "
    "evidence, and inspected MP4. The [original mining wave bundle]"
    "(../../../artifacts/catalog-demos/mining-wave-20261103/README.md) retains its initial creation record."
)
current = "\n\n".join(paragraphs)
table_start = current.index("| id | asset | description |")
table_end = current.index("\n## License and scope", table_start)
current = current[:table_start] + "\n".join(rows) + current[table_end:]
KIT_README.write_text(current.rstrip() + "\n")

report = {
    "kit": "mining",
    "documentedAssets": len(assets),
    "allHavePreviewPaths": True,
    "allHaveMaterialControls": True,
    "allHavePresets": True,
    "triangleRange": [min(triangle_counts), max(triangle_counts)],
    "readme": "catalog/kits/mining/README.md",
}
(BUNDLE / "documentation-status.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"updated mining README for {len(assets)} assets; triangle range {min(triangle_counts)}–{max(triangle_counts)}")
