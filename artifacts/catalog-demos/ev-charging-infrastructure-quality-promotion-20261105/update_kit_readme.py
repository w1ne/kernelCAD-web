#!/usr/bin/env python3
"""Refresh the EV kit README from source controls and the generated index."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/ev-charging-infrastructure"
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
rows = {row["id"]: row for row in INDEX["assets"] if row["kit"] == "ev-charging-infrastructure"}
sources = sorted(KIT.glob("*.kcad.ts"))
if len(sources) != 50 or len(rows) != 50:
    raise SystemExit(f"expected 50 sources and index rows; found {len(sources)} and {len(rows)}")

table_rows: list[str] = []
for path in sources:
    source = path.read_text()
    asset_id = path.name.removesuffix(".kcad.ts")
    title = re.search(r'title:\s*["\']([^"\']+)["\']', source)
    description = re.search(r'description:\s*["\'](.*?)(?: Knobs: [^"\']*)["\']', source)
    params = re.findall(r"param\(\s*['\"]([^'\"]+)['\"]\s*,[^\n]*label:\s*['\"]([^'\"]+)", source)
    if not title or not description:
        raise SystemExit(f"missing title or description in {path.name}")
    material_knobs = [(name, label) for name, label in params if name != "scale"]
    if not 2 <= len(material_knobs) <= 4:
        raise SystemExit(f"invalid material control count in {path.name}: {len(material_knobs)}")
    knobs = " · ".join(["Overall scale", *(label for _, label in material_knobs)])
    triangles = rows[asset_id]["stats"]["triangles"]
    table_rows.append(
        f"| `{asset_id}` | {title.group(1)} | {description.group(1)} | {knobs} | {triangles} |"
    )

triangle_counts = [rows[path.name.removesuffix(".kcad.ts")]["stats"]["triangles"] for path in sources]
readme = """# EV charging infrastructure kit

Fifty original generic scene props cover AC and DC equipment, connector forms, cable routing, site electrical cabinets, parking fixtures, canopies, and fleet charging. Each editable `.kcad.ts` source keeps its overall scale control and now has two to four material-named color controls plus `fleetReady` and `nightService` appearance presets. The refreshed exports range from {minimum} to {maximum} triangles and remain within each source triangle budget.

Every indexed asset has a generated preview path. The [quality promotion handoff](../../../artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/README.md) contains the transformation source, preview and preset invocations, selected before/after evidence, local checks, and an inspected MP4. The [original wave bundle](../../../artifacts/catalog-demos/ev-charging-wave-20261103/README.md) retains initial kit creation evidence. The feature branch is not deployed, so public-page behavior remains unverified.

| id | asset | description | knobs | triangles |
| --- | --- | --- | --- | ---: |
{rows}

## License and scope

Every model is original geometry dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are generic scene props, not vendor product replicas, electrical designs, charging-performance guarantees, installation plans, safety approvals, or physical-acceptance evidence.
""".format(minimum=min(triangle_counts), maximum=max(triangle_counts), rows="\n".join(table_rows))
(KIT / "README.md").write_text(readme)
print(f"updated README for {len(table_rows)} assets; triangle range {min(triangle_counts)}–{max(triangle_counts)}")
