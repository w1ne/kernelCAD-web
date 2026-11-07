#!/usr/bin/env python3
"""Refresh the maintained theatre README from the source promotion audit."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
README = ROOT / "catalog/kits/theatre-production/README.md"
audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
by_id = {item["id"]: item for item in audit["assets"]}
index = json.loads((ROOT / "catalog/index.json").read_text())
index_by_id = {item["id"]: item for item in index["assets"] if item["kit"] == "theatre-production"}
text = README.read_text()
text = re.sub(
    r"(?s)^# Theatre production kit\n\n.*?\n\n\| id \| asset \| description \| knobs \| triangles \|",
    """# Theatre production kit

52 original low-poly theatre production props cover modular staging, scenery, curtains and rigging, lighting and control, audio, backstage, and touring storage. Each existing asset keeps its ID and 1,800-triangle budget, retains editable scale, and now exposes two to four material-named color controls assigned to named parts. The `houseShow` and `touring` presets provide contrasting appearance schemes. Rectilinear decks and panels remain structural; fixtures, carts, consoles, hoists, and pulley parts keep their object-specific multi-part silhouettes. Every current mesh stays within budget; see the per-asset triangle counts below.

The [quality-promotion bundle](../../../artifacts/catalog-demos/theatre-production-quality-promotion-20261105/README.md) records the in-place source changes, before/after previews, preset render, regenerated index, lint, integration, local-page, and inspected-video evidence. The [original wave bundle](../../../artifacts/catalog-demos/theatre-production-wave-20261103/README.md) preserves the kit's initial creation record.

| id | asset | description | knobs | triangles |""",
    text,
    count=1,
)

rows = []
for line in text.splitlines():
    if not line.startswith("| `"):
        rows.append(line)
        continue
    columns = [column.strip() for column in line.strip("|").split("|")]
    if len(columns) != 5:
        raise ValueError(f"unexpected README row: {line}")
    asset_id = columns[0].strip("`")
    item = by_id[asset_id]
    old_suffix = " Stylized scene geometry. Knobs: overall scale and asset color."
    material_names = ", ".join(item["materials"])
    if old_suffix in columns[2]:
        columns[2] = columns[2].replace(old_suffix, f" Materials: {material_names}. Presets: houseShow and touring.")
    elif " Materials: " not in columns[2] or " Presets: " not in columns[2]:
        raise ValueError(f"{asset_id}: unexpected description form")
    if asset_id == "touring-road-case":
        columns[2] = columns[2].replace(
            "Flight case with reinforced corners, recessed pull handles, latches and low roller feet.",
            "Touring flight case with reinforced corners, recessed pull handles, metal latches and four exposed low-profile caster wheels.",
        )
    columns[3] = "scale · " + " · ".join(item["materials"]) + " · houseShow / touring"
    columns[4] = str(index_by_id[asset_id]["stats"]["triangles"])
    rows.append("| " + " | ".join(columns) + " |")

README.write_text("\n".join(rows) + "\n")
print(f"updated {README.relative_to(ROOT)} with {len(by_id)} promoted rows")
